"""
사용자 관리 관련 Pydantic 스키마
프로필 조회, 수정, 악기/특징 관리 등의 스키마 정의
"""
from __future__ import annotations
from pydantic import BaseModel, Field, EmailStr, model_validator
from typing import Optional, List
from datetime import datetime


class InstrumentResponse(BaseModel):
    """악기 정보 응답 스키마"""
    instrument_id: int
    name: str
    display_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserTypeResponse(BaseModel):
    """사용자 특징 정보 응답 스키마"""
    user_type_id: int
    name: str
    display_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfileInstrumentResponse(BaseModel):
    """사용자 프로필 악기 정보 응답 스키마"""
    instrument_id: int
    instrument_name: str
    is_primary: bool

    class Config:
        from_attributes = True


class UserProfileUserTypeResponse(BaseModel):
    """사용자 프로필 특징 정보 응답 스키마"""
    user_type_id: int
    user_type_name: str

    class Config:
        from_attributes = True


class UserProfileResponse(BaseModel):
    """사용자 프로필 응답 스키마"""
    profile_id: int
    user_id: int
    bio: Optional[str] = None
    hashtags: Optional[List[str]] = None
    instruments: List[UserProfileInstrumentResponse] = []
    user_types: List[UserProfileUserTypeResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserDetailResponse(BaseModel):
    """사용자 상세 정보 응답 스키마 (프로필 포함)"""
    user_id: int
    email: str
    nickname: str
    unique_code: str
    profile_image_url: Optional[str] = None
    is_active: bool
    is_admin: bool
    membership_tier: str = "FREE"
    last_login_at: Optional[datetime] = None
    selected_achievement_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    profile: Optional[UserProfileResponse] = None
    selected_achievement: Optional[AchievementResponse] = None  # 선택한 칭호 정보

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    """프로필 수정 요청 스키마"""
    nickname: Optional[str] = Field(None, min_length=1, max_length=100, description="닉네임 (1-100자)")
    profile_image_url: Optional[str] = Field(None, max_length=100000, description="프로필 이미지 URL 또는 base64 Data URL (최적화된 WebP 이미지, 약 100KB 이하)")
    bio: Optional[str] = Field(None, description="자기소개")
    hashtags: Optional[List[str]] = Field(None, description="해시태그 목록")
    
    @model_validator(mode='before')
    @classmethod
    def convert_empty_strings_to_none(cls, data):
        """빈 문자열을 None으로 변환하여 유효성 검사 통과"""
        if isinstance(data, dict):
            # 빈 문자열을 None으로 변환
            if 'nickname' in data and data['nickname'] == '':
                data['nickname'] = None
            if 'profile_image_url' in data and data['profile_image_url'] == '':
                data['profile_image_url'] = None
            if 'bio' in data and data['bio'] == '':
                data['bio'] = None
        return data

    class Config:
        json_schema_extra = {
            "example": {
                "nickname": "새로운닉네임",
                "profile_image_url": "https://example.com/image.jpg",
                "bio": "안녕하세요!",
                "hashtags": ["#피아노", "#클래식"]
            }
        }


class UpdateInstrumentsRequest(BaseModel):
    """악기 수정 요청 스키마"""
    instrument_ids: List[int] = Field(..., description="악기 ID 목록")
    primary_instrument_id: Optional[int] = Field(None, description="주요 악기 ID (instrument_ids에 포함되어야 함)")

    class Config:
        json_schema_extra = {
            "example": {
                "instrument_ids": [1, 2, 3],
                "primary_instrument_id": 1
            }
        }


class UpdateUserTypesRequest(BaseModel):
    """특징 수정 요청 스키마"""
    user_type_ids: List[int] = Field(..., description="특징 ID 목록")

    class Config:
        json_schema_extra = {
            "example": {
                "user_type_ids": [1, 2, 3]
            }
        }


class ChangePasswordRequest(BaseModel):
    """비밀번호 변경 요청 스키마"""
    current_password: str = Field(..., description="현재 비밀번호")
    new_password: str = Field(..., min_length=8, max_length=72, description="새 비밀번호 (8-72자)")

    class Config:
        json_schema_extra = {
            "example": {
                "current_password": "oldpassword123",
                "new_password": "newpassword123"
            }
        }


class ChangeEmailRequest(BaseModel):
    """이메일 변경 요청 스키마"""
    current_password: str = Field(..., description="현재 비밀번호 (변경 확인용)")
    new_email: EmailStr = Field(..., description="새 이메일 주소")

    class Config:
        json_schema_extra = {
            "example": {
                "current_password": "password123",
                "new_email": "newemail@example.com"
            }
        }


class MessageResponse(BaseModel):
    """일반 메시지 응답 스키마"""
    message: str

    class Config:
        json_schema_extra = {
            "example": {
                "message": "프로필이 수정되었습니다."
            }
        }


class UserSearchResponse(BaseModel):
    """사용자 검색 응답 스키마"""
    user_id: int
    nickname: str
    profile_image_url: Optional[str] = None
    selected_achievement: Optional[AchievementResponse] = None  # 선택한 칭호 정보

    class Config:
        from_attributes = True


class UserSearchListResponse(BaseModel):
    """사용자 검색 목록 응답 스키마"""
    users: List[UserSearchResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    class Config:
        json_schema_extra = {
            "example": {
                "users": [],
                "total": 0,
                "page": 1,
                "page_size": 20,
                "total_pages": 0
            }
        }


# Forward reference 해결을 위한 import 및 model_rebuild
from app.schemas.achievements import AchievementResponse
UserDetailResponse.model_rebuild()
UserSearchResponse.model_rebuild()
