"""
공통 유틸리티 함수 모듈
재사용 가능한 헬퍼 함수들 정의
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.achievement import Achievement


def get_achievement_response(db: Session, achievement_id: Optional[int]):
    """
    Achievement ID로 Achievement 응답 객체를 조회하는 유틸리티 함수
    
    Args:
        db: 데이터베이스 세션
        achievement_id: 조회할 Achievement ID (None일 수 있음)
    
    Returns:
        AchievementResponse 객체 또는 None
    """
    if not achievement_id:
        return None
    
    achievement = db.query(Achievement).filter(
        Achievement.achievement_id == achievement_id
    ).first()
    
    if achievement:
        from app.schemas.achievements import AchievementResponse
        return AchievementResponse.model_validate(achievement)
    
    return None

