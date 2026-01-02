#!/bin/bash

# AWS EC2 배포 스크립트 (Docker Hub 기반)
# 사용법: ./deploy-hub.sh

set -e  # 에러 발생 시 스크립트 중단

echo "🚀 Mysic (Docker Hub) 배포를 시작합니다..."

# 환경 변수 파일 확인
if [ ! -f .env.production ]; then
    echo "❌ .env.production 파일이 없습니다."
    exit 1
fi

# DOCKER_HUB_USERNAME 확인
if ! grep -q "DOCKER_HUB_USERNAME" .env.production; then
    echo "⚠️  .env.production 파일에 DOCKER_HUB_USERNAME 설정이 없습니다."
    echo "   기본값 'your_username'이 사용될 수 있습니다."
fi

# 환경 변수 로드
export $(cat .env.production | grep -v '^#' | xargs) 2>/dev/null || true

# Docker 설치 확인
if ! command -v docker &> /dev/null; then
    echo "❌ Docker가 설치되어 있지 않습니다."
    exit 1
fi

# 1. 최신 코드 가져오기
echo "📥 Git에서 최신 코드를 가져옵니다..."
git pull origin main || git pull origin master

# 2. 최신 이미지 받아오기 (Pull)
echo "⬇️  Docker Hub에서 최신 이미지를 받아옵니다..."
docker-compose -f infrastructure/aws/docker-compose.hub.yml pull

# 3. 기존 컨테이너 중지
echo "🛑 기존 컨테이너를 중지합니다..."
docker-compose -f infrastructure/aws/docker-compose.hub.yml down || true
docker-compose -f infrastructure/aws/docker-compose.prod.yml down || true # 기존 빌드 방식 컨테이너도 중지

# 4. 서비스 시작
echo "🚀 서비스를 시작합니다..."
docker-compose -f infrastructure/aws/docker-compose.hub.yml up -d

# 5. 실행 상태 확인
echo "⏳ 서비스가 안정화될 때까지 대기합니다..."
sleep 10

echo "🔍 서비스 상태 확인:"
docker-compose -f infrastructure/aws/docker-compose.hub.yml ps

echo ""
echo "📊 로그 확인 (최근 20줄):"
docker-compose -f infrastructure/aws/docker-compose.hub.yml logs --tail=20

echo ""
echo "✅ 배포가 완료되었습니다!"
