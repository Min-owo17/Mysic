from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


from app.schemas.users import UserSearchResponse

class SupportCreate(BaseModel):
    """고객 지원 문의/제안 생성 요청 스키마"""
    type: str = Field(..., description="'inquiry'(문의) 또는 'suggestion'(제안)")
    title: str = Field(..., min_length=1, max_length=200, description="제목")
    content: str = Field(..., min_length=1, description="상세 내용")

    class Config:
        json_schema_extra = {
            "example": {
                "type": "inquiry",
                "title": "연습 기록이 사라졌어요",
                "content": "어제 기록한 세션이 목록에 보이지 않습니다."
            }
        }


class AdminAnswer(BaseModel):
    """관리자 답변 등록 요청 스키마"""
    answer_content: str = Field(..., min_length=1, description="답변 내용")


class SupportResponse(BaseModel):
    """고객 지원 응답 스키마"""
    support_id: int
    user_id: int
    type: str
    title: str
    content: str
    status: str
    answer_content: Optional[str] = None
    answered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: Optional[UserSearchResponse] = None

    class Config:
        from_attributes = True


class SupportListResponse(BaseModel):
    """고객 지원 목록 응답 스키마"""
    supports: List[SupportResponse]
    total: int

