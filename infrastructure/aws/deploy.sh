#!/bin/bash

# AWS EC2 배포 스크립트
# 사용법: ./deploy.sh

set -e  # 에러 발생 시 스크립트 중단

echo "🚀 Mysic 배포를 시작합니다..."

# 환경 변수 파일 확인
if [ ! -f .env.production ]; then
    echo "❌ .env.production 파일이 없습니다."
    echo "   infrastructure/aws/env.example을 참고하여 .env.production 파일을 생성해주세요."
    echo "   예: cp infrastructure/aws/env.example .env.production"
    exit 1
fi

# Docker 및 Docker Compose 설치 확인
if ! command -v docker &> /dev/null; then
    echo "❌ Docker가 설치되어 있지 않습니다."
    echo "   다음 명령어로 설치하세요: sudo apt install -y docker.io docker-compose"
    exit 1
fi

# Git에서 최신 코드 가져오기 (선택사항)
read -p "Git에서 최신 코드를 가져오시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📥 Git에서 최신 코드를 가져옵니다..."
    git pull origin main || git pull origin master
fi

# 기존 컨테이너 중지 및 제거
echo "🛑 기존 컨테이너를 중지합니다..."
docker-compose -f infrastructure/aws/docker-compose.prod.yml down || true

# Docker 이미지 빌드
echo "🔨 Docker 이미지를 빌드합니다..."
docker-compose -f infrastructure/aws/docker-compose.prod.yml build --no-cache

# 컨테이너 시작
echo "▶️  컨테이너를 시작합니다..."
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d

# 컨테이너 상태 확인
echo "⏳ 컨테이너가 시작될 때까지 대기합니다..."
sleep 10

# 서비스 상태 확인
echo "📊 서비스 상태를 확인합니다..."
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps

# 로그 확인
echo "📋 최근 로그를 확인합니다..."
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs --tail=50

# EC2 퍼블릭 IP 가져오기
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s ifconfig.me 2>/dev/null || echo "your-ec2-ip")

echo ""
echo "✅ 배포가 완료되었습니다!"
echo ""
echo "🌐 프론트엔드: http://${EC2_IP}"
echo "🔧 백엔드 API: http://${EC2_IP}:8000"
echo "📚 API 문서: http://${EC2_IP}:8000/docs"
echo ""
echo "💡 서비스 상태 확인: docker-compose -f infrastructure/aws/docker-compose.prod.yml ps"
echo "💡 로그 확인: docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f"

