"""
사용자 특징 모델
- UserType: 사용자 특징 정보 (진학, 취미, 클래식, 재즈, 밴드 등)
"""
from sqlalchemy import Column, Integer, String, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class UserType(Base):
    """사용자 특징 정보 테이블"""
    __tablename__ = "user_types"

    user_type_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)  # 예: '진학', '취미', '클래식', '재즈', '밴드' 등
    display_order = Column(Integer, default=0)  # 표시 순서
    created_at = Column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    user_profiles = relationship("UserProfileUserType", back_populates="user_type")

