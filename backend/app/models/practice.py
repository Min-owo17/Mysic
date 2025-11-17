"""
연습 기록 관련 모델
- PracticeSession: 연습 세션 정보
- RecordingFile: 녹음 파일 정보
"""
from sqlalchemy import Column, Integer, String, Date, TIMESTAMP, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class PracticeSession(Base):
    """연습 세션 정보 테이블"""
    __tablename__ = "practice_sessions"

    session_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    practice_date = Column(Date, nullable=False, index=True)
    start_time = Column(TIMESTAMP, nullable=True)
    end_time = Column(TIMESTAMP, nullable=True)
    actual_play_time = Column(Integer, default=0)  # 초(seconds) 단위
    status = Column(String(20), default="completed")  # 'in_progress', 'completed'
    instrument = Column(String(100), nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    user = relationship("User", back_populates="practice_sessions")
    recording_files = relationship("RecordingFile", back_populates="session", cascade="all, delete-orphan")

    # 복합 인덱스는 SQLAlchemy에서 별도로 정의 필요 (마이그레이션에서 처리)


class RecordingFile(Base):
    """녹음 파일 정보 테이블"""
    __tablename__ = "recording_files"

    recording_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("practice_sessions.session_id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(500), nullable=True)
    file_size = Column(BigInteger, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    deleted_at = Column(TIMESTAMP, nullable=True)

    # 관계 설정
    session = relationship("PracticeSession", back_populates="recording_files")

