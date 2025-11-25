"""
그룹 관련 모델
- Group: 그룹 정보
- GroupMember: 그룹 멤버 정보
- GroupInvitation: 그룹 초대 정보
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, TIMESTAMP, ForeignKey, UniqueConstraint, CheckConstraint
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
    invitations = relationship("GroupInvitation", back_populates="group", cascade="all, delete-orphan")


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
        UniqueConstraint("group_id", "user_id", name="uq_group_member_group_user"),
    )


class GroupInvitation(Base):
    """그룹 초대 정보 테이블"""
    __tablename__ = "group_invitations"

    invitation_id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.group_id", ondelete="CASCADE"), nullable=False, index=True)
    inviter_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    invitee_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="pending", nullable=False, index=True)  # 'pending', 'accepted', 'declined', 'expired'
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # 관계 설정
    group = relationship("Group", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[inviter_id], back_populates="group_invitations_sent")
    invitee = relationship("User", foreign_keys=[invitee_id], back_populates="group_invitations_received")

    # 상태 값 제약조건
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'accepted', 'declined', 'expired')",
            name="ck_group_invitation_status"
        ),
    )

