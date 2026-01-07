from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NotificationBase(BaseModel):
    type: str
    post_id: Optional[int] = None
    comment_id: Optional[int] = None
    content: Optional[str] = None


class NotificationResponse(NotificationBase):
    notification_id: int
    receiver_id: int
    sender_id: Optional[int] = None
    sender_nickname: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationRead(BaseModel):
    is_read: bool


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int
