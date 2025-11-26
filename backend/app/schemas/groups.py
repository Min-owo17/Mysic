"""
그룹 관련 Pydantic 스키마
그룹 생성, 조회, 멤버 관리 등의 스키마 정의
"""
from pydantic import BaseModel, Field
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from app.schemas.achievements import AchievementResponse


# ========== 그룹 스키마 ==========

class GroupCreate(BaseModel):
    """그룹 생성 요청 스키마"""
    group_name: str = Field(..., min_length=1, max_length=200, description="그룹 이름")
    description: Optional[str] = Field(None, description="그룹 설명")
    is_public: bool = Field(default=False, description="공개 그룹 여부")
    max_members: int = Field(default=50, ge=1, le=1000, description="최대 멤버 수")

    class Config:
        json_schema_extra = {
            "example": {
                "group_name": "피아노 연습 모임",
                "description": "피아노를 연주하는 분들을 위한 그룹입니다.",
                "is_public": True,
                "max_members": 50
            }
        }


class GroupUpdate(BaseModel):
    """그룹 수정 요청 스키마"""
    group_name: Optional[str] = Field(None, min_length=1, max_length=200, description="그룹 이름")
    description: Optional[str] = Field(None, description="그룹 설명")
    is_public: Optional[bool] = Field(None, description="공개 그룹 여부")
    max_members: Optional[int] = Field(None, ge=1, le=1000, description="최대 멤버 수")

    class Config:
        json_schema_extra = {
            "example": {
                "group_name": "수정된 그룹 이름",
                "description": "수정된 그룹 설명",
                "is_public": False,
                "max_members": 100
            }
        }


class GroupOwnerResponse(BaseModel):
    """그룹 소유자 정보 응답 스키마"""
    user_id: int
    nickname: str
    profile_image_url: Optional[str] = None
    selected_achievement: Optional["AchievementResponse"] = None  # 선택한 칭호 정보

    class Config:
        from_attributes = True


class GroupMemberResponse(BaseModel):
    """그룹 멤버 정보 응답 스키마"""
    member_id: int
    user_id: int
    nickname: str
    profile_image_url: Optional[str] = None
    selected_achievement: Optional["AchievementResponse"] = None  # 선택한 칭호 정보
    role: str  # 'owner', 'admin', 'member'
    joined_at: datetime

    class Config:
        from_attributes = True


class GroupResponse(BaseModel):
    """그룹 응답 스키마"""
    group_id: int
    group_name: str
    description: Optional[str] = None
    owner_id: int
    owner: GroupOwnerResponse
    is_public: bool
    max_members: int
    member_count: int  # 현재 멤버 수
    current_user_role: Optional[str] = None  # 현재 사용자의 역할 (가입하지 않았으면 None)
    is_member: bool = False  # 현재 사용자가 멤버인지 여부
    created_at: datetime

    class Config:
        from_attributes = True


class GroupListResponse(BaseModel):
    """그룹 목록 응답 스키마"""
    groups: List[GroupResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    class Config:
        json_schema_extra = {
            "example": {
                "groups": [],
                "total": 0,
                "page": 1,
                "page_size": 20,
                "total_pages": 0
            }
        }


class GroupMemberListResponse(BaseModel):
    """그룹 멤버 목록 응답 스키마"""
    members: List[GroupMemberResponse]
    total: int

    class Config:
        json_schema_extra = {
            "example": {
                "members": [],
                "total": 0
            }
        }


class MessageResponse(BaseModel):
    """일반 메시지 응답 스키마"""
    message: str

    class Config:
        json_schema_extra = {
            "example": {
                "message": "작업이 성공적으로 완료되었습니다."
            }
        }


# ========== 그룹 초대 스키마 ==========

class GroupInvitationCreate(BaseModel):
    """그룹 초대 생성 요청 스키마"""
    invitee_id: int = Field(..., description="초대받을 사용자 ID")

    class Config:
        json_schema_extra = {
            "example": {
                "invitee_id": 2
            }
        }


class GroupInvitationInviterResponse(BaseModel):
    """초대자 정보 응답 스키마"""
    user_id: int
    nickname: str
    profile_image_url: Optional[str] = None
    selected_achievement: Optional["AchievementResponse"] = None  # 선택한 칭호 정보

    class Config:
        from_attributes = True


class GroupInvitationInviteeResponse(BaseModel):
    """초대받은 사용자 정보 응답 스키마"""
    user_id: int
    nickname: str
    profile_image_url: Optional[str] = None
    selected_achievement: Optional["AchievementResponse"] = None  # 선택한 칭호 정보

    class Config:
        from_attributes = True


class GroupInvitationGroupResponse(BaseModel):
    """초대된 그룹 정보 응답 스키마"""
    group_id: int
    group_name: str
    description: Optional[str] = None
    is_public: bool

    class Config:
        from_attributes = True


class GroupInvitationResponse(BaseModel):
    """그룹 초대 응답 스키마"""
    invitation_id: int
    group_id: int
    group: GroupInvitationGroupResponse
    inviter_id: int
    inviter: GroupInvitationInviterResponse
    invitee_id: int
    invitee: GroupInvitationInviteeResponse
    status: str  # 'pending', 'accepted', 'declined', 'expired'
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GroupInvitationListResponse(BaseModel):
    """그룹 초대 목록 응답 스키마"""
    invitations: List[GroupInvitationResponse]
    total: int

    class Config:
        json_schema_extra = {
            "example": {
                "invitations": [],
                "total": 0
            }
        }

