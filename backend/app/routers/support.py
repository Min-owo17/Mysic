from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user
from app.models.support import CustomerSupport
from app.schemas.support import SupportCreate, SupportResponse, SupportListResponse, AdminAnswer
from datetime import datetime, timezone

router = APIRouter(prefix="/api/support", tags=["support"])

@router.post("", response_model=SupportResponse)
async def create_support(
    support_in: SupportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """문의 또는 제안 등록"""
    support = CustomerSupport(
        user_id=current_user.user_id,
        type=support_in.type,
        title=support_in.title,
        content=support_in.content
    )
    db.add(support)
    db.commit()
    db.refresh(support)
    return support

@router.get("/my", response_model=SupportListResponse)
async def get_my_supports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """현재 사용자의 문의 내역 조회"""
    supports = db.query(CustomerSupport).filter(
        CustomerSupport.user_id == current_user.user_id
    ).order_by(CustomerSupport.created_at.desc()).all()
    
    return {
        "supports": supports,
        "total": len(supports)
    }

# 관리자용 API (우선 별도 권한 체크 없이 경로로 구분)
@router.get("/admin/all", response_model=SupportListResponse)
async def get_all_supports_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """전체 유저의 문의 내역 조회 (관리자용)"""
    # TODO: 실제 관리자 권한 확인 로직 추가 필요
    supports = db.query(CustomerSupport).order_by(CustomerSupport.created_at.desc()).all()
    return {
        "supports": supports,
        "total": len(supports)
    }

@router.post("/admin/{support_id}/answer", response_model=SupportResponse)
async def answer_support_admin(
    support_id: int,
    answer_in: AdminAnswer,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """문의에 대한 답변 등록 (관리자용)"""
    # TODO: 실제 관리자 권한 확인 로직 추가 필요
    support = db.query(CustomerSupport).filter(CustomerSupport.support_id == support_id).first()
    if not support:
        raise HTTPException(status_code=404, detail="Inquiry not found")
        
    support.answer_content = answer_in.answer_content
    support.answered_at = datetime.now(timezone.utc)
    support.status = "answered"
    
    db.commit()
    db.refresh(support)
    return support
