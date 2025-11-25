"""
데이터베이스 모델 패키지
모든 모델을 import하여 Base.metadata에 등록
"""
from app.core.database import Base

# 모든 모델 import (순서 중요: 외래키 관계를 고려)
from app.models.user import User, UserProfile, SocialAccount
from app.models.instrument import Instrument
from app.models.user_type import UserType
from app.models.user_profile import UserProfileInstrument, UserProfileUserType
from app.models.practice import PracticeSession, RecordingFile
from app.models.group import Group, GroupMember, GroupInvitation
from app.models.board import Post, Comment, PostLike, CommentLike
from app.models.achievement import Achievement, UserAchievement

__all__ = [
    # Base
    "Base",
    # User models
    "User",
    "UserProfile",
    "SocialAccount",
    # Instrument models
    "Instrument",
    # UserType models
    "UserType",
    # UserProfile relationship models
    "UserProfileInstrument",
    "UserProfileUserType",
    # Practice models
    "PracticeSession",
    "RecordingFile",
    # Group models
    "Group",
    "GroupMember",
    "GroupInvitation",
    # Board models
    "Post",
    "Comment",
    "PostLike",
    "CommentLike",
    # Achievement models
    "Achievement",
    "UserAchievement",
]
