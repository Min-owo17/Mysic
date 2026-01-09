"""
칭호 관련 Pydantic 스키마
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AchievementResponse(BaseModel):
    """칭호 정보 응답 스키마"""
    achievement_id: int
    title: str
    description: Optional[str]
    condition_type: Optional[str]  # 'practice_time', 'consecutive_days', 'instrument_count'
    condition_value: Optional[int]
    icon_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class UserAchievementResponse(BaseModel):
    """사용자 칭호 획득 정보 응답 스키마"""
    user_achievement_id: int
    user_id: int
    achievement_id: int
    earned_at: datetime
    achievement: AchievementResponse

    class Config:
        from_attributes = True


class AchievementListResponse(BaseModel):
    """칭호 목록 응답 스키마"""
    achievements: List[AchievementResponse]
    total: int


class UserAchievementListResponse(BaseModel):
    """사용자 칭호 목록 응답 스키마"""
    user_achievements: List[UserAchievementResponse]
    total: int


class AchievementCreate(BaseModel):
    """칭호 생성 요청 스키마"""
    title: str
    description: Optional[str] = None
    condition_type: Optional[str] = None
    condition_value: Optional[int] = None
    icon_url: Optional[str] = None


class AchievementUpdate(BaseModel):
    """칭호 수정 요청 스키마"""
    title: Optional[str] = None
    description: Optional[str] = None
    condition_type: Optional[str] = None
    condition_value: Optional[int] = None
    icon_url: Optional[str] = None




