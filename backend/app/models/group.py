"""
그룹 관련 모델
- Group: 그룹 정보
- GroupMember: 그룹 멤버 정보
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Group(Base):
    """그룹 정보 테이블"""
    __tablename__ = "groups"

    group_id = Column(Integer, primary_key=True, index=True)
    group_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    is_public = Column(Boolean, default=False)
    max_members = Column(Integer, default=50)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    owner = relationship("User", back_populates="groups_owned", foreign_keys=[owner_id])
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    """그룹 멤버 정보 테이블"""
    __tablename__ = "group_members"

    member_id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.group_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), default="member")  # 'owner', 'admin', 'member'
    joined_at = Column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="group_memberships")

    # 복합 유니크 제약조건
    __table_args__ = (
        {"postgresql_unique_constraint": ("group_id", "user_id")},
    )

