#!/bin/bash

# 빠른 시작 스크립트 - EC2에서 처음 한 번만 실행
# 이 스크립트는 초기 설정과 배포를 한 번에 수행합니다.

set -e

echo "🚀 Mysic 프로젝트 빠른 시작을 시작합니다..."
echo ""

# 1. 초기 설정
echo "📦 1단계: EC2 초기 설정"
if [ -f "infrastructure/aws/setup-ec2.sh" ]; then
    chmod +x infrastructure/aws/setup-ec2.sh
    ./infrastructure/aws/setup-ec2.sh
else
    echo "⚠️  setup-ec2.sh 파일을 찾을 수 없습니다. 수동으로 설정해주세요."
fi

echo ""
echo "⚠️  중요: docker 그룹 변경사항을 적용하려면 로그아웃 후 다시 로그인하세요."
echo "   또는 다음 명령어를 실행하세요: newgrp docker"
echo ""
read -p "계속하시겠습니까? (로그아웃 후 재접속했다면 y를 입력하세요) (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "중단되었습니다. 로그아웃 후 다시 로그인한 다음 이 스크립트를 다시 실행하세요."
    exit 0
fi

# 2. 환경 변수 파일 확인 및 생성
echo ""
echo "🔐 2단계: 환경 변수 파일 설정"
if [ ! -f .env.production ]; then
    if [ -f "infrastructure/aws/env.example" ]; then
        cp infrastructure/aws/env.example .env.production
        echo "✅ .env.production 파일을 생성했습니다."
        echo "⚠️  .env.production 파일을 열어서 필요한 값들을 수정해주세요."
        echo "   예: nano .env.production"
        echo ""
        read -p ".env.production 파일을 수정하셨나요? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "환경 변수 파일을 수정한 후 다시 실행해주세요."
            exit 1
        fi
    else
        echo "❌ env.example 파일을 찾을 수 없습니다."
        exit 1
    fi
else
    echo "ℹ️  .env.production 파일이 이미 존재합니다."
fi

# 3. 배포
echo ""
echo "🚀 3단계: 서비스 배포"
if [ -f "infrastructure/aws/deploy.sh" ]; then
    chmod +x infrastructure/aws/deploy.sh
    ./infrastructure/aws/deploy.sh
else
    echo "❌ deploy.sh 파일을 찾을 수 없습니다."
    exit 1
fi

echo ""
echo "🎉 모든 설정이 완료되었습니다!"
echo ""
echo "📚 추가 정보는 infrastructure/aws/README.md를 참고하세요."

