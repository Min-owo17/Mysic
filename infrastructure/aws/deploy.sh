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

# 환경 변수 파일에서 POSTGRES_USER 로드 (기본값 사용을 위해)
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | grep POSTGRES_USER | xargs) 2>/dev/null || true
fi

# .env 파일 생성 또는 심볼릭 링크 (docker-compose가 자동으로 읽기 위해)
echo "🔗 .env 파일 설정 확인 중..."
if [ ! -f .env ]; then
    echo "   .env 파일이 없습니다. .env.production을 .env로 심볼릭 링크 생성 시도..."
    if ln -sf .env.production .env 2>/dev/null; then
        echo "   ✅ 심볼릭 링크 생성 완료: .env -> .env.production"
    else
        echo "   ⚠️  심볼릭 링크 생성 실패. .env.production을 .env로 복사합니다..."
        cp .env.production .env
        echo "   ✅ .env 파일 복사 완료"
    fi
elif [ -L .env ]; then
    # .env가 심볼릭 링크인 경우 대상 확인
    LINK_TARGET=$(readlink .env)
    if [ "$LINK_TARGET" != ".env.production" ]; then
        echo "   ⚠️  .env가 다른 파일을 가리키고 있습니다: $LINK_TARGET"
        echo "   .env.production을 가리키도록 재생성합니다..."
        rm -f .env
        if ln -sf .env.production .env 2>/dev/null; then
            echo "   ✅ 심볼릭 링크 재생성 완료: .env -> .env.production"
        else
            cp .env.production .env
            echo "   ✅ .env 파일 복사 완료"
        fi
    else
        echo "   ✅ .env 심볼릭 링크가 올바르게 설정되어 있습니다: .env -> .env.production"
    fi
else
    # .env가 일반 파일인 경우
    echo "   ℹ️  .env 파일이 이미 존재합니다."
    echo "   .env.production과 내용이 동일한지 확인 중..."
    if cmp -s .env.production .env 2>/dev/null; then
        echo "   ✅ .env와 .env.production의 내용이 동일합니다."
    else
        echo "   ⚠️  .env와 .env.production의 내용이 다릅니다."
        echo "   .env.production을 .env로 복사하시겠습니까? (y/n)"
        read -p "   " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp .env.production .env
            echo "   ✅ .env 파일이 .env.production으로 업데이트되었습니다."
        else
            echo "   ℹ️  기존 .env 파일을 유지합니다."
        fi
    fi
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

# ============================================
# 컨테이너 시작 (의존성 순서 고려)
# ============================================

# 1단계: PostgreSQL 시작
echo ""
echo "📦 1단계: PostgreSQL 시작"
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d postgres

# PostgreSQL이 healthy 상태가 될 때까지 대기
echo "⏳ PostgreSQL이 준비될 때까지 대기 중..."
POSTGRES_READY=false
MAX_WAIT=60
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if docker exec mysic_postgres_prod pg_isready -U ${POSTGRES_USER:-mysic_user} > /dev/null 2>&1; then
        POSTGRES_READY=true
        break
    fi
    echo "   대기 중... ($((WAIT_COUNT + 1))/${MAX_WAIT}초)"
    sleep 2
    WAIT_COUNT=$((WAIT_COUNT + 2))
done

if [ "$POSTGRES_READY" = false ]; then
    echo "❌ PostgreSQL이 ${MAX_WAIT}초 내에 준비되지 않았습니다."
    echo "   PostgreSQL 로그를 확인하세요:"
    docker-compose -f infrastructure/aws/docker-compose.prod.yml logs postgres
    exit 1
fi

echo "✅ PostgreSQL이 준비되었습니다!"
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps postgres

# 2단계: Backend 시작
echo ""
echo "🔧 2단계: Backend 시작"
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --build backend

# Backend가 정상적으로 시작될 때까지 대기
echo "⏳ Backend가 시작될 때까지 대기 중..."
BACKEND_READY=false
MAX_WAIT_BACKEND=30
WAIT_COUNT_BACKEND=0

