"""
칭호 관련 모델
- Achievement: 칭호 정보
- UserAchievement: 사용자가 획득한 칭호
"""
from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Achievement(Base):
    """칭호 정보 테이블"""
    __tablename__ = "achievements"

    achievement_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(String, nullable=True)
    condition_type = Column(String(50), nullable=True)  # 'practice_time', 'consecutive_days', 'instrument_count'
    condition_value = Column(Integer, nullable=True)
    icon_url = Column(String(500), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    users = relationship("UserAchievement", back_populates="achievement")


class UserAchievement(Base):
    """사용자가 획득한 칭호 테이블"""
    __tablename__ = "user_achievements"

    user_achievement_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.achievement_id", ondelete="CASCADE"), nullable=False)
    earned_at = Column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="users")

    # 복합 유니크 제약조건
    __table_args__ = (
        {"postgresql_unique_constraint": ("user_id", "achievement_id")},
    )

