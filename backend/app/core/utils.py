"""
공통 유틸리티 함수 모듈
재사용 가능한 헬퍼 함수들 정의
"""
import secrets
import string
from typing import Optional
from sqlalchemy.orm import Session
from app.models.achievement import Achievement
from app.models.user import User


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


def generate_unique_code(db: Session, length: int = 12) -> str:
    """
    12자리 고유 코드 생성 (숫자 + 대소문자)
    중복 확인 후 반환
    
    Args:
        db: 데이터베이스 세션
        length: 생성할 코드 길이 (기본값: 12)
    
    Returns:
        고유한 12자리 영숫자 코드 문자열
    
    Raises:
        Exception: 최대 시도 횟수(100회) 내에 고유 코드를 생성하지 못한 경우
    """
    characters = string.ascii_letters + string.digits  # A-Z, a-z, 0-9
    max_attempts = 100  # 무한 루프 방지
    
    for _ in range(max_attempts):
        # secrets 모듈을 사용하여 암호학적으로 안전한 랜덤 코드 생성
        code = ''.join(secrets.choice(characters) for _ in range(length))
        
        # 중복 확인
        existing_user = db.query(User).filter(User.unique_code == code).first()
        if not existing_user:
            return code
    
    # 100번 시도 후에도 중복이면 예외 발생
    raise Exception("고유 코드 생성에 실패했습니다. 다시 시도해주세요.")

