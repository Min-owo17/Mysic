"""
데이터베이스 초기화 스크립트
Alembic을 사용하여 데이터베이스 마이그레이션을 실행합니다.
"""
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import init_db

if __name__ == "__main__":
    print("🚀 데이터베이스 초기화를 시작합니다...")
    try:
        init_db()
        print("✅ 데이터베이스 초기화가 완료되었습니다!")
    except Exception as e:
        print(f"❌ 데이터베이스 초기화 중 오류가 발생했습니다: {e}")
        sys.exit(1)

