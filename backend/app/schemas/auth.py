"""
인증 관련 Pydantic 스키마
회원가입, 로그인, 토큰 응답 등의 스키마 정의
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class RegisterRequest(BaseModel):
    """회원가입 요청 스키마"""
    email: EmailStr = Field(..., description="이메일 주소")
    password: str = Field(..., min_length=8, max_length=72, description="비밀번호 (8-72자)")
    nickname: str = Field(..., min_length=1, max_length=100, description="닉네임 (1-100자)")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "password123",
                "nickname": "사용자닉네임"
            }
        }


class LoginRequest(BaseModel):
    """로그인 요청 스키마"""
    email: EmailStr = Field(..., description="이메일 주소")
    password: str = Field(..., description="비밀번호")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "password123"
            }
        }


class TokenResponse(BaseModel):
    """토큰 응답 스키마"""
    access_token: str = Field(..., description="JWT 액세스 토큰")
    token_type: str = Field(default="bearer", description="토큰 타입")

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer"
            }
        }


class UserResponse(BaseModel):
    """사용자 정보 응답 스키마"""
    user_id: int
    email: str
    nickname: str
    unique_code: str
    profile_image_url: Optional[str] = None
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "email": "user@example.com",
                "nickname": "사용자닉네임",
                "unique_code": "aB3cD5eF7gH9i",
                "profile_image_url": None,
                "is_active": True,
                "last_login_at": "2024-01-01T00:00:00",
                "created_at": "2024-01-01T00:00:00"
            }
        }


class AuthResponse(BaseModel):
    """인증 응답 스키마 (토큰 + 사용자 정보)"""
    access_token: str
    token_type: str
    user: UserResponse

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "user_id": 1,
                    "email": "user@example.com",
                    "nickname": "사용자닉네임",
                    "unique_code": "aB3cD5eF7gH9i",
                    "profile_image_url": None,
                    "is_active": True,
                    "last_login_at": "2024-01-01T00:00:00",
                    "created_at": "2024-01-01T00:00:00"
                }
            }
        }


class MessageResponse(BaseModel):
    """일반 메시지 응답 스키마"""
    message: str

    class Config:
        json_schema_extra = {
            "example": {
                "message": "로그아웃되었습니다."
            }
        }

