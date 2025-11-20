#!/bin/bash

# 호스트 Nginx 완전 중지 및 비활성화 스크립트
# 사용법: sudo ./fix-nginx.sh

set -e

echo "🔧 호스트 Nginx 완전 중지 및 비활성화 스크립트"
echo ""

# 1. Nginx 프로세스 강제 종료
echo "1️⃣  Nginx 프로세스 종료 중..."
if command -v pgrep &> /dev/null; then
    if pgrep -x nginx > /dev/null 2>&1; then
        echo "   Nginx 프로세스 발견. 종료합니다..."
        sudo pkill -9 nginx 2>/dev/null || true
        sleep 2
        echo "   ✅ Nginx 프로세스 종료 완료"
    else
        echo "   ℹ️  실행 중인 Nginx 프로세스가 없습니다."
    fi
else
    echo "   ⚠️  pgrep 명령어를 사용할 수 없습니다."
fi

# 2. systemctl을 통한 Nginx 중지 및 비활성화
echo ""
echo "2️⃣  Nginx 서비스 중지 및 비활성화 중..."
if command -v systemctl &> /dev/null; then
    if systemctl list-unit-files 2>/dev/null | grep -q nginx.service; then
        # 실행 중이면 중지
        if systemctl is-active --quiet nginx 2>/dev/null; then
            echo "   Nginx 서비스가 실행 중입니다. 중지합니다..."
            sudo systemctl stop nginx 2>/dev/null || true
            sleep 1
            echo "   ✅ Nginx 서비스 중지 완료"
        else
            echo "   ℹ️  Nginx 서비스가 실행 중이 아닙니다."
        fi
        
        # 자동 시작 비활성화
        if systemctl is-enabled --quiet nginx 2>/dev/null; then
            echo "   Nginx 자동 시작을 비활성화합니다..."
            sudo systemctl disable nginx 2>/dev/null || true
            echo "   ✅ Nginx 자동 시작 비활성화 완료"
        else
            echo "   ℹ️  Nginx 자동 시작이 이미 비활성화되어 있습니다."
        fi
    else
        echo "   ℹ️  Nginx 서비스가 설치되어 있지 않습니다."
    fi
else
    echo "   ⚠️  systemctl 명령어를 사용할 수 없습니다."
fi

# 3. Nginx 설정 파일 비활성화
echo ""
echo "3️⃣  Nginx 설정 파일 비활성화 중..."
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "   기본 설정 파일을 비활성화합니다..."
    sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    echo "   ✅ 기본 설정 파일 비활성화 완료"
else
    echo "   ℹ️  기본 설정 파일이 없습니다."
fi

if [ -f /etc/nginx/sites-enabled/mysic ]; then
    echo "   mysic 설정 파일을 비활성화합니다..."
    sudo rm -f /etc/nginx/sites-enabled/mysic 2>/dev/null || true
    echo "   ✅ mysic 설정 파일 비활성화 완료"
else
    echo "   ℹ️  mysic 설정 파일이 없습니다."
fi

# 4. 최종 확인
echo ""
echo "4️⃣  최종 확인 중..."
if command -v pgrep &> /dev/null; then
    if pgrep -x nginx > /dev/null 2>&1; then
        echo "   ⚠️  Nginx 프로세스가 여전히 실행 중입니다."
        echo "   강제 종료를 시도합니다..."
        sudo pkill -9 nginx 2>/dev/null || true
        sleep 2
    else
        echo "   ✅ Nginx 프로세스가 실행 중이 아닙니다."
    fi
fi

# 5. 80번 포트 확인
echo ""
echo "5️⃣  80번 포트 사용 확인 중..."
if command -v netstat &> /dev/null; then
    PORT_80=$(sudo netstat -tulpn 2>/dev/null | grep ':80 ' | grep LISTEN || echo "")
elif command -v ss &> /dev/null; then
    PORT_80=$(sudo ss -tulpn 2>/dev/null | grep ':80 ' | grep LISTEN || echo "")
elif command -v lsof &> /dev/null; then
    PORT_80=$(sudo lsof -i :80 2>/dev/null | grep LISTEN || echo "")
else
    PORT_80=""
fi

if [ -n "$PORT_80" ]; then
    echo "   ⚠️  80번 포트가 사용 중입니다:"
    echo "   $PORT_80"
    echo ""
    echo "   Docker 컨테이너 확인:"
    docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -E "mysic_frontend|80" || echo "      (없음)"
else
    echo "   ✅ 80번 포트가 사용 가능합니다."
fi

echo ""
echo "✅ 호스트 Nginx 중지 및 비활성화 완료!"
echo ""
echo "💡 다음 단계:"
echo "   1. 프론트엔드 컨테이너가 실행 중인지 확인:"
echo "      docker ps | grep mysic_frontend"
echo ""
echo "   2. 프론트엔드 컨테이너가 없다면 배포 스크립트 실행:"
echo "      ./infrastructure/aws/deploy.sh"
echo ""
echo "   3. 프론트엔드 컨테이너 로그 확인:"
echo "      docker-compose -f infrastructure/aws/docker-compose.prod.yml logs frontend"

