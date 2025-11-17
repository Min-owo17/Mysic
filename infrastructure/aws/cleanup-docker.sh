#!/bin/bash

# Docker 리소스 정리 스크립트
# 사용법: ./cleanup-docker.sh [옵션]
# 옵션:
#   --aggressive: 모든 사용하지 않는 리소스 삭제 (볼륨 포함, 주의!)
#   --safe: 안전한 정리만 수행 (기본값)

set -e

AGGRESSIVE=false

# 옵션 파싱
if [ "$1" = "--aggressive" ]; then
    AGGRESSIVE=true
    echo "⚠️  공격적 정리 모드: 모든 사용하지 않는 리소스가 삭제됩니다 (볼륨 포함)"
    read -p "계속하시겠습니까? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "취소되었습니다."
        exit 0
    fi
fi

echo "🧹 Docker 리소스 정리를 시작합니다..."
echo ""

# 현재 디스크 사용량 확인
echo "📊 정리 전 디스크 사용량:"
df -h / | tail -1
echo ""

echo "📦 정리 전 Docker 리소스 사용량:"
docker system df
echo ""

# 1. 중지된 컨테이너 삭제
echo "🗑️  1단계: 중지된 컨테이너 삭제 중..."
STOPPED_CONTAINERS=$(docker ps -a -q -f status=exited 2>/dev/null | wc -l)
if [ "$STOPPED_CONTAINERS" -gt 0 ]; then
    docker container prune -f
    echo "   ✅ 중지된 컨테이너 $STOPPED_CONTAINERS개 삭제 완료"
else
    echo "   ℹ️  삭제할 중지된 컨테이너가 없습니다"
fi
echo ""

# 2. 사용하지 않는 이미지 삭제
echo "🗑️  2단계: 사용하지 않는 이미지 삭제 중..."
if [ "$AGGRESSIVE" = true ]; then
    # 공격적 모드: 모든 사용하지 않는 이미지 삭제
    docker image prune -a -f
    echo "   ✅ 모든 사용하지 않는 이미지 삭제 완료"
else
    # 안전 모드: 7일 이상 사용하지 않은 이미지만 삭제
    docker image prune -a -f --filter "until=168h"
    echo "   ✅ 7일 이상 사용하지 않은 이미지 삭제 완료"
fi
echo ""

# 3. 빌드 캐시 삭제
echo "🗑️  3단계: 빌드 캐시 삭제 중..."
docker builder prune -f
echo "   ✅ 빌드 캐시 삭제 완료"
echo ""

# 4. 네트워크 정리
echo "🗑️  4단계: 사용하지 않는 네트워크 삭제 중..."
docker network prune -f
echo "   ✅ 사용하지 않는 네트워크 삭제 완료"
echo ""

# 5. 볼륨 정리 (공격적 모드에서만)
if [ "$AGGRESSIVE" = true ]; then
    echo "🗑️  5단계: 사용하지 않는 볼륨 삭제 중..."
    echo "   ⚠️  주의: 이 작업은 데이터 손실을 초래할 수 있습니다!"
    docker volume prune -f
    echo "   ✅ 사용하지 않는 볼륨 삭제 완료"
    echo ""
fi

# 최종 디스크 사용량 확인
echo "📊 정리 후 디스크 사용량:"
df -h / | tail -1
echo ""

echo "📦 정리 후 Docker 리소스 사용량:"
docker system df
echo ""

# 정리된 공간 계산 (대략적)
echo "✅ Docker 리소스 정리가 완료되었습니다!"
echo ""
echo "💡 정기적으로 실행하려면 cron에 추가하세요:"
echo "   crontab -e"
echo "   # 매주 일요일 새벽 2시에 실행"
echo "   0 2 * * 0 /home/ec2-user/Mysic/infrastructure/aws/cleanup-docker.sh"
echo ""

