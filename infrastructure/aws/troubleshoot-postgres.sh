#!/bin/bash

# PostgreSQL 컨테이너 문제 해결 스크립트

echo "🔍 PostgreSQL 컨테이너 문제 진단을 시작합니다..."
echo ""

# 1. 컨테이너 상태 확인
echo "1️⃣ 컨테이너 상태 확인:"
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps postgres
echo ""

# 2. PostgreSQL 로그 확인
echo "2️⃣ PostgreSQL 로그 (최근 50줄):"
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs --tail=50 postgres
echo ""

# 3. 환경 변수 확인
echo "3️⃣ 환경 변수 확인:"
if [ -f .env.production ]; then
    echo "✅ .env.production 파일 존재"
    echo "POSTGRES_USER: $(grep POSTGRES_USER .env.production | cut -d '=' -f2)"
    echo "POSTGRES_DB: $(grep POSTGRES_DB .env.production | cut -d '=' -f2)"
else
    echo "❌ .env.production 파일이 없습니다!"
fi
echo ""

# 4. 볼륨 확인
echo "4️⃣ Docker 볼륨 확인:"
docker volume ls | grep postgres
echo ""

# 5. Health check 수동 실행
echo "5️⃣ Health check 수동 실행:"
if docker ps | grep -q mysic_postgres_prod; then
    POSTGRES_USER=$(grep POSTGRES_USER .env.production 2>/dev/null | cut -d '=' -f2 || echo "mysic_user")
    docker exec mysic_postgres_prod pg_isready -U "$POSTGRES_USER" || echo "❌ Health check 실패"
else
    echo "⚠️  PostgreSQL 컨테이너가 실행 중이 아닙니다."
fi
echo ""

# 6. 해결 방법 제시
echo "💡 해결 방법:"
echo "   1. 컨테이너 재시작:"
echo "      docker-compose -f infrastructure/aws/docker-compose.prod.yml restart postgres"
echo ""
echo "   2. 볼륨 삭제 후 재생성 (데이터 손실 주의!):"
echo "      docker-compose -f infrastructure/aws/docker-compose.prod.yml down -v"
echo "      docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d postgres"
echo ""
echo "   3. 환경 변수 확인:"
echo "      cat .env.production | grep POSTGRES"
echo ""

