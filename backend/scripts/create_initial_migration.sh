#!/bin/bash
# 초기 마이그레이션 생성 스크립트

echo "🚀 초기 마이그레이션을 생성합니다..."

# backend 디렉토리로 이동
cd "$(dirname "$0")/.."

# Alembic 초기화 확인
if [ ! -d "alembic" ]; then
    echo "⚠️  Alembic이 초기화되지 않았습니다. 초기화를 진행합니다..."
    alembic init alembic
    echo "✅ Alembic 초기화 완료"
fi

# 초기 마이그레이션 생성
echo "📝 초기 마이그레이션 파일을 생성합니다..."
alembic revision --autogenerate -m "Initial migration - Create all tables"

echo "✅ 초기 마이그레이션 파일이 생성되었습니다!"
echo ""
echo "다음 단계:"
echo "1. 생성된 마이그레이션 파일을 확인하세요: alembic/versions/"
echo "2. 마이그레이션을 실행하세요: alembic upgrade head"

