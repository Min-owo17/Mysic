#!/bin/bash

# Docker Buildx 업데이트 스크립트
# 기존 Buildx가 설치되어 있는 경우 업데이트하는 스크립트

set -e

echo "🔨 Docker Buildx를 업데이트합니다..."

# 아키텍처 감지
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    BUILDX_ARCH="amd64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    BUILDX_ARCH="arm64"
else
    BUILDX_ARCH="amd64"  # 기본값
fi

# 디렉토리 생성
mkdir -p ~/.docker/cli-plugins

# 최신 Buildx 버전 다운로드 및 설치
# GitHub API를 통해 최신 릴리스 버전 가져오기
BUILDX_VERSION=$(curl -s https://api.github.com/repos/docker/buildx/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' || echo "v0.12.1")
BUILDX_URL="https://github.com/docker/buildx/releases/download/${BUILDX_VERSION}/buildx-${BUILDX_VERSION}.linux-${BUILDX_ARCH}"

echo "📥 Buildx ${BUILDX_VERSION} 다운로드 중..."
curl -SL "$BUILDX_URL" -o ~/.docker/cli-plugins/docker-buildx
chmod +x ~/.docker/cli-plugins/docker-buildx

# Buildx 빌더 생성 및 활성화
if ! docker buildx ls | grep -q "builder"; then
    echo "🔧 Buildx 빌더 생성 중..."
    docker buildx create --use --name builder
    docker buildx inspect --bootstrap
else
    echo "ℹ️  Buildx 빌더가 이미 존재합니다."
fi

# Buildx 버전 확인
BUILDX_VER=$(docker buildx version 2>/dev/null | grep -oP 'v\d+\.\d+\.\d+' | head -1 || echo "unknown")
echo ""
echo "✅ Docker Buildx 업데이트 완료!"
echo "📋 현재 버전: $BUILDX_VER"
echo ""
echo "💡 버전 확인: docker buildx version"