while [ $WAIT_COUNT_BACKEND -lt $MAX_WAIT_BACKEND ]; do
    # Backend 컨테이너가 실행 중이고 재시작 중이 아닌지 확인
    BACKEND_STATUS=$(docker inspect --format='{{.State.Status}}' mysic_backend_prod 2>/dev/null || echo "not_found")
    
    if [ "$BACKEND_STATUS" = "running" ]; then
        # Health check: API가 응답하는지 확인 (curl이 있으면 사용, 없으면 컨테이너 상태만 확인)
        if command -v curl &> /dev/null; then
            if curl -s http://localhost:8000/health > /dev/null 2>&1; then
                BACKEND_READY=true
                break
            fi
        else
            # curl이 없으면 컨테이너가 running 상태이고 재시작하지 않으면 준비된 것으로 간주
            # 추가로 로그에서 에러가 없는지 확인
            ERROR_COUNT=$(docker-compose -f infrastructure/aws/docker-compose.prod.yml logs backend 2>&1 | grep -i "error\|exception\|failed" | wc -l)
            if [ "$ERROR_COUNT" -eq 0 ] || [ "$WAIT_COUNT_BACKEND" -gt 10 ]; then
                BACKEND_READY=true
                break
            fi
        fi
    elif [ "$BACKEND_STATUS" = "restarting" ]; then
        echo "   ⚠️  Backend가 재시작 중입니다. 로그를 확인하세요..."
        docker-compose -f infrastructure/aws/docker-compose.prod.yml logs --tail=20 backend
    fi
    
    echo "   대기 중... ($((WAIT_COUNT_BACKEND + 1))/${MAX_WAIT_BACKEND}초)"
    sleep 2
    WAIT_COUNT_BACKEND=$((WAIT_COUNT_BACKEND + 2))
done

# Backend 로그에서 에러 확인
echo ""
echo "🔍 Backend 로그에서 에러 확인 중..."
BACKEND_LOGS=$(docker-compose -f infrastructure/aws/docker-compose.prod.yml logs --tail=100 backend 2>&1)

# ImportError 확인
if echo "$BACKEND_LOGS" | grep -qi "ImportError.*cannot import name.*settings.*from.*app.core.config"; then
    echo "⚠️  ImportError 감지: settings import 문제"
    echo "   config.py와 config/__init__.py 충돌 문제일 수 있습니다."
    echo ""
    echo "   해결 방법:"
    echo "   1. backend/app/core/config.py 파일이 올바르게 설정되어 있는지 확인"
    echo "   2. backend/app/core/config/__init__.py 파일 확인"
    echo "   3. Backend 이미지를 재빌드하시겠습니까? (y/n)"
    read -p "   " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "   🔨 Backend 이미지 재빌드 중..."
        docker-compose -f infrastructure/aws/docker-compose.prod.yml build --no-cache backend
        docker-compose -f infrastructure/aws/docker-compose.prod.yml restart backend
        echo "   ✅ Backend 재빌드 완료. 잠시 대기 후 상태를 확인합니다..."
        sleep 10
        BACKEND_STATUS=$(docker inspect --format='{{.State.Status}}' mysic_backend_prod 2>/dev/null || echo "not_found")
        if [ "$BACKEND_STATUS" != "running" ]; then
            echo "   ⚠️  Backend가 여전히 문제가 있습니다. 로그를 확인하세요:"
            docker-compose -f infrastructure/aws/docker-compose.prod.yml logs --tail=50 backend
        fi
    fi
fi

# CORS_ORIGINS 파싱 에러 확인
if echo "$BACKEND_LOGS" | grep -qi "SettingsError.*error parsing value for field.*CORS_ORIGINS"; then
    echo "⚠️  CORS_ORIGINS 파싱 에러 감지"
    echo "   환경변수에서 CORS_ORIGINS를 리스트로 변환하는 과정에서 문제가 발생했습니다."
    echo ""
    echo "   해결 방법:"
    echo "   1. backend/app/core/config.py에 field_validator가 올바르게 설정되어 있는지 확인"
    echo "   2. .env.production 파일의 CORS_ORIGINS 형식 확인 (쉼표로 구분된 문자열)"
    echo "   3. Backend 이미지를 재빌드하시겠습니까? (y/n)"
    read -p "   " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "   🔨 Backend 이미지 재빌드 중..."
        docker-compose -f infrastructure/aws/docker-compose.prod.yml build --no-cache backend
        docker-compose -f infrastructure/aws/docker-compose.prod.yml restart backend
        echo "   ✅ Backend 재빌드 완료. 잠시 대기 후 상태를 확인합니다..."
        sleep 10
        BACKEND_STATUS=$(docker inspect --format='{{.State.Status}}' mysic_backend_prod 2>/dev/null || echo "not_found")
        if [ "$BACKEND_STATUS" != "running" ]; then
            echo "   ⚠️  Backend가 여전히 문제가 있습니다. 로그를 확인하세요:"
            docker-compose -f infrastructure/aws/docker-compose.prod.yml logs --tail=50 backend
        fi
    fi
fi

