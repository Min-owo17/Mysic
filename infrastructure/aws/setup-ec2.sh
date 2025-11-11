#!/bin/bash

# AWS EC2 초기 설정 스크립트
# EC2 서버에서 처음 한 번만 실행하는 스크립트
# Amazon Linux, Ubuntu 등 다양한 Linux 배포판 지원

set -e

echo "🔧 AWS EC2 초기 설정을 시작합니다..."

# 배포판 감지
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
else
    echo "❌ OS 정보를 확인할 수 없습니다."
    exit 1
fi

echo "📋 감지된 OS: $OS $OS_VERSION"

# 시스템 업데이트
echo "📦 시스템을 업데이트합니다..."
if [[ "$OS" == "amzn" ]] || [[ "$OS" == "amazon" ]]; then
    # Amazon Linux
    sudo yum update -y
    PKG_MANAGER="yum"
    DOCKER_PKG="docker"
    DOCKER_COMPOSE_PKG="docker-compose"
    GIT_PKG="git"
    NGINX_PKG="nginx"
elif [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
    # Ubuntu/Debian
    sudo apt update && sudo apt upgrade -y
    PKG_MANAGER="apt"
    DOCKER_PKG="docker.io"
    DOCKER_COMPOSE_PKG="docker-compose"
    GIT_PKG="git"
    NGINX_PKG="nginx"
else
    echo "⚠️  지원되지 않는 OS입니다. 수동으로 패키지를 설치해주세요."
    exit 1
fi

# Docker 설치
echo "🐳 Docker를 설치합니다..."
if ! command -v docker &> /dev/null; then
    if [[ "$PKG_MANAGER" == "yum" ]]; then
        # Amazon Linux
        sudo yum install -y $DOCKER_PKG
        sudo systemctl start docker
        sudo systemctl enable docker
    elif [[ "$PKG_MANAGER" == "apt" ]]; then
        # Ubuntu/Debian
        sudo apt install -y $DOCKER_PKG
        sudo systemctl start docker
        sudo systemctl enable docker
    fi
    echo "✅ Docker 설치 완료"
else
    echo "ℹ️  Docker가 이미 설치되어 있습니다."
fi

# Docker Compose 설치
echo "🐙 Docker Compose를 설치합니다..."
if ! command -v docker-compose &> /dev/null; then
    if [[ "$PKG_MANAGER" == "yum" ]]; then
        # Amazon Linux - Docker Compose는 별도 설치 필요
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    elif [[ "$PKG_MANAGER" == "apt" ]]; then
        # Ubuntu/Debian
        sudo apt install -y $DOCKER_COMPOSE_PKG
    fi
    echo "✅ Docker Compose 설치 완료"
else
    echo "ℹ️  Docker Compose가 이미 설치되어 있습니다."
fi

# 현재 사용자를 docker 그룹에 추가
echo "👤 현재 사용자를 docker 그룹에 추가합니다..."
sudo usermod -aG docker $USER

# Git 설치
echo "📥 Git을 설치합니다..."
if ! command -v git &> /dev/null; then
    if [[ "$PKG_MANAGER" == "yum" ]]; then
        sudo yum install -y $GIT_PKG
    elif [[ "$PKG_MANAGER" == "apt" ]]; then
        sudo apt install -y $GIT_PKG
    fi
    echo "✅ Git 설치 완료"
else
    echo "ℹ️  Git이 이미 설치되어 있습니다."
fi

# Nginx 설치 (리버스 프록시용, 선택사항)
echo "🌐 Nginx를 설치합니다..."
if ! command -v nginx &> /dev/null; then
    if [[ "$PKG_MANAGER" == "yum" ]]; then
        sudo amazon-linux-extras install -y nginx1 || sudo yum install -y $NGINX_PKG
        sudo systemctl start nginx
        sudo systemctl enable nginx
    elif [[ "$PKG_MANAGER" == "apt" ]]; then
        sudo apt install -y $NGINX_PKG
        sudo systemctl start nginx
        sudo systemctl enable nginx
    fi
    echo "✅ Nginx 설치 완료"
else
    echo "ℹ️  Nginx가 이미 설치되어 있습니다."
fi

# 방화벽 설정
echo "🔥 방화벽을 설정합니다..."
if command -v ufw &> /dev/null; then
    # Ubuntu/Debian - UFW 사용
    sudo ufw allow 22/tcp   # SSH
    sudo ufw allow 80/tcp   # HTTP
    sudo ufw allow 443/tcp  # HTTPS
    sudo ufw allow 8000/tcp # API
    sudo ufw --force enable
    echo "✅ 방화벽 설정 완료 (UFW)"
elif command -v firewall-cmd &> /dev/null; then
    # Amazon Linux 2023 - firewalld 사용
    sudo firewall-cmd --permanent --add-service=ssh
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --permanent --add-port=8000/tcp
    sudo firewall-cmd --reload
    echo "✅ 방화벽 설정 완료 (firewalld)"
else
    echo "⚠️  방화벽 도구가 설치되어 있지 않습니다. AWS 보안 그룹에서 포트를 열어주세요."
    echo "   필요한 포트: 22 (SSH), 80 (HTTP), 443 (HTTPS), 8000 (API)"
fi

echo ""
echo "✅ EC2 초기 설정이 완료되었습니다!"
echo ""
echo "⚠️  중요: docker 그룹 변경사항을 적용하려면 로그아웃 후 다시 로그인하세요."
echo "   또는 다음 명령어를 실행하세요: newgrp docker"
echo ""
echo "📝 다음 단계:"
echo "   1. 로그아웃 후 다시 로그인"
echo "   2. 프로젝트 클론: git clone <your-repo-url>"
echo "   3. .env.production 파일 생성"
echo "   4. ./infrastructure/aws/deploy.sh 실행"

