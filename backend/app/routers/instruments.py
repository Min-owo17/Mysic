"""
악기 목록 API 라우터
악기 목록 조회 기능 제공
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.instrument import Instrument
from app.schemas.users import InstrumentResponse

router = APIRouter(prefix="/api/instruments", tags=["악기"])


@router.get("", response_model=List[InstrumentResponse])
async def get_instruments(
    db: Session = Depends(get_db)
):
    """
    악기 목록 조회
    
    - 모든 악기를 표시 순서(display_order) 기준으로 정렬하여 반환
    - 인증 불필요 (공개 API)
    """
    try:
        instruments = db.query(Instrument).order_by(Instrument.display_order.asc()).all()
        return instruments
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"악기 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

