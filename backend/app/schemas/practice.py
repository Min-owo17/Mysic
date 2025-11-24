"""
연습 기록 관련 스키마
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class PracticeSessionCreate(BaseModel):
    """연습 세션 시작 요청"""
    practice_date: date = Field(..., description="연습 날짜")
    instrument: Optional[str] = Field(None, max_length=100, description="악기 이름")
    notes: Optional[str] = Field(None, description="메모")

    class Config:
        json_schema_extra = {
            "example": {
                "practice_date": "2024-01-15",
                "instrument": "피아노",
                "notes": "오늘은 스케일 연습을 했다."
            }
        }


class PracticeSessionUpdate(BaseModel):
    """연습 세션 종료 요청"""
    end_time: Optional[datetime] = Field(None, description="종료 시간 (서버 시간 사용 시 생략 가능)")
    actual_play_time: Optional[int] = Field(None, ge=0, description="실제 연주 시간 (초 단위)")
    instrument: Optional[str] = Field(None, max_length=100, description="악기 이름")
    notes: Optional[str] = Field(None, description="메모")

    class Config:
        json_schema_extra = {
            "example": {
                "end_time": "2024-01-15T15:30:00",
                "actual_play_time": 3600,
                "instrument": "피아노",
                "notes": "오늘은 스케일 연습을 했다."
            }
        }


class PracticeSessionResponse(BaseModel):
    """연습 세션 응답"""
    session_id: int
    user_id: int
    practice_date: date
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    actual_play_time: int
    status: str
    instrument: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class PracticeStatisticsResponse(BaseModel):
    """연습 통계 응답"""
    total_practice_time: int = Field(..., description="총 연습 시간 (초)")
    total_sessions: int = Field(..., description="총 연습 횟수")
    consecutive_days: int = Field(..., description="연속 연습 일수")
    last_practice_date: Optional[date] = Field(None, description="마지막 연습 날짜")
    average_session_time: Optional[float] = Field(None, description="평균 세션 시간 (초)")

    class Config:
        json_schema_extra = {
            "example": {
                "total_practice_time": 36000,
                "total_sessions": 10,
                "consecutive_days": 5,
                "last_practice_date": "2024-01-15",
                "average_session_time": 3600.0
            }
        }


class PracticeSessionListResponse(BaseModel):
    """연습 기록 목록 응답"""
    sessions: list[PracticeSessionResponse]
    total: int
    page: int = 1
    page_size: int = 20

    class Config:
        json_schema_extra = {
            "example": {
                "sessions": [],
                "total": 0,
                "page": 1,
                "page_size": 20
            }
        }


class WeeklyAveragePracticeResponse(BaseModel):
    """주간 평균 연습 시간 응답"""
    daily_averages: list[int] = Field(..., description="일별 평균 연습 시간 (초), 7일치 [일, 월, 화, 수, 목, 금, 토]")
    consistency_percentage: int = Field(..., description="매일 연습한 사용자 비율 (%)", ge=0, le=100)
    total_users: int = Field(..., description="비교 대상 사용자 수")

    class Config:
        json_schema_extra = {
            "example": {
                "daily_averages": [2700, 2100, 2400, 2800, 2500, 4200, 4800],
                "consistency_percentage": 23,
                "total_users": 10
            }
        }
