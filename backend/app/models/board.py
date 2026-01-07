"""
게시판 관련 모델
- Post: 게시글 정보
- Comment: 댓글 정보
- PostLike: 게시글 좋아요
- CommentLike: 댓글 좋아요
"""
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey, ARRAY, UniqueConstraint, Boolean
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
    report_count = Column(Integer, default=0)  # 신고 누적 횟수
    is_hidden = Column(Boolean, default=False, index=True)  # 신고 누적으로 인한 숨김 처리 여부
    deleted_at = Column(TIMESTAMP, nullable=True, index=True)  # Soft delete
    # created_at: UTC로 저장 (Python 코드에서 datetime.utcnow()로 명시적으로 설정)
    # server_default는 fallback으로만 사용됨
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    # updated_at: UTC로 저장 (Python 코드에서 제목/본문 수정 시에만 명시적으로 설정)
    # onupdate 제거: 좋아요 등 다른 필드 변경 시 자동 갱신 방지
    updated_at = Column(TIMESTAMP, nullable=True)  # 제목/본문 수정 시에만 값이 설정됨

    # 관계 설정
    user = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")
    bookmarks = relationship("PostBookmark", back_populates="post", cascade="all, delete-orphan")
    reports = relationship("PostReport", back_populates="post", cascade="all, delete-orphan")


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
    # created_at: UTC로 저장 (Python 코드에서 datetime.utcnow()로 명시적으로 설정)
    # server_default는 fallback으로만 사용됨
    created_at = Column(TIMESTAMP, server_default=func.now())
    # updated_at: UTC로 저장 (Python 코드에서 본문 수정 시에만 명시적으로 설정)
    # onupdate 제거: 좋아요 등 다른 필드 변경 시 자동 갱신 방지
    updated_at = Column(TIMESTAMP, nullable=True)  # 본문 수정 시에만 값이 설정됨

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


class PostBookmark(Base):
    """게시글 북마크 테이블"""
    __tablename__ = "post_bookmarks"

    bookmark_id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    post = relationship("Post", back_populates="bookmarks")
    user = relationship("User", back_populates="bookmarks")

    # 복합 유니크 제약조건
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_bookmark_post_user"),
    )


class PostReport(Base):
    """게시글 신고 테이블"""
    __tablename__ = "post_reports"

    report_id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False, index=True)
    reporter_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(String(100), nullable=False)  # 신고 사유
    details = Column(Text, nullable=True)  # 상세 내용
    created_at = Column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    post = relationship("Post", back_populates="reports")
    reporter = relationship("User")

    # 복합 유니크 제약조건 (동일 사용자의 중복 신고 방지)
    __table_args__ = (
        UniqueConstraint("post_id", "reporter_id", name="uq_post_report_post_reporter"),
    )

