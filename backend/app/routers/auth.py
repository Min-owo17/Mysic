"""
인증 관련 API 라우터
회원가입, 로그인, 로그아웃, 현재 사용자 조회 기능 제공
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.models.user import User, UserProfile
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    UserResponse,
    MessageResponse
)

router = APIRouter(prefix="/api/auth", tags=["인증"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    회원가입
    
    - 이메일 중복 확인
    - 비밀번호 해싱
    - 사용자 및 프로필 생성
    - JWT 토큰 발급
    """
    # 이메일 중복 확인
    existing_user = db.query(User).filter(
        User.email == request.email,
        User.deleted_at.is_(None)  # Soft Delete된 사용자 제외
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 등록된 이메일입니다."
        )
    
    # 닉네임 중복 확인
    existing_nickname = db.query(User).filter(
        User.nickname == request.nickname,
        User.deleted_at.is_(None)  # Soft Delete된 사용자 제외
    ).first()
    
    if existing_nickname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 닉네임입니다."
        )
    
    try:
        # 비밀번호 해싱
        password_hash = get_password_hash(request.password)
        
        # 사용자 생성
        new_user = User(
            email=request.email,
            password_hash=password_hash,
            nickname=request.nickname,
            is_active=True
        )
        db.add(new_user)
        db.flush()  # user_id를 얻기 위해 flush
        
        # 프로필 생성 (기본 프로필)
        new_profile = UserProfile(
            user_id=new_user.user_id,
            bio=None,
            hashtags=None
        )
        db.add(new_profile)
        
        db.commit()
        db.refresh(new_user)
        
        # JWT 토큰 생성
        access_token = create_access_token(data={"sub": new_user.user_id})
        
        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(new_user)
        )
        
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="회원가입 중 오류가 발생했습니다."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 오류가 발생했습니다."
        )


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    로그인
    
    - 이메일/비밀번호 확인
    - last_login_at 업데이트
    - JWT 토큰 발급
    """
    # 사용자 조회 (Soft Delete 제외)
    user = db.query(User).filter(
        User.email == request.email,
        User.deleted_at.is_(None)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 비밀번호 확인
    if not user.password_hash or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 활성 상태 확인
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="비활성화된 계정입니다."
        )
    
    # last_login_at 업데이트
    user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    # JWT 토큰 생성
    access_token = create_access_token(data={"sub": user.user_id})
    
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    current_user: User = Depends(get_current_user)
):
    """
    로그아웃
    
    주의: JWT는 stateless이므로 서버에서 토큰을 무효화할 수 없습니다.
    클라이언트에서 토큰을 삭제하도록 안내합니다.
    """
    return MessageResponse(message="로그아웃되었습니다.")


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    현재 로그인한 사용자 정보 조회
    
    - JWT 토큰에서 사용자 정보 추출
    - 사용자 정보 반환
    """
    return UserResponse.model_validate(current_user)

