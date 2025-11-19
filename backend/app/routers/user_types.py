"""
사용자 특징 목록 API 라우터
사용자 특징 목록 조회 기능 제공
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.user_type import UserType
from app.schemas.users import UserTypeResponse

router = APIRouter(prefix="/api/user-types", tags=["사용자 특징"])


@router.get("", response_model=List[UserTypeResponse])
async def get_user_types(
    db: Session = Depends(get_db)
):
    """
    사용자 특징 목록 조회
    
    - 모든 특징을 표시 순서(display_order) 기준으로 정렬하여 반환
    - 인증 불필요 (공개 API)
    """
    try:
        user_types = db.query(UserType).order_by(UserType.display_order.asc()).all()
        return user_types
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"특징 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