# 기타 Python 에러 확인
if echo "$BACKEND_LOGS" | grep -qi "ModuleNotFoundError\|AttributeError.*settings\|NameError.*settings"; then
    echo "⚠️  Python 모듈/설정 관련 에러 감지"
    echo "   Backend 코드에 문제가 있을 수 있습니다."
    echo "   로그 확인:"
    echo "$BACKEND_LOGS" | grep -i "ModuleNotFoundError\|AttributeError\|NameError" | tail -5
    echo ""
fi

if [ "$BACKEND_READY" = false ]; then
    echo "❌ Backend가 ${MAX_WAIT_BACKEND}초 내에 준비되지 않았습니다."
    echo "   Backend 로그를 확인하세요:"
    docker-compose -f infrastructure/aws/docker-compose.prod.yml logs --tail=50 backend
    echo ""
    echo "⚠️  Backend가 재시작 중이거나 위의 에러가 원인일 수 있습니다."
    echo "   로그를 확인하여 문제를 해결하세요."
    exit 1
fi

echo "✅ Backend가 준비되었습니다!"
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps backend

# 3단계: Frontend 시작 전 포트 충돌 확인 및 해결
echo ""
echo "🎨 3단계: Frontend 시작"
echo "🔍 80번 포트 충돌 확인 중..."

# ============================================
# 호스트 Nginx 중지 (프론트엔드 컨테이너가 포트 80을 사용하므로)
# ============================================
echo "🌐 호스트 Nginx 상태 확인 중..."

# Nginx가 설치되어 있고 실행 중인지 확인
if command -v nginx &> /dev/null || systemctl list-unit-files | grep -q nginx.service; then
    if systemctl is-active --quiet nginx 2>/dev/null; then
        echo "   ⚠️  호스트 Nginx가 실행 중입니다."
        echo "   프론트엔드 Docker 컨테이너가 포트 80을 사용하므로 호스트 Nginx를 중지합니다..."
        sudo systemctl stop nginx 2>/dev/null || true
        echo "   ✅ 호스트 Nginx가 중지되었습니다."
    fi
    
    # Nginx 자동 시작 비활성화 (부팅 시 자동 시작 방지)
    if systemctl is-enabled --quiet nginx 2>/dev/null; then
        echo "   호스트 Nginx 자동 시작을 비활성화합니다..."
        sudo systemctl disable nginx 2>/dev/null || true
        echo "   ✅ 호스트 Nginx 자동 시작이 비활성화되었습니다."
    else
        echo "   ℹ️  호스트 Nginx는 이미 비활성화되어 있습니다."
    fi
else
    echo "   ℹ️  호스트 Nginx가 설치되어 있지 않거나 실행 중이 아닙니다."
fi

# 80번 포트를 사용하는 프로세스 확인
PORT_80_IN_USE=false
PORT_80_PROCESS=""

# netstat 또는 ss를 사용하여 80번 포트 확인
if command -v netstat &> /dev/null; then
    PORT_80_PROCESS=$(sudo netstat -tulpn 2>/dev/null | grep ':80 ' | grep LISTEN || true)
elif command -v ss &> /dev/null; then
    PORT_80_PROCESS=$(sudo ss -tulpn 2>/dev/null | grep ':80 ' | grep LISTEN || true)
elif command -v lsof &> /dev/null; then
    PORT_80_PROCESS=$(sudo lsof -i :80 2>/dev/null | grep LISTEN || true)
fi

# Docker 컨테이너가 80번 포트를 사용하는지 확인
DOCKER_PORT_80=$(docker ps --format "{{.Ports}}" | grep ':80->' || true)

