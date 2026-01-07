"""
사용자 관리 API 라우터
프로필 조회, 수정, 회원 탈퇴 기능 제공
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_, and_, desc
from datetime import datetime
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import get_password_hash, verify_password
from app.core.utils import get_achievement_response
from app.models.user import User, UserProfile
from app.models.user_profile import UserProfileInstrument, UserProfileUserType
from app.models.instrument import Instrument
from app.models.user_type import UserType
from app.models.achievement import Achievement, UserAchievement
from app.schemas.users import (
    UserDetailResponse,
    UserProfileResponse,
    UpdateProfileRequest,
    UpdateInstrumentsRequest,
    UpdateUserTypesRequest,
    ChangePasswordRequest,
    ChangeEmailRequest,
    MessageResponse,
    UserProfileInstrumentResponse,
    UserProfileUserTypeResponse,
    UserSearchResponse,
    UserSearchListResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["사용자"])


def _get_user_profile_with_relations(db: Session, user_id: int) -> UserProfile:
    """사용자 프로필을 관계 데이터와 함께 조회 (N+1 쿼리 방지)"""
    profile = db.query(UserProfile).options(
        joinedload(UserProfile.instruments).joinedload(UserProfileInstrument.instrument),
        joinedload(UserProfile.user_types).joinedload(UserProfileUserType.user_type)
    ).filter(UserProfile.user_id == user_id).first()
    return profile


def _build_profile_response(profile: UserProfile) -> UserProfileResponse:
    """UserProfile 객체를 UserProfileResponse로 변환"""
    instruments = [
        UserProfileInstrumentResponse(
            instrument_id=rel.instrument_id,
            instrument_name=rel.instrument.name,
            is_primary=rel.is_primary
        )
        for rel in profile.instruments
    ]
    
    user_types = [
        UserProfileUserTypeResponse(
            user_type_id=rel.user_type_id,
            user_type_name=rel.user_type.name
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


@router.get("/me", response_model=UserDetailResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    내 프로필 조회
    
    - 현재 로그인한 사용자의 상세 정보 반환
    - 프로필 정보(악기, 특징 포함) 포함
    """
    try:
        # 프로필 조회 (없으면 생성)
        profile = _get_user_profile_with_relations(db, current_user.user_id)
        
        profile_data = None
        if profile:
            profile_data = _build_profile_response(profile)
        
        # 선택한 칭호 정보 조회
        selected_achievement_data = get_achievement_response(db, current_user.selected_achievement_id)
        
        return UserDetailResponse(
            user_id=current_user.user_id,
            email=current_user.email,
            nickname=current_user.nickname,
            unique_code=current_user.unique_code,
            profile_image_url=current_user.profile_image_url,
            is_active=current_user.is_active,
            is_admin=current_user.is_admin,
            last_login_at=current_user.last_login_at,
            selected_achievement_id=current_user.selected_achievement_id,
            created_at=current_user.created_at,
            updated_at=current_user.updated_at,
            profile=profile_data,
            selected_achievement=selected_achievement_data
        )
    except Exception as e:
        logger.error(f"프로필 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="프로필 조회 중 오류가 발생했습니다."
        )


