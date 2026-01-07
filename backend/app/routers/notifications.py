from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationListResponse, NotificationResponse, NotificationRead
from app.schemas.board import MessageResponse

router = APIRouter(prefix="/api/notifications", tags=["알림"])


@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    현재 사용자의 알림 목록 조회
    """
    notifications = db.query(Notification).filter(
        Notification.receiver_id == current_user.user_id
    ).order_by(desc(Notification.created_at)).limit(50).all()
    
    unread_count = db.query(func.count(Notification.notification_id)).filter(
        Notification.receiver_id == current_user.user_id,
        Notification.is_read == False
    ).scalar()
    
    return NotificationListResponse(
        notifications=[
            NotificationResponse(
                notification_id=n.notification_id,
                receiver_id=n.receiver_id,
                sender_id=n.sender_id,
                sender_nickname=n.sender.nickname if n.sender else None,
                type=n.type,
                post_id=n.post_id,
                comment_id=n.comment_id,
                content=n.content,
                is_read=n.is_read,
                created_at=n.created_at
            ) for n in notifications
        ],
        unread_count=unread_count or 0
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    특정 알림 읽음 처리
    """
    notification = db.query(Notification).filter(
        Notification.notification_id == notification_id,
        Notification.receiver_id == current_user.user_id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="알림을 찾을 수 없습니다."
        )
    
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    
    return NotificationResponse(
        notification_id=notification.notification_id,
        receiver_id=notification.receiver_id,
        sender_id=notification.sender_id,
        sender_nickname=notification.sender.nickname if notification.sender else None,
        type=notification.type,
        post_id=notification.post_id,
        comment_id=notification.comment_id,
        content=notification.content,
        is_read=notification.is_read,
        created_at=notification.created_at
    )


@router.post("/read-all", response_model=MessageResponse)
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    모든 알림 읽음 처리
    """
    db.query(Notification).filter(
        Notification.receiver_id == current_user.user_id,
        Notification.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    
    return MessageResponse(message="모든 알림이 읽음 처리되었습니다.")
