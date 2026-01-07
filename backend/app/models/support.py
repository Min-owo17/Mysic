"""
고객 지원 관련 모델
- CustomerSupport: 사용자의 문의 및 제안 정보
"""
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class CustomerSupport(Base):
    """고객 지원(문의/제안) 정보 테이블"""
    __tablename__ = "customer_support"

    support_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 'inquiry'(문의), 'suggestion'(제안)
    type = Column(String(20), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    
    # 'pending'(대기), 'answered'(답변완료)
    status = Column(String(20), default="pending", nullable=False, index=True)
    
    # 관리자 답변 관련
    answer_content = Column(Text, nullable=True)
    answered_at = Column(TIMESTAMP, nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=True, onupdate=func.now())

    # 관계 설정
    user = relationship("User", back_populates="supports")