@router.put("/me", response_model=UserDetailResponse)
async def update_my_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    내 프로필 수정
    
    - 닉네임, 프로필 이미지, 자기소개, 해시태그 수정
    - 닉네임 중복 확인
    """
    try:
        # 닉네임 변경 시 중복 확인
        if request.nickname and request.nickname != current_user.nickname:
            existing_user = db.query(User).filter(
                User.nickname == request.nickname,
                User.user_id != current_user.user_id,
                User.deleted_at.is_(None)
            ).first()
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="이미 사용 중인 닉네임입니다."
                )
            current_user.nickname = request.nickname
        
        # 프로필 이미지 업데이트
        if request.profile_image_url is not None:
            current_user.profile_image_url = request.profile_image_url
        
        # 프로필 조회 또는 생성
        profile = _get_user_profile_with_relations(db, current_user.user_id)
        if not profile:
            profile = UserProfile(user_id=current_user.user_id)
            db.add(profile)
            db.flush()
        
        # 프로필 정보 업데이트
        if request.bio is not None:
            profile.bio = request.bio
        if request.hashtags is not None:
            profile.hashtags = request.hashtags
        
        current_user.updated_at = datetime.utcnow()
        profile.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(current_user)
        db.refresh(profile)
        
        # 프로필 데이터 구성
        profile_data = _build_profile_response(profile)
        
        return UserDetailResponse(
            user_id=current_user.user_id,
            email=current_user.email,
            nickname=current_user.nickname,
            unique_code=current_user.unique_code,
            profile_image_url=current_user.profile_image_url,
            is_active=current_user.is_active,
            is_admin=current_user.is_admin,
            last_login_at=current_user.last_login_at,
            created_at=current_user.created_at,
            updated_at=current_user.updated_at,
            profile=profile_data
        )
        
    except HTTPException:
        raise
    except IntegrityError as e:
        db.rollback()
        logger.error(f"프로필 수정 오류 (IntegrityError): {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="프로필 수정 중 오류가 발생했습니다."
        )
    except Exception as e:
        db.rollback()
        error_message = str(e)
        error_type = type(e).__name__
        logger.error(f"프로필 수정 오류: {error_message}", exc_info=True)
        logger.error(f"에러 타입: {error_type}")
        logger.error(f"요청 데이터: nickname={request.nickname}, profile_image_url 길이={len(request.profile_image_url) if request.profile_image_url else 0}")
        
        # 데이터베이스 제약 조건 에러인 경우 더 구체적인 메시지
        if "value too long" in error_message.lower() or "character varying" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="프로필 이미지가 너무 큽니다. 더 작은 이미지를 사용해주세요."
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"프로필 수정 중 오류가 발생했습니다: {error_message}"
        )


@router.put("/me/instruments", response_model=MessageResponse)
async def update_my_instruments(
    request: UpdateInstrumentsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    내 악기 정보 수정
    
    - 악기 목록 업데이트
    - 주요 악기 지정
    - 악기 ID 유효성 검사
    """
    try:
        # 악기 ID 유효성 검사
        if request.instrument_ids:
            valid_instruments = db.query(Instrument).filter(
                Instrument.instrument_id.in_(request.instrument_ids)
            ).all()
            
            if len(valid_instruments) != len(request.instrument_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="존재하지 않는 악기 ID가 포함되어 있습니다."
                )
        
        # 주요 악기 검증
        if request.primary_instrument_id:
            if request.primary_instrument_id not in request.instrument_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="주요 악기는 선택한 악기 목록에 포함되어야 합니다."
                )
        
        # 프로필 조회 또는 생성
        profile = _get_user_profile_with_relations(db, current_user.user_id)
        if not profile:
            profile = UserProfile(user_id=current_user.user_id)
            db.add(profile)
            db.flush()
        
        # 기존 악기 관계 삭제
        db.query(UserProfileInstrument).filter(
            UserProfileInstrument.profile_id == profile.profile_id
        ).delete()
        
        # 새로운 악기 관계 생성
        for instrument_id in request.instrument_ids:
            is_primary = (instrument_id == request.primary_instrument_id) if request.primary_instrument_id else False
            profile_instrument = UserProfileInstrument(
                profile_id=profile.profile_id,
                instrument_id=instrument_id,
                is_primary=is_primary
            )
            db.add(profile_instrument)
        
        profile.updated_at = datetime.utcnow()
        db.commit()
        
        return MessageResponse(message="악기 정보가 수정되었습니다.")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"악기 정보 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="악기 정보 수정 중 오류가 발생했습니다."
        )


@router.put("/me/user-types", response_model=MessageResponse)
async def update_my_user_types(
    request: UpdateUserTypesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    내 특징 정보 수정
    
    - 특징 목록 업데이트
    - 특징 ID 유효성 검사
    """
    try:
        # 특징 ID 유효성 검사
        if request.user_type_ids:
            valid_user_types = db.query(UserType).filter(
                UserType.user_type_id.in_(request.user_type_ids)
            ).all()
            
            if len(valid_user_types) != len(request.user_type_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="존재하지 않는 특징 ID가 포함되어 있습니다."
                )
        
        # 프로필 조회 또는 생성
        profile = _get_user_profile_with_relations(db, current_user.user_id)
        if not profile:
            profile = UserProfile(user_id=current_user.user_id)
            db.add(profile)
            db.flush()
        
        # 기존 특징 관계 삭제
        db.query(UserProfileUserType).filter(
            UserProfileUserType.profile_id == profile.profile_id
        ).delete()
        
        # 새로운 특징 관계 생성
        for user_type_id in request.user_type_ids:
            profile_user_type = UserProfileUserType(
                profile_id=profile.profile_id,
                user_type_id=user_type_id
            )
            db.add(profile_user_type)
        
        profile.updated_at = datetime.utcnow()
        db.commit()
        
        return MessageResponse(message="특징 정보가 수정되었습니다.")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"특징 정보 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="특징 정보 수정 중 오류가 발생했습니다."
        )


@router.put("/me/password", response_model=MessageResponse)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    비밀번호 변경
    
    - 현재 비밀번호 확인
    - 새 비밀번호로 변경
    - 소셜 로그인 사용자는 비밀번호가 없을 수 있음
    """
    try:
        # 소셜 로그인 사용자 확인
        if not current_user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다."
            )
        
        # 현재 비밀번호 확인
        if not verify_password(request.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="현재 비밀번호가 올바르지 않습니다."
            )
        
        # 새 비밀번호로 변경
        current_user.password_hash = get_password_hash(request.new_password)
        current_user.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(current_user)
        
        return MessageResponse(message="비밀번호가 변경되었습니다.")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"비밀번호 변경 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="비밀번호 변경 중 오류가 발생했습니다."
        )


