from sqlalchemy import Column, Integer, String, Boolean, Text, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Notification(Base):
    """알림 정보 테이블"""
    __tablename__ = "notifications"

    notification_id = Column(Integer, primary_key=True, index=True)
    receiver_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Notification types:
    # 'like': 내 글에 좋아요
    # 'comment': 내 글에 댓글
    # 'reply': 내 댓글에 답글
    # 'excellent_post': 우수 게시글 선정
    # 'report_hidden': 신고로 인한 숨김 처리
    # 'report_deleted': 신고로 인한 삭제 처리
    type = Column(String(50), nullable=False, index=True)
    
    post_id = Column(Integer, ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=True, index=True)
    comment_id = Column(Integer, ForeignKey("comments.comment_id", ondelete="CASCADE"), nullable=True, index=True)
    
    content = Column(Text, nullable=True)  # 알림 내용 요약 (예: 게시글 제목 등)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)

    # 관계 설정
    receiver = relationship("User", foreign_keys=[receiver_id], backref="notifications_received")
    sender = relationship("User", foreign_keys=[sender_id], backref="notifications_sent")
    post = relationship("Post")
    comment = relationship("Comment")
