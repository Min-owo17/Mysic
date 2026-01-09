from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, or_

from app.core.database import get_db
from app.models.user import User, UserProfile
from app.models.user_profile import UserProfileInstrument, UserProfileUserType
from app.schemas.users import (
    UserDetailResponse, 
    UserProfileResponse, 
    UserProfileInstrumentResponse, 
    UserProfileUserTypeResponse
)
from app.routers.auth import get_current_user
from pydantic import BaseModel

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    responses={404: {"description": "Not found"}},
)

# Admin 권한 체크 Dependency
def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user

def _build_profile_response(profile: UserProfile) -> UserProfileResponse:
    """UserProfile 객체를 UserProfileResponse로 변환"""
    # instruments 관계가 로드되지 않았거나 비어있을 수 있음
    instruments = []
    if profile.instruments:
        instruments = [
            UserProfileInstrumentResponse(
                instrument_id=rel.instrument_id,
                instrument_name=rel.instrument.name if rel.instrument else "Unknown",
                is_primary=rel.is_primary
            )
            for rel in profile.instruments
        ]
    
    # user_types 관계가 로드되지 않았거나 비어있을 수 있음
    user_types = []
    if profile.user_types:
        user_types = [
            UserProfileUserTypeResponse(
                user_type_id=rel.user_type_id,
                user_type_name=rel.user_type.name if rel.user_type else "Unknown"
            )
            for rel in profile.user_types
        ]
    
    return UserProfileResponse(
        profile_id=profile.profile_id,
        user_id=profile.user_id,
        bio=profile.bio,
        hashtags=profile.hashtags,
        instruments=instruments,
        user_types=user_types,
        created_at=profile.created_at,
        updated_at=profile.updated_at
    )

class AdminUserListResponse(BaseModel):
    users: List[UserDetailResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class UserStatusUpdateRequest(BaseModel):
    is_active: bool

class AdminUpdateUserRequest(BaseModel):
    nickname: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    membership_tier: Optional[str] = None

@router.get("/users", response_model=AdminUserListResponse)
def get_users(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    관리자용 사용자 목록 조회
    - 닉네임, 이메일 검색 지원
    - 활성/비활성 상태 필터링 지원
    """
    query = db.query(User)

    # 검색 필터 (닉네임 또는 이메일)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                User.nickname.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )
    
    # 상태 필터
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    # 총 개수 계산
    total = query.count()

    # 정렬 (최신 가입순) 및 페이지네이션 - 프로필 및 관련 데이터 Eager Loading
    users = query.options(
        joinedload(User.profile).joinedload(UserProfile.instruments).joinedload(UserProfileInstrument.instrument),
        joinedload(User.profile).joinedload(UserProfile.user_types).joinedload(UserProfileUserType.user_type),
        joinedload(User.selected_achievement)
    ).order_by(desc(User.created_at)).offset(skip).limit(limit).all()

    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    page = (skip // limit) + 1 if limit > 0 else 1

    # UserDetailResponse로 수동 변환 (Pydantic의 from_attributes 한계 극복)
    user_responses = []
    for user in users:
        profile_data = None
        if user.profile:
            profile_data = _build_profile_response(user.profile)
        
        # selected_achievement 변환 (필요 시)
        selected_achievement_data = None
        if user.selected_achievement:
            from app.schemas.achievements import AchievementResponse
            selected_achievement_data = AchievementResponse.model_validate(user.selected_achievement)

        user_responses.append(
            UserDetailResponse(
                user_id=user.user_id,
                email=user.email,
                nickname=user.nickname,
                unique_code=user.unique_code,
                profile_image_url=user.profile_image_url,
                is_active=user.is_active,
                is_admin=user.is_admin,
                membership_tier=user.membership_tier,
                last_login_at=user.last_login_at,
                selected_achievement_id=user.selected_achievement_id,
                created_at=user.created_at,
                updated_at=user.updated_at,
                profile=profile_data,
                selected_achievement=selected_achievement_data
            )
        )

    return {
        "users": user_responses,
        "total": total,
        "page": page,
        "page_size": limit,
        "total_pages": total_pages
    }

@router.patch("/users/{user_id}", response_model=UserDetailResponse)
def update_user_detail(
    user_id: int,
    request: AdminUpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    관리자용 사용자 정보 수정
    - 닉네임, 이메일, 활성 상태, 관리자 권한, 멤버십 등급 수정
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 이메일 중복 확인
    if request.email and request.email != user.email:
        existing_email = db.query(User).filter(User.email == request.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다.")
        user.email = request.email

    # 닉네임 중복 확인
    if request.nickname and request.nickname != user.nickname:
        existing_nickname = db.query(User).filter(User.nickname == request.nickname).first()
        if existing_nickname:
            raise HTTPException(status_code=400, detail="이미 사용 중인 닉네임입니다.")
        user.nickname = request.nickname

    # 관리자 상태 변경 시 안전장치 (자기 자신 관리자권한 해제 불가)
    if request.is_admin is not None:
        if user.user_id == current_user.user_id and request.is_admin is False:
             raise HTTPException(status_code=400, detail="자신의 관리자 권한을 해제할 수 없습니다.")
        user.is_admin = request.is_admin
    
    # 활성 상태 변경
    if request.is_active is not None:
         # 자기 자신 비활성화 불가
        if user.user_id == current_user.user_id and request.is_active is False:
             raise HTTPException(status_code=400, detail="자신의 계정을 비활성화할 수 없습니다.")
        user.is_active = request.is_active

    # 멤버십 등급 변경
    if request.membership_tier:
        if request.membership_tier not in ['FREE', 'CUP', 'BOTTLE']:
             raise HTTPException(status_code=400, detail="유효하지 않은 멤버십 등급입니다.")
        user.membership_tier = request.membership_tier

    db.commit()
    db.refresh(user)

    # 응답 데이터 구성
    profile_data = None
    if user.profile:
        # 관계 데이터 로드가 안 되어 있을 수 있으므로 joinedload를 쓰거나, 여기서는 간단히 다시 쿼리
        # 하지만 user객체는 세션에 있으므로 lazy loading이 작동할 것임 (동기 세션이므로)
        # N+1 방지를 위해 로드하는 것이 좋으나, 단일 건 업데이트이므로 큰 문제 없음
        profile_data = _build_profile_response(user.profile)
    
    selected_achievement_data = None
    if user.selected_achievement:
        from app.schemas.achievements import AchievementResponse
        selected_achievement_data = AchievementResponse.model_validate(user.selected_achievement)

    return UserDetailResponse(
        user_id=user.user_id,
        email=user.email,
        nickname=user.nickname,
        unique_code=user.unique_code,
        profile_image_url=user.profile_image_url,
        is_active=user.is_active,
        is_admin=user.is_admin,
        membership_tier=user.membership_tier,
        last_login_at=user.last_login_at,
        selected_achievement_id=user.selected_achievement_id,
        created_at=user.created_at,
        updated_at=user.updated_at,
        profile=profile_data,
        selected_achievement=selected_achievement_data
    )

@router.patch("/users/{user_id}/status", response_model=UserDetailResponse)
def update_user_status(
    user_id: int,
    status_update: UserStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    사용자 계정 활성/비활성 상태 변경
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 관리자 자신은 비활성화 불가 (안전장치)
    if user.user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change status of your own admin account"
        )

    user.is_active = status_update.is_active
    db.commit()
    db.refresh(user)
    
    return user
