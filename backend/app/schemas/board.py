"""
게시판 관련 Pydantic 스키마
게시글, 댓글, 좋아요 등의 스키마 정의
"""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ========== 게시글 신고 스키마 ==========

class PostReportCreate(BaseModel):
    """게시글 신고 요청 스키마"""
    reason: str = Field(..., description="신고 사유")
    details: Optional[str] = Field(None, description="상세 사유")

    class Config:
        json_schema_extra = {
            "example": {
                "reason": "욕설/비방",
                "details": "부적절한 언어를 사용했습니다."
            }
        }


# ========== 게시글 스키마 ==========

class PostCreate(BaseModel):
    """게시글 작성 요청 스키마"""
    title: str = Field(..., min_length=1, max_length=300, description="게시글 제목")
    content: str = Field(..., min_length=1, description="게시글 내용")
    category: str = Field(default="general", description="카테고리 (tip, question, free, general)")
    manual_tags: Optional[List[str]] = Field(default=None, description="사용자가 직접 추가한 태그")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "피아노 연습 팁",
                "content": "오늘은 스케일 연습을 하면서...",
                "category": "tip",
                "manual_tags": ["연습", "피아노"]
            }
        }


class PostUpdate(BaseModel):
    """게시글 수정 요청 스키마"""
    title: Optional[str] = Field(None, min_length=1, max_length=300, description="게시글 제목")
    content: Optional[str] = Field(None, min_length=1, description="게시글 내용")
    category: Optional[str] = Field(None, description="카테고리 (tip, question, free, general)")
    manual_tags: Optional[List[str]] = Field(default=None, description="사용자가 직접 추가한 태그")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "수정된 제목",
                "content": "수정된 내용",
                "category": "question",
                "manual_tags": ["질문"]
            }
        }


class PostAuthorResponse(BaseModel):
    """게시글 작성자 정보 응답 스키마"""
    user_id: int
    nickname: str
    profile_image_url: Optional[str] = None
    selected_achievement: Optional[AchievementResponse] = None  # 선택한 칭호 정보

    class Config:
        from_attributes = True


class PostResponse(BaseModel):
    """게시글 응답 스키마"""
    post_id: int
    user_id: int
    author: PostAuthorResponse
    title: str
    content: str
    category: str
    tags: Optional[List[str]] = None  # manual_tags (이전에 manual_tags로 저장된 태그)
    view_count: int
    like_count: int
    comment_count: int = 0  # 댓글 수 (대댓글 포함)
    is_liked: bool = False  # 현재 사용자가 좋아요를 눌렀는지 여부
    is_bookmarked: bool = False  # 현재 사용자가 북마크를 했는지 여부
    is_reported: bool = False  # 현재 사용자가 신고를 했는지 여부
    created_at: datetime
    updated_at: Optional[datetime] = None  # 수정된 적이 없으면 None

    class Config:
        from_attributes = True


class PostListResponse(BaseModel):
    """게시글 목록 응답 스키마"""
    posts: List[PostResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    class Config:
        json_schema_extra = {
            "example": {
                "posts": [],
                "total": 0,
                "page": 1,
                "page_size": 20,
                "total_pages": 0
            }
        }


# ========== 댓글 스키마 ==========

class CommentCreate(BaseModel):
    """댓글 작성 요청 스키마"""
    content: str = Field(..., min_length=1, description="댓글 내용")
    parent_comment_id: Optional[int] = Field(None, description="부모 댓글 ID (답글인 경우)")

    class Config:
        json_schema_extra = {
            "example": {
                "content": "좋은 글 감사합니다!",
                "parent_comment_id": None
            }
        }


class CommentUpdate(BaseModel):
    """댓글 수정 요청 스키마"""
    content: str = Field(..., min_length=1, description="댓글 내용")

    class Config:
        json_schema_extra = {
            "example": {
                "content": "수정된 댓글 내용"
            }
        }


class CommentResponse(BaseModel):
    """댓글 응답 스키마"""
    comment_id: int
    post_id: int
    user_id: int
    author: PostAuthorResponse
    parent_comment_id: Optional[int] = None
    content: str
    like_count: int
    is_liked: bool = False  # 현재 사용자가 좋아요를 눌렀는지 여부
    replies: List['CommentResponse'] = []  # 답글 목록
    deleted_at: Optional[datetime] = None  # 삭제된 댓글인 경우 삭제 시간
    created_at: datetime
    updated_at: Optional[datetime] = None  # 수정된 적이 없으면 None

    class Config:
        from_attributes = True


# Forward reference 해결을 위한 import 및 model_rebuild
from app.schemas.achievements import AchievementResponse
PostAuthorResponse.model_rebuild()
CommentResponse.model_rebuild()


class CommentListResponse(BaseModel):
    """댓글 목록 응답 스키마"""
    comments: List[CommentResponse]
    total: int

    class Config:
        json_schema_extra = {
            "example": {
                "comments": [],
                "total": 0
            }
        }


# ========== 좋아요 스키마 ==========

class LikeResponse(BaseModel):
    """좋아요 응답 스키마"""
    is_liked: bool = Field(..., description="좋아요 상태 (true: 좋아요, false: 좋아요 취소)")
    like_count: int = Field(..., description="좋아요 개수")

    class Config:
        json_schema_extra = {
            "example": {
                "is_liked": True,
                "like_count": 10
            }
        }


class BookmarkResponse(BaseModel):
    """북마크 응답 스키마"""
    is_bookmarked: bool = Field(..., description="북마크 상태 (true: 추가됨, false: 삭제됨)")

    class Config:
        json_schema_extra = {
            "example": {
                "is_bookmarked": True
            }
        }


# ========== 메시지 응답 스키마 ==========

class MessageResponse(BaseModel):
    """일반 메시지 응답 스키마"""
    message: str

    class Config:
        json_schema_extra = {
            "example": {
                "message": "작업이 완료되었습니다."
            }
        }