if [ -n "$PORT_80_PROCESS" ] || [ -n "$DOCKER_PORT_80" ]; then
    PORT_80_IN_USE=true
    echo "⚠️  80번 포트가 여전히 사용 중입니다."
    
    # apache/httpd 확인 및 중지
    if systemctl is-active --quiet httpd 2>/dev/null || systemctl is-active --quiet apache2 2>/dev/null; then
        echo "   Apache가 실행 중입니다. 중지합니다..."
        if systemctl is-active --quiet httpd 2>/dev/null; then
            sudo systemctl stop httpd
            sudo systemctl disable httpd 2>/dev/null || true
        else
            sudo systemctl stop apache2
            sudo systemctl disable apache2 2>/dev/null || true
        fi
        echo "   ✅ Apache가 중지되었습니다."
        PORT_80_IN_USE=false
    fi
    
    # 다른 프로세스가 80번 포트를 사용하는 경우
    if [ "$PORT_80_IN_USE" = true ] && [ -n "$PORT_80_PROCESS" ]; then
        echo "   ⚠️  다른 프로세스가 80번 포트를 사용 중입니다:"
        echo "   $PORT_80_PROCESS"
        echo ""
        echo "   수동으로 프로세스를 종료하시겠습니까? (y/n)"
        read -p "   " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # PID 추출 및 종료 시도
            if command -v lsof &> /dev/null; then
                PID=$(sudo lsof -ti :80 2>/dev/null | head -1)
                if [ -n "$PID" ]; then
                    echo "   프로세스 $PID를 종료합니다..."
                    sudo kill -9 $PID 2>/dev/null || true
                    sleep 2
                    echo "   ✅ 프로세스가 종료되었습니다."
                fi
            fi
        else
            echo "   ⚠️  80번 포트를 사용하는 프로세스를 수동으로 종료한 후 다시 시도하세요."
            echo "   명령어: sudo lsof -i :80 또는 sudo netstat -tulpn | grep :80"
            exit 1
        fi
    fi
    
    # Docker 컨테이너가 80번 포트를 사용하는 경우
    if [ -n "$DOCKER_PORT_80" ]; then
        echo "   ⚠️  다른 Docker 컨테이너가 80번 포트를 사용 중입니다."
        echo "   기존 Frontend 컨테이너를 확인하고 중지합니다..."
        docker stop mysic_frontend_prod 2>/dev/null || true
        docker rm mysic_frontend_prod 2>/dev/null || true
        sleep 2
        echo "   ✅ 기존 Frontend 컨테이너가 정리되었습니다."
    fi
fi

# 최종적으로 80번 포트가 비어있는지 확인
FINAL_CHECK=false
if command -v netstat &> /dev/null; then
    FINAL_CHECK=$(sudo netstat -tulpn 2>/dev/null | grep ':80 ' | grep LISTEN || echo "")
elif command -v ss &> /dev/null; then
    FINAL_CHECK=$(sudo ss -tulpn 2>/dev/null | grep ':80 ' | grep LISTEN || echo "")
elif command -v lsof &> /dev/null; then
    FINAL_CHECK=$(sudo lsof -i :80 2>/dev/null | grep LISTEN || echo "")
fi

if [ -n "$FINAL_CHECK" ]; then
    echo "❌ 80번 포트가 여전히 사용 중입니다. 수동으로 해결해주세요."
    echo "   사용 중인 프로세스: $FINAL_CHECK"
    exit 1
fi

echo "✅ 80번 포트가 사용 가능합니다."

# Frontend 시작
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --build frontend

# Frontend가 시작될 때까지 대기 및 상태 확인
echo "⏳ Frontend가 시작될 때까지 대기 중..."
FRONTEND_READY=false
MAX_WAIT_FRONTEND=15
WAIT_COUNT_FRONTEND=0

while [ $WAIT_COUNT_FRONTEND -lt $MAX_WAIT_FRONTEND ]; do
    FRONTEND_STATUS=$(docker inspect --format='{{.State.Status}}' mysic_frontend_prod 2>/dev/null || echo "not_found")
    
    if [ "$FRONTEND_STATUS" = "running" ]; then
        FRONTEND_READY=true
        break
    elif [ "$FRONTEND_STATUS" = "restarting" ]; then
        echo "   ⚠️  Frontend가 재시작 중입니다. 로그를 확인하세요..."
        docker-compose -f infrastructure/aws/docker-compose.prod.yml logs --tail=20 frontend
    fi
    
    echo "   대기 중... ($((WAIT_COUNT_FRONTEND + 1))/${MAX_WAIT_FRONTEND}초)"
    sleep 2
    WAIT_COUNT_FRONTEND=$((WAIT_COUNT_FRONTEND + 2))
done

if [ "$FRONTEND_READY" = false ]; then
    echo "⚠️  Frontend가 ${MAX_WAIT_FRONTEND}초 내에 준비되지 않았습니다."
    echo "   Frontend 로그를 확인하세요:"
    docker-compose -f infrastructure/aws/docker-compose.prod.yml logs --tail=50 frontend
    echo ""
    echo "⚠️  Frontend가 재시작 중이거나 포트 충돌이 있을 수 있습니다."
else
    echo "✅ Frontend가 준비되었습니다!"
fi

# 최종 서비스 상태 확인
echo ""
echo "📊 최종 서비스 상태 확인..."
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps

# 로그 확인
echo ""
echo "📋 최근 로그를 확인합니다..."
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs --tail=30

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

