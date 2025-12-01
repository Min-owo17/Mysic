"""
사용자 관련 모델
- User: 사용자 기본 정보
- UserProfile: 사용자 프로필 정보
- SocialAccount: 소셜 로그인 계정 정보
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, TIMESTAMP, ForeignKey, ARRAY, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    """사용자 기본 정보 테이블"""
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # 소셜 로그인 사용자는 NULL 가능
    nickname = Column(String(100), nullable=False, index=True)
    unique_code = Column(String(12), unique=True, nullable=False, index=True)  # 12자리 고유 코드
    profile_image_url = Column(Text, nullable=True)  # base64 Data URL 또는 S3 URL 저장용 (최적화된 WebP 이미지 지원)
    is_active = Column(Boolean, default=True)
    deleted_at = Column(TIMESTAMP, nullable=True, index=True)  # Soft delete
    last_login_at = Column(TIMESTAMP, nullable=True, index=True)  # 최종 접속일
    selected_achievement_id = Column(Integer, ForeignKey("achievements.achievement_id", ondelete="SET NULL"), nullable=True, index=True)  # 선택한 대표 칭호
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # 관계 설정
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    social_accounts = relationship("SocialAccount", back_populates="user", cascade="all, delete-orphan")
    practice_sessions = relationship("PracticeSession", back_populates="user", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    groups_owned = relationship("Group", back_populates="owner", foreign_keys="[Group.owner_id]", cascade="all, delete-orphan")
    group_memberships = relationship("GroupMember", back_populates="user", cascade="all, delete-orphan")
    group_invitations_sent = relationship("GroupInvitation", foreign_keys="[GroupInvitation.inviter_id]", back_populates="inviter", cascade="all, delete-orphan")
    group_invitations_received = relationship("GroupInvitation", foreign_keys="[GroupInvitation.invitee_id]", back_populates="invitee", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    selected_achievement = relationship("Achievement", foreign_keys=[selected_achievement_id])


class UserProfile(Base):
    """사용자 프로필 정보 테이블"""
    __tablename__ = "user_profiles"

    profile_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False)
    bio = Column(Text, nullable=True)
    hashtags = Column(ARRAY(String), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # 관계 설정
    user = relationship("User", back_populates="profile")
    instruments = relationship("UserProfileInstrument", back_populates="profile", cascade="all, delete-orphan")
    user_types = relationship("UserProfileUserType", back_populates="profile", cascade="all, delete-orphan")


class SocialAccount(Base):
    """소셜 로그인 계정 정보 테이블"""
    __tablename__ = "social_accounts"

    social_account_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)  # 'google', 'kakao', 'naver'
    provider_user_id = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    user = relationship("User", back_populates="social_accounts")

    # 복합 유니크 제약조건
    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_social_account_provider_user"),
    )

