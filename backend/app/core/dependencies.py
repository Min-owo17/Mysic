"""
FastAPI 의존성 함수 모듈
JWT 인증 및 기타 공통 의존성 함수 정의
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

# OAuth2 스키마 설정
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    JWT 토큰에서 현재 사용자 정보를 가져오는 의존성 함수
    
    Args:
        token: Authorization 헤더에서 추출된 JWT 토큰
        db: 데이터베이스 세션
    
    Returns:
        User: 현재 인증된 사용자 객체
    
    Raises:
        HTTPException: 토큰이 유효하지 않거나 사용자를 찾을 수 없는 경우
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보를 확인할 수 없습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 토큰 디코딩
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    # 토큰에서 사용자 ID 추출
    user_id_raw = payload.get("sub")
    if user_id_raw is None:
        raise credentials_exception
    
    # user_id를 정수로 변환 (JWT의 sub는 문자열일 수 있음)
    try:
        user_id: int = int(user_id_raw)
    except (ValueError, TypeError):
        raise credentials_exception
    
    # 데이터베이스에서 사용자 조회
    user = db.query(User).filter(
        User.user_id == user_id,
        User.deleted_at.is_(None),  # Soft Delete 필터링
        User.is_active == True
    ).first()
    
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    현재 활성 사용자를 반환하는 의존성 함수
    
    Args:
        current_user: get_current_user에서 반환된 사용자
    
    Returns:
        User: 활성 사용자 객체
    
    Raises:
        HTTPException: 사용자가 비활성화된 경우
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="비활성화된 사용자입니다."
        )
    return current_user

