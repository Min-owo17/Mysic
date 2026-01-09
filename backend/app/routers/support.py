from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
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

from sqlalchemy import desc, or_
from sqlalchemy.orm import joinedload
from app.schemas.users import UserSearchResponse
from app.routers.auth import get_current_user

# Admin 권한 체크 Dependency (admin.py와 중복되므로 추후 공통화 필요)
def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user

@router.get("/admin/inquiries", response_model=SupportListResponse)
async def get_admin_inquiries(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    관리자용 문의/제안 목록 조회
    - 페이지네이션 (skip, limit)
    - 상태 필터 (pending, answered)
    - 유형 필터 (inquiry, suggestion)
    - 작성자 정보 포함 (User)
    """
    query = db.query(CustomerSupport)

    # 필터 적용
    if status and status != 'all':
        query = query.filter(CustomerSupport.status == status)
    
    if type and type != 'all':
        query = query.filter(CustomerSupport.type == type)

    # 총 개수
    total = query.count()

    # 조회 (작성자 정보 Eager Loading)
    supports = query.options(joinedload(CustomerSupport.user))\
        .order_by(desc(CustomerSupport.created_at))\
        .offset(skip).limit(limit).all()

    # UserSearchResponse 매핑
    results = []
    for support in supports:
        user_data = None
        if support.user:
            user_data = UserSearchResponse.model_validate(support.user)
            
        support_dict = {
            "support_id": support.support_id,
            "user_id": support.user_id,
            "type": support.type,
            "title": support.title,
            "content": support.content,
            "status": support.status,
            "answer_content": support.answer_content,
            "answered_at": support.answered_at,
            "created_at": support.created_at,
            "updated_at": support.updated_at,
            "user": user_data
        }
        results.append(support_dict)

    return {
        "supports": results,
        "total": total
    }

@router.post("/admin/{support_id}/answer", response_model=SupportResponse)
async def answer_support_admin(
    support_id: int,
    answer_in: AdminAnswer,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """문의에 대한 답변 등록 (관리자용)"""
    support = db.query(CustomerSupport).filter(CustomerSupport.support_id == support_id).first()
    if not support:
        raise HTTPException(status_code=404, detail="Inquiry not found")
        
    support.answer_content = answer_in.answer_content
    support.answered_at = datetime.now(timezone.utc)
    support.status = "answered"
    
    db.commit()
    db.refresh(support)

    # 응답 구성을 위해 user 정보 로드 (변경됨: user 필수 아님)
    # 하지만 refresh를 했으므로 lazy loading으로 접근 가능
    user_data = None
    if support.user:
        user_data = UserSearchResponse.model_validate(support.user)
    
    # Pydantic 모델 반환 (user 필드 포함)
    return SupportResponse(
        support_id=support.support_id,
        user_id=support.user_id,
        type=support.type,
        title=support.title,
        content=support.content,
        status=support.status,
        answer_content=support.answer_content,
        answered_at=support.answered_at,
        created_at=support.created_at,
        updated_at=support.updated_at,
        user=user_data
    )
