#!/bin/bash

# 컨테이너 진단 스크립트
# 사용법: ./diagnose.sh

echo "🔍 Mysic 컨테이너 진단을 시작합니다..."
echo ""

# 프로젝트 루트 찾기
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT" || exit 1

echo "📁 프로젝트 루트: $PROJECT_ROOT"
echo ""

# 1. 컨테이너 상태 확인
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  컨테이너 상태 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps -a
echo ""

# 2. PostgreSQL 상태 확인
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  PostgreSQL 상태 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
POSTGRES_STATUS=$(docker-compose -f infrastructure/aws/docker-compose.prod.yml ps postgres | grep -c "Up")
if [ "$POSTGRES_STATUS" -gt 0 ]; then
    echo "✅ PostgreSQL 컨테이너가 실행 중입니다."
    
    # Health check
    if docker exec mysic_postgres_prod pg_isready -U mysic_user > /dev/null 2>&1; then
        echo "✅ PostgreSQL이 healthy 상태입니다."
    else
        echo "⚠️  PostgreSQL이 unhealthy 상태일 수 있습니다."
    fi
else
    echo "❌ PostgreSQL 컨테이너가 실행되지 않았습니다."
fi
echo ""

# 3. Backend 상태 확인
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Backend 상태 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BACKEND_STATUS=$(docker-compose -f infrastructure/aws/docker-compose.prod.yml ps backend 2>/dev/null | grep -c "Up")
if [ "$BACKEND_STATUS" -gt 0 ]; then
    echo "✅ Backend 컨테이너가 실행 중입니다."
    
    # 포트 확인
    if netstat -tuln 2>/dev/null | grep -q ":8000" || ss -tuln 2>/dev/null | grep -q ":8000"; then
        echo "✅ 포트 8000이 열려 있습니다."
    else
        echo "⚠️  포트 8000이 열려 있지 않습니다."
    fi
else
    echo "❌ Backend 컨테이너가 실행되지 않았습니다."
    
    # 종료된 컨테이너 확인
    if docker ps -a | grep -q "mysic_backend_prod"; then
        echo "📋 Backend 컨테이너가 존재하지만 중지되었습니다."
        echo "   종료 코드 확인:"
        docker inspect mysic_backend_prod 2>/dev/null | grep -A 5 '"State"' | head -10
    fi
fi
echo ""

# 4. Frontend 상태 확인
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Frontend 상태 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FRONTEND_STATUS=$(docker-compose -f infrastructure/aws/docker-compose.prod.yml ps frontend 2>/dev/null | grep -c "Up")
if [ "$FRONTEND_STATUS" -gt 0 ]; then
    echo "✅ Frontend 컨테이너가 실행 중입니다."
    
    # 포트 확인
    if netstat -tuln 2>/dev/null | grep -q ":80" || ss -tuln 2>/dev/null | grep -q ":80"; then
        echo "✅ 포트 80이 열려 있습니다."
    else
        echo "⚠️  포트 80이 열려 있지 않습니다."
    fi
else
    echo "❌ Frontend 컨테이너가 실행되지 않았습니다."
fi
echo ""

# 5. 최근 로그 확인
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  최근 로그 확인 (마지막 20줄)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$BACKEND_STATUS" -eq 0 ]; then
    echo "📋 Backend 로그:"
    docker-compose -f infrastructure/aws/docker-compose.prod.yml logs --tail=20 backend 2>/dev/null || echo "   로그를 가져올 수 없습니다."
    echo ""
fi

if [ "$FRONTEND_STATUS" -eq 0 ]; then
    echo "📋 Frontend 로그:"
    docker-compose -f infrastructure/aws/docker-compose.prod.yml logs --tail=20 frontend 2>/dev/null || echo "   로그를 가져올 수 없습니다."
    echo ""
fi

# 6. 환경 변수 확인
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  환경 변수 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "$PROJECT_ROOT/.env.production" ]; then
    echo "✅ .env.production 파일이 존재합니다."
    if [ -f "$PROJECT_ROOT/infrastructure/aws/check-env.sh" ]; then
        "$PROJECT_ROOT/infrastructure/aws/check-env.sh"
    fi
else
    echo "❌ .env.production 파일이 없습니다."
    echo "   다음 명령어로 생성하세요:"
    echo "   cp infrastructure/aws/env.example .env.production"
fi
echo ""

# 7. 포트 충돌 확인
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  포트 충돌 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v netstat > /dev/null 2>&1; then
    PORT_8000=$(sudo netstat -tulpn 2>/dev/null | grep ":8000" || echo "")
    PORT_80=$(sudo netstat -tulpn 2>/dev/null | grep ":80" || echo "")
elif command -v ss > /dev/null 2>&1; then
    PORT_8000=$(sudo ss -tulpn 2>/dev/null | grep ":8000" || echo "")
    PORT_80=$(sudo ss -tulpn 2>/dev/null | grep ":80" || echo "")
fi

if [ -n "$PORT_8000" ]; then
    echo "⚠️  포트 8000이 사용 중입니다:"
    echo "$PORT_8000"
else
    echo "✅ 포트 8000이 사용 가능합니다."
fi

if [ -n "$PORT_80" ]; then
    echo "⚠️  포트 80이 사용 중입니다:"
    echo "$PORT_80"
else
    echo "✅ 포트 80이 사용 가능합니다."
fi
echo ""

# 8. 메모리 확인
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8️⃣  시스템 리소스 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v free > /dev/null 2>&1; then
    echo "📊 메모리 사용량:"
    free -h
    echo ""
fi

echo "📊 Docker 컨테이너 리소스 사용량:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | grep mysic || echo "   실행 중인 컨테이너가 없습니다."
echo ""

# 9. 권장 조치사항
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 권장 조치사항"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$BACKEND_STATUS" -eq 0 ] || [ "$FRONTEND_STATUS" -eq 0 ]; then
    echo "1. 전체 재시작 시도:"
    echo "   docker-compose -f infrastructure/aws/docker-compose.prod.yml down"
    echo "   docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --build"
    echo ""
    echo "2. Backend 로그 상세 확인:"
    echo "   docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f backend"
    echo ""
    echo "3. Frontend 로그 상세 확인:"
    echo "   docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f frontend"
    echo ""
fi

if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
    echo "⚠️  .env.production 파일을 먼저 생성하세요!"
fi

echo "✅ 진단이 완료되었습니다."

