"""
게시판 관련 모델
- Post: 게시글 정보
- Comment: 댓글 정보
- PostLike: 게시글 좋아요
- CommentLike: 댓글 좋아요
"""
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey, ARRAY, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Post(Base):
    """게시글 정보 테이블"""
    __tablename__ = "posts"

    post_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(300), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), default="general", index=True)  # 'tip', 'question', 'free'
    manual_tags = Column(ARRAY(String), nullable=True)  # 사용자가 직접 추가한 태그
    view_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)
    deleted_at = Column(TIMESTAMP, nullable=True, index=True)  # Soft delete
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, nullable=True, onupdate=func.now())  # 수정 시에만 값이 설정됨

    # 관계 설정
    user = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")


class Comment(Base):
    """댓글 정보 테이블"""
    __tablename__ = "comments"

    comment_id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    # parent_comment_id: 부모 댓글 참조 (soft delete 사용으로 하위 댓글은 항상 유지됨)
    parent_comment_id = Column(Integer, ForeignKey("comments.comment_id"), nullable=True, index=True)
    content = Column(Text, nullable=False)
    like_count = Column(Integer, default=0)
    deleted_at = Column(TIMESTAMP, nullable=True, index=True)  # Soft delete
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=True, onupdate=func.now())  # 수정 시에만 값이 설정됨

    # 관계 설정
    post = relationship("Post", back_populates="comments")
    user = relationship("User", back_populates="comments")
    parent_comment = relationship("Comment", remote_side=[comment_id], backref="replies")
    likes = relationship("CommentLike", back_populates="comment", cascade="all, delete-orphan")


class PostLike(Base):
    """게시글 좋아요 테이블"""
    __tablename__ = "post_likes"

    like_id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    post = relationship("Post", back_populates="likes")
    user = relationship("User")

    # 복합 유니크 제약조건
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_like_post_user"),
    )


class CommentLike(Base):
    """댓글 좋아요 테이블"""
    __tablename__ = "comment_likes"

    like_id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("comments.comment_id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    comment = relationship("Comment", back_populates="likes")
    user = relationship("User")

    # 복합 유니크 제약조건
    __table_args__ = (
        UniqueConstraint("comment_id", "user_id", name="uq_comment_like_comment_user"),
    )

