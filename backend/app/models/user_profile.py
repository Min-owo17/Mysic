"""
사용자 프로필 관계 모델
- UserProfileInstrument: 사용자 프로필과 악기의 다대다 관계
- UserProfileUserType: 사용자 프로필과 특징의 다대다 관계
"""
from sqlalchemy import Column, Integer, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class UserProfileInstrument(Base):
    """사용자 프로필과 악기의 다대다 관계 테이블"""
    __tablename__ = "user_profile_instruments"

    profile_id = Column(Integer, ForeignKey("user_profiles.profile_id", ondelete="CASCADE"), primary_key=True)
    instrument_id = Column(Integer, ForeignKey("instruments.instrument_id", ondelete="CASCADE"), primary_key=True)
    is_primary = Column(Boolean, default=False)  # 주요 악기 여부
    created_at = Column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    profile = relationship("UserProfile", back_populates="instruments")
    instrument = relationship("Instrument", back_populates="user_profiles")


class UserProfileUserType(Base):
    """사용자 프로필과 특징의 다대다 관계 테이블"""
    __tablename__ = "user_profile_user_types"

    profile_id = Column(Integer, ForeignKey("user_profiles.profile_id", ondelete="CASCADE"), primary_key=True)
    user_type_id = Column(Integer, ForeignKey("user_types.user_type_id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    profile = relationship("UserProfile", back_populates="user_types")
    user_type = relationship("UserType", back_populates="user_profiles")

