"""
데이터베이스 연결 및 세션 관리 모듈
SQLAlchemy를 사용한 PostgreSQL 데이터베이스 연결 설정
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# SQLAlchemy 엔진 생성
# pool_pre_ping: 연결이 살아있는지 확인
# pool_recycle: 연결 풀 재사용 시간 (초)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.DEBUG,  # DEBUG 모드에서 SQL 쿼리 로깅
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스: 모든 모델이 상속받을 기본 클래스
Base = declarative_base()


def get_db():
    """
    데이터베이스 세션 의존성 함수
    FastAPI의 Depends에서 사용
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    데이터베이스 초기화 함수
    모든 테이블을 생성합니다.
    """
    # 모든 모델을 import하여 Base.metadata에 등록
    from app.models import *  # noqa
    
    # 테이블 생성
    Base.metadata.create_all(bind=engine)
    print("✅ 데이터베이스 테이블이 생성되었습니다.")


if __name__ == "__main__":
    # 직접 실행 시 데이터베이스 초기화
    init_db()