@router.put("/me/email", response_model=MessageResponse)
async def change_email(
    request: ChangeEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    이메일 변경
    
    - 현재 비밀번호 확인
    - 새 이메일로 변경
    - 이메일 중복 확인
    - 소셜 로그인 사용자는 이메일을 변경할 수 없음
    """
    try:
        # 소셜 로그인 사용자 확인
        if not current_user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="소셜 로그인 사용자는 이메일을 변경할 수 없습니다."
            )
        
        # 현재 비밀번호 확인
        if not verify_password(request.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="현재 비밀번호가 올바르지 않습니다."
            )
        
        # 새 이메일이 현재 이메일과 같은지 확인
        if request.new_email == current_user.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="새 이메일이 현재 이메일과 동일합니다."
            )
        
        # 이메일 중복 확인
        existing_user = db.query(User).filter(
            User.email == request.new_email,
            User.user_id != current_user.user_id,
            User.deleted_at.is_(None)  # Soft Delete된 사용자 제외
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 사용 중인 이메일입니다."
            )
        
        # 이메일 변경
        current_user.email = request.new_email
        current_user.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(current_user)
        
        return MessageResponse(message="이메일이 변경되었습니다.")
        
    except HTTPException:
        raise
    except IntegrityError as e:
        db.rollback()
        logger.error(f"이메일 변경 오류 (IntegrityError): {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이메일 변경 중 오류가 발생했습니다."
        )
    except Exception as e:
        db.rollback()
        logger.error(f"이메일 변경 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="이메일 변경 중 오류가 발생했습니다."
        )


@router.delete("/me", response_model=MessageResponse)
async def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    회원 탈퇴 (Soft Delete)
    
    - deleted_at 필드에 현재 시간 설정
    - 실제 데이터는 삭제되지 않음 (복구 가능)
    """
    try:
        # Soft Delete: deleted_at 설정
        current_user.deleted_at = datetime.utcnow()
        current_user.is_active = False
        current_user.updated_at = datetime.utcnow()
        
        db.commit()
        
        return MessageResponse(message="회원 탈퇴가 완료되었습니다.")
        
    except Exception as e:
        db.rollback()
        logger.error(f"회원 탈퇴 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="회원 탈퇴 중 오류가 발생했습니다."
        )


@router.get("/search", response_model=UserSearchListResponse)
async def search_users(
    query: str = Query(..., min_length=1, description="검색할 닉네임 또는 고유 코드"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    사용자 검색 (닉네임 또는 고유 코드로 검색)
    
    - 닉네임 또는 고유 코드로 사용자 검색
    - Soft Delete된 사용자 제외
    - 비활성화된 사용자 제외
    - 페이지네이션 지원
    """
    try:
        # 검색 쿼리: 닉네임 또는 고유 코드에 검색어가 포함된 사용자
        search_query = db.query(User).filter(
            and_(
                or_(
                    User.nickname.ilike(f"%{query}%"),
                    User.unique_code.ilike(f"%{query}%")
                ),
                User.deleted_at.is_(None),  # Soft Delete 필터링
                User.is_active == True,
                User.user_id != current_user.user_id  # 자기 자신 제외
            )
        )
        
        # 총 개수 계산
        total = search_query.count()
        
        # 페이지네이션 (관계 데이터 미리 로드하여 N+1 쿼리 방지)
        offset = (page - 1) * page_size
        users = search_query.options(
            joinedload(User.selected_achievement)
        ).order_by(desc(User.last_login_at), desc(User.created_at))\
            .offset(offset)\
            .limit(page_size)\
            .all()
        
        # 응답 생성 (선택한 칭호 포함)
        user_responses = []
        for user in users:
            # joinedload로 이미 로드된 관계 사용
            selected_achievement_data = None
            if user.selected_achievement:
                from app.schemas.achievements import AchievementResponse
                selected_achievement_data = AchievementResponse.model_validate(user.selected_achievement)
            
            user_responses.append(
                UserSearchResponse(
                    user_id=user.user_id,
                    nickname=user.nickname,
                    profile_image_url=user.profile_image_url,
                    selected_achievement=selected_achievement_data
                )
            )
        
        total_pages = (total + page_size - 1) // page_size
        
        return UserSearchListResponse(
            users=user_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    except Exception as e:
        logger.error(f"사용자 검색 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="사용자 검색 중 오류가 발생했습니다."
        )

