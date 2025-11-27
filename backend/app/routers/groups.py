"""
그룹 API 라우터
그룹 생성, 조회, 가입, 탈퇴, 멤버 관리 기능 제공
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, func, case
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.group import Group, GroupMember, GroupInvitation
from app.models.achievement import Achievement
from app.models.practice import PracticeSession
from datetime import date, timedelta
from app.schemas.groups import (
    GroupCreate,
    GroupUpdate,
    GroupResponse,
    GroupListResponse,
    GroupMemberResponse,
    GroupMemberListResponse,
    GroupOwnerResponse,
    MessageResponse,
    GroupInvitationCreate,
    GroupInvitationResponse,
    GroupInvitationListResponse,
    GroupInvitationGroupResponse,
    GroupInvitationInviterResponse,
    GroupInvitationInviteeResponse,
    GroupStatisticsResponse,
    GroupMemberStatisticsResponse,
    GroupMemberStatisticsListResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/groups", tags=["그룹"])


def _build_group_response(
    group: Group,
    current_user_id: Optional[int] = None,
    db: Optional[Session] = None
) -> GroupResponse:
    """
    Group 모델을 GroupResponse로 변환
    
    Args:
        group: Group 모델 객체
        current_user_id: 현재 사용자 ID (멤버 여부 확인용)
        db: 데이터베이스 세션 (멤버 수 계산용)
    
    Returns:
        GroupResponse: 그룹 응답 객체
    """
    # 소유자 정보 (선택한 칭호 포함)
    selected_achievement_data = None
    if group.owner.selected_achievement_id:
        selected_achievement = db.query(Achievement).filter(
            Achievement.achievement_id == group.owner.selected_achievement_id
        ).first() if db else None
        if selected_achievement:
            from app.schemas.achievements import AchievementResponse
            selected_achievement_data = AchievementResponse.model_validate(selected_achievement)
    
    owner = GroupOwnerResponse(
        user_id=group.owner.user_id,
        nickname=group.owner.nickname,
        profile_image_url=group.owner.profile_image_url,
        selected_achievement=selected_achievement_data
    )
    
    # 멤버 수 계산
    if db:
        member_count = db.query(GroupMember).filter(
            GroupMember.group_id == group.group_id
        ).count()
    else:
        member_count = len(group.members) if group.members else 0
    
    # 현재 사용자의 멤버 여부 및 역할 확인
    is_member = False
    current_user_role = None
    if current_user_id:
        member = next(
            (m for m in group.members if m.user_id == current_user_id),
            None
        )
        if member:
            is_member = True
            current_user_role = member.role
    
    # UTC timezone 정보 추가
    created_at_aware = group.created_at
    if created_at_aware and created_at_aware.tzinfo is None:
        created_at_aware = created_at_aware.replace(tzinfo=timezone.utc)
    
    return GroupResponse(
        group_id=group.group_id,
        group_name=group.group_name,
        description=group.description,
        owner_id=group.owner_id,
        owner=owner,
        is_public=group.is_public,
        max_members=group.max_members,
        member_count=member_count,
        current_user_role=current_user_role,
        is_member=is_member,
        created_at=created_at_aware
    )


def _build_group_member_response(member: GroupMember, db: Session) -> GroupMemberResponse:
    """
    GroupMember 모델을 GroupMemberResponse로 변환
    
    Args:
        member: GroupMember 모델 객체
        db: 데이터베이스 세션
    
    Returns:
        GroupMemberResponse: 그룹 멤버 응답 객체
    """
    # 선택한 칭호 정보 조회
    selected_achievement_data = None
    if member.user.selected_achievement_id:
        selected_achievement = db.query(Achievement).filter(
            Achievement.achievement_id == member.user.selected_achievement_id
        ).first()
        if selected_achievement:
            from app.schemas.achievements import AchievementResponse
            selected_achievement_data = AchievementResponse.model_validate(selected_achievement)
    
    # UTC timezone 정보 추가
    joined_at_aware = member.joined_at
    if joined_at_aware and joined_at_aware.tzinfo is None:
        joined_at_aware = joined_at_aware.replace(tzinfo=timezone.utc)
    
    return GroupMemberResponse(
        member_id=member.member_id,
        user_id=member.user_id,
        nickname=member.user.nickname,
        profile_image_url=member.user.profile_image_url,
        selected_achievement=selected_achievement_data,
        role=member.role,
        joined_at=joined_at_aware
    )


@router.get("", response_model=GroupListResponse)
async def get_groups(
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    is_public: Optional[bool] = Query(None, description="공개 그룹 필터"),
    search: Optional[str] = Query(None, description="그룹 이름 검색"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    그룹 목록 조회
    - 공개 그룹 또는 내가 가입한 그룹을 조회합니다.
    """
    try:
        # 기본 쿼리: 공개 그룹 또는 내가 가입한 그룹
        query = db.query(Group).options(
            joinedload(Group.owner),
            joinedload(Group.members).joinedload(GroupMember.user)
        ).filter(
            or_(
                Group.is_public == True,
                Group.group_id.in_(
                    db.query(GroupMember.group_id).filter(
                        GroupMember.user_id == current_user.user_id
                    )
                )
            )
        )
        
        # 공개 그룹 필터
        if is_public is not None:
            query = query.filter(Group.is_public == is_public)
        
        # 검색 필터
        if search:
            query = query.filter(Group.group_name.ilike(f"%{search}%"))
        
        # 총 개수 계산
        total = query.count()
        
        # 페이지네이션
        offset = (page - 1) * page_size
        groups = query.order_by(desc(Group.created_at)).offset(offset).limit(page_size).all()
        
        # 응답 생성
        group_responses = [
            _build_group_response(group, current_user.user_id, db)
            for group in groups
        ]
        
        total_pages = (total + page_size - 1) // page_size
        
        return GroupListResponse(
            groups=group_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    except Exception as e:
        logger.error(f"그룹 목록 조회 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="그룹 목록을 조회하는 중 오류가 발생했습니다."
        )


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    group_data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    그룹 생성
    - 새 그룹을 생성하고 생성자를 owner로 추가합니다.
    """
    try:
        # 그룹 이름 중복 확인 (같은 사용자가 같은 이름의 그룹을 가진 경우)
        existing_group = db.query(Group).filter(
            and_(
                Group.group_name == group_data.group_name,
                Group.owner_id == current_user.user_id
            )
        ).first()
        
        if existing_group:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 같은 이름의 그룹을 소유하고 있습니다."
            )
        
        # 그룹 생성
        new_group = Group(
            group_name=group_data.group_name,
            description=group_data.description,
            owner_id=current_user.user_id,
            is_public=group_data.is_public,
            max_members=group_data.max_members
        )
        db.add(new_group)
        db.flush()  # group_id를 얻기 위해
        
        # 그룹 소유자를 멤버로 추가
        owner_member = GroupMember(
            group_id=new_group.group_id,
            user_id=current_user.user_id,
            role="owner"
        )
        db.add(owner_member)
        db.commit()
        db.refresh(new_group)
        
        # 관계 로드
        db.refresh(new_group)
        db.refresh(owner_member)
        
        logger.info(f"그룹 생성 완료: group_id={new_group.group_id}, owner_id={current_user.user_id}")
        
        return _build_group_response(new_group, current_user.user_id, db)
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"그룹 생성 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="그룹 생성 중 오류가 발생했습니다."
        )


# ========== 그룹 초대 API (경로 매칭 순서를 위해 먼저 정의) ==========

@router.get("/invitations", response_model=GroupInvitationListResponse)
async def get_group_invitations(
    status: Optional[str] = Query(None, description="초대 상태 필터 (pending, accepted, declined, expired)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    내가 받은 그룹 초대 목록 조회
    - 현재 사용자가 받은 초대만 조회합니다.
    - status 파라미터는 선택사항이며, 제공되지 않으면 모든 상태의 초대를 조회합니다.
    """
    try:
        query = db.query(GroupInvitation).options(
            joinedload(GroupInvitation.group),
            joinedload(GroupInvitation.inviter),
            joinedload(GroupInvitation.invitee)
        ).filter(
            GroupInvitation.invitee_id == current_user.user_id
        )
        
        # 상태 필터
        if status:
            if status not in ['pending', 'accepted', 'declined', 'expired']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="유효하지 않은 상태 값입니다."
                )
            query = query.filter(GroupInvitation.status == status)
        
        # 최신순 정렬
        invitations = query.order_by(desc(GroupInvitation.created_at)).all()
        
        invitation_responses = [
            _build_group_invitation_response(invitation, db)
            for invitation in invitations
        ]
        
        return GroupInvitationListResponse(
            invitations=invitation_responses,
            total=len(invitation_responses)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"그룹 초대 목록 조회 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="그룹 초대 목록을 조회하는 중 오류가 발생했습니다."
        )


@router.post("/invitations/{invitation_id}/accept", response_model=MessageResponse)
async def accept_group_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    그룹 초대 수락
    - 초대를 받은 사용자만 수락할 수 있습니다.
    - 수락 시 자동으로 그룹 멤버로 추가됩니다.
    """
    try:
        # 초대 조회
        invitation = db.query(GroupInvitation).options(
            joinedload(GroupInvitation.group)
        ).filter(GroupInvitation.invitation_id == invitation_id).first()
        
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="초대를 찾을 수 없습니다."
            )
        
        # 권한 확인: 초대받은 사용자만 수락 가능
        if invitation.invitee_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="초대를 받은 사용자만 수락할 수 있습니다."
            )
        
        # 상태 확인
        if invitation.status != 'pending':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"이미 처리된 초대입니다. (현재 상태: {invitation.status})"
            )
        
        # 그룹 조회
        group = invitation.group
        
        # 이미 멤버인지 확인
        existing_member = db.query(GroupMember).filter(
            and_(
                GroupMember.group_id == group.group_id,
                GroupMember.user_id == current_user.user_id
            )
        ).first()
        
        if existing_member:
            # 이미 멤버인 경우 초대 상태만 업데이트
            invitation.status = 'accepted'
            db.commit()
            logger.info(f"그룹 초대 수락 완료 (이미 멤버): invitation_id={invitation_id}")
            return MessageResponse(message="이미 그룹 멤버입니다.")
        
        # 멤버 수 확인
        current_member_count = db.query(GroupMember).filter(
            GroupMember.group_id == group.group_id
        ).count()
        
        if current_member_count >= group.max_members:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="그룹이 가득 찼습니다."
            )
        
        # 그룹 멤버로 추가
        new_member = GroupMember(
            group_id=group.group_id,
            user_id=current_user.user_id,
            role='member'
        )
        db.add(new_member)
        
        # 초대 상태 업데이트
        invitation.status = 'accepted'
        
        db.commit()
        
        logger.info(f"그룹 초대 수락 완료: invitation_id={invitation_id}, group_id={group.group_id}, user_id={current_user.user_id}")
        
        return MessageResponse(message="그룹 초대를 수락했습니다.")
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"그룹 초대 수락 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="그룹 초대 수락 중 오류가 발생했습니다."
        )


@router.post("/invitations/{invitation_id}/decline", response_model=MessageResponse)
async def decline_group_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    그룹 초대 거절
    - 초대를 받은 사용자만 거절할 수 있습니다.
    """
    try:
        # 초대 조회
        invitation = db.query(GroupInvitation).filter(
            GroupInvitation.invitation_id == invitation_id
        ).first()
        
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="초대를 찾을 수 없습니다."
            )
        
        # 권한 확인: 초대받은 사용자만 거절 가능
        if invitation.invitee_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="초대를 받은 사용자만 거절할 수 있습니다."
            )
        
        # 상태 확인
        if invitation.status != 'pending':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"이미 처리된 초대입니다. (현재 상태: {invitation.status})"
            )
        
        # 초대 상태 업데이트
        invitation.status = 'declined'
        db.commit()
        
        logger.info(f"그룹 초대 거절 완료: invitation_id={invitation_id}")
        
        return MessageResponse(message="그룹 초대를 거절했습니다.")
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"그룹 초대 거절 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="그룹 초대 거절 중 오류가 발생했습니다."
        )


# ========== 그룹 상세 조회 (경로 매칭 순서상 {group_id} 패턴은 나중에 정의) ==========

@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    그룹 상세 조회
    - 공개 그룹이거나 내가 가입한 그룹만 조회 가능합니다.
    """
    try:
        # 그룹 조회
        group = db.query(Group).options(
            joinedload(Group.owner),
            joinedload(Group.members).joinedload(GroupMember.user)
        ).filter(Group.group_id == group_id).first()
        
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="그룹을 찾을 수 없습니다."
            )
        
        # 권한 확인: 공개 그룹이거나 멤버여야 함
        is_member = db.query(GroupMember).filter(
            and_(
                GroupMember.group_id == group_id,
                GroupMember.user_id == current_user.user_id
            )
        ).first() is not None
        
        if not group.is_public and not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 그룹에 대한 접근 권한이 없습니다."
            )
        
        return _build_group_response(group, current_user.user_id, db)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"그룹 상세 조회 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="그룹 상세 정보를 조회하는 중 오류가 발생했습니다."
        )


@router.post("/{group_id}/join", response_model=MessageResponse)
async def join_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    그룹 가입
    - 공개 그룹이거나 초대받은 그룹에 가입할 수 있습니다.
    """
    try:
        # 그룹 조회
        group = db.query(Group).filter(Group.group_id == group_id).first()
        
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="그룹을 찾을 수 없습니다."
            )
        
        # 이미 멤버인지 확인
        existing_member = db.query(GroupMember).filter(
            and_(
                GroupMember.group_id == group_id,
                GroupMember.user_id == current_user.user_id
            )
        ).first()
        
        if existing_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 가입한 그룹입니다."
            )
        
        # 공개 그룹이거나 초대를 받은 경우만 가입 가능
        if not group.is_public:
            # 초대 확인
            invitation = db.query(GroupInvitation).filter(
                and_(
                    GroupInvitation.group_id == group_id,
                    GroupInvitation.invitee_id == current_user.user_id,
                    GroupInvitation.status == 'pending'
                )
            ).first()
            
            if not invitation:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="비공개 그룹입니다. 초대를 받아야 가입할 수 있습니다."
                )
            
            # 초대 상태를 accepted로 변경
            invitation.status = 'accepted'
        
        # 멤버 수 확인
        current_member_count = db.query(GroupMember).filter(
            GroupMember.group_id == group_id
        ).count()
        
        if current_member_count >= group.max_members:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="그룹이 가득 찼습니다."
            )
        
        # 그룹 가입
        new_member = GroupMember(
            group_id=group_id,
            user_id=current_user.user_id,
            role="member"
        )
        db.add(new_member)
        db.commit()
        
        logger.info(f"그룹 가입 완료: group_id={group_id}, user_id={current_user.user_id}")
        
        return MessageResponse(message="그룹에 성공적으로 가입했습니다.")
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"그룹 가입 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="그룹 가입 중 오류가 발생했습니다."
        )


@router.delete("/{group_id}/leave", response_model=MessageResponse)
async def leave_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    그룹 탈퇴
    - 그룹 소유자는 탈퇴할 수 없습니다 (그룹 삭제를 사용해야 함).
    """
    try:
        # 그룹 조회
        group = db.query(Group).filter(Group.group_id == group_id).first()
        
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="그룹을 찾을 수 없습니다."
            )
        
        # 멤버 확인
        member = db.query(GroupMember).filter(
            and_(
                GroupMember.group_id == group_id,
                GroupMember.user_id == current_user.user_id
            )
        ).first()
        
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="가입하지 않은 그룹입니다."
            )
        
        # 소유자는 탈퇴 불가
        if member.role == "owner":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="그룹 소유자는 탈퇴할 수 없습니다. 그룹을 삭제하거나 다른 사용자에게 소유권을 이전해야 합니다."
            )
        
        # 그룹 탈퇴
        db.delete(member)
        db.commit()
        
        logger.info(f"그룹 탈퇴 완료: group_id={group_id}, user_id={current_user.user_id}")
        
        return MessageResponse(message="그룹에서 탈퇴했습니다.")
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"그룹 탈퇴 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="그룹 탈퇴 중 오류가 발생했습니다."
        )


@router.get("/{group_id}/members", response_model=GroupMemberListResponse)
async def get_group_members(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    그룹 멤버 목록 조회
    - 공개 그룹이거나 내가 가입한 그룹의 멤버만 조회 가능합니다.
    """
    try:
        # 그룹 조회
        group = db.query(Group).filter(Group.group_id == group_id).first()
        
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="그룹을 찾을 수 없습니다."
            )
        
        # 권한 확인: 공개 그룹이거나 멤버여야 함
        is_member = db.query(GroupMember).filter(
            and_(
                GroupMember.group_id == group_id,
                GroupMember.user_id == current_user.user_id
            )
        ).first() is not None
        
        if not group.is_public and not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 그룹에 대한 접근 권한이 없습니다."
            )
        
        # 멤버 목록 조회
        members = db.query(GroupMember).options(
            joinedload(GroupMember.user)
        ).filter(
            GroupMember.group_id == group_id
        ).order_by(
            # 소유자, 관리자, 멤버 순서로 정렬
            case(
                (GroupMember.role == "owner", 1),
                (GroupMember.role == "admin", 2),
                else_=3
            ),
            GroupMember.joined_at
        ).all()
        
        member_responses = [
            _build_group_member_response(member, db)
            for member in members
        ]
        
        return GroupMemberListResponse(
            members=member_responses,
            total=len(member_responses)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"그룹 멤버 목록 조회 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="그룹 멤버 목록을 조회하는 중 오류가 발생했습니다."
        )


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    group_data: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    그룹 정보 수정
    - 그룹 소유자만 수정할 수 있습니다.
    """
    try:
        # 그룹 조회
        group = db.query(Group).options(
            joinedload(Group.owner),
            joinedload(Group.members).joinedload(GroupMember.user)
        ).filter(Group.group_id == group_id).first()
        
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="그룹을 찾을 수 없습니다."
            )
        
        # 소유자 확인
        if group.owner_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="그룹 소유자만 그룹 정보를 수정할 수 있습니다."
            )
        
        # 그룹 정보 업데이트
        if group_data.group_name is not None:
            # 그룹 이름 중복 확인 (다른 그룹과 중복되지 않는지)
            existing_group = db.query(Group).filter(
                and_(
                    Group.group_name == group_data.group_name,
                    Group.owner_id == current_user.user_id,
                    Group.group_id != group_id
                )
            ).first()
            
            if existing_group:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="이미 같은 이름의 그룹을 소유하고 있습니다."
                )
            group.group_name = group_data.group_name
        
        if group_data.description is not None:
            group.description = group_data.description
        
        if group_data.is_public is not None:
            group.is_public = group_data.is_public
        
        if group_data.max_members is not None:
            # 현재 멤버 수 확인
            current_member_count = db.query(GroupMember).filter(
                GroupMember.group_id == group_id
            ).count()
            
            if group_data.max_members < current_member_count:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"최대 멤버 수는 현재 멤버 수({current_member_count}명) 이상이어야 합니다."
                )
            group.max_members = group_data.max_members
        
        db.commit()
        db.refresh(group)
        
        logger.info(f"그룹 정보 수정 완료: group_id={group_id}")
        
        return _build_group_response(group, current_user.user_id, db)
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"그룹 정보 수정 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="그룹 정보를 수정하는 중 오류가 발생했습니다."
        )


@router.delete("/{group_id}", response_model=MessageResponse)
async def delete_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    그룹 삭제
    - 그룹 소유자만 삭제할 수 있습니다.
    - 그룹 삭제 시 모든 멤버 정보도 함께 삭제됩니다 (CASCADE).
    """
    try:
        # 그룹 조회
        group = db.query(Group).filter(Group.group_id == group_id).first()
        
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="그룹을 찾을 수 없습니다."
            )
        
        # 소유자 확인
        if group.owner_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="그룹 소유자만 그룹을 삭제할 수 있습니다."
            )
        
        # 그룹 삭제 (CASCADE로 멤버도 함께 삭제됨)
        db.delete(group)
        db.commit()
        
        logger.info(f"그룹 삭제 완료: group_id={group_id}")
        
        return MessageResponse(message="그룹이 성공적으로 삭제되었습니다.")
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"그룹 삭제 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="그룹을 삭제하는 중 오류가 발생했습니다."
        )


# ========== 그룹 초대 API ==========

def _build_group_invitation_response(invitation: GroupInvitation, db: Session) -> GroupInvitationResponse:
    """
    GroupInvitation 모델을 GroupInvitationResponse로 변환
    
    Args:
        invitation: GroupInvitation 모델 객체
    
    Returns:
        GroupInvitationResponse: 그룹 초대 응답 객체
    """
    from datetime import timezone
    
    # UTC timezone 정보 추가
    created_at_aware = invitation.created_at
    if created_at_aware and created_at_aware.tzinfo is None:
        created_at_aware = created_at_aware.replace(tzinfo=timezone.utc)
    
    updated_at_aware = invitation.updated_at
    if updated_at_aware and updated_at_aware.tzinfo is None:
        updated_at_aware = updated_at_aware.replace(tzinfo=timezone.utc)
    
    # 그룹 정보
    group = GroupInvitationGroupResponse(
        group_id=invitation.group.group_id,
        group_name=invitation.group.group_name,
        description=invitation.group.description,
        is_public=invitation.group.is_public
    )
    
    # 초대자 선택한 칭호 조회
    inviter_selected_achievement = None
    if invitation.inviter.selected_achievement_id:
        inviter_achievement = db.query(Achievement).filter(
            Achievement.achievement_id == invitation.inviter.selected_achievement_id
        ).first()
        if inviter_achievement:
            from app.schemas.achievements import AchievementResponse
            inviter_selected_achievement = AchievementResponse.model_validate(inviter_achievement)
    
    # 초대받은 사용자 선택한 칭호 조회
    invitee_selected_achievement = None
    if invitation.invitee.selected_achievement_id:
        invitee_achievement = db.query(Achievement).filter(
            Achievement.achievement_id == invitation.invitee.selected_achievement_id
        ).first()
        if invitee_achievement:
            from app.schemas.achievements import AchievementResponse
            invitee_selected_achievement = AchievementResponse.model_validate(invitee_achievement)
    
    # 초대자 정보
    inviter = GroupInvitationInviterResponse(
        user_id=invitation.inviter.user_id,
        nickname=invitation.inviter.nickname,
        profile_image_url=invitation.inviter.profile_image_url,
        selected_achievement=inviter_selected_achievement
    )
    
    # 초대받은 사용자 정보
    invitee = GroupInvitationInviteeResponse(
        user_id=invitation.invitee.user_id,
        nickname=invitation.invitee.nickname,
        profile_image_url=invitation.invitee.profile_image_url,
        selected_achievement=invitee_selected_achievement
    )
    
    return GroupInvitationResponse(
        invitation_id=invitation.invitation_id,
        group_id=invitation.group_id,
        group=group,
        inviter_id=invitation.inviter_id,
        inviter=inviter,
        invitee_id=invitation.invitee_id,
        invitee=invitee,
        status=invitation.status,
        created_at=created_at_aware,
        updated_at=updated_at_aware
    )


@router.post("/{group_id}/invitations", response_model=GroupInvitationResponse, status_code=status.HTTP_201_CREATED)
async def create_group_invitation(
    group_id: int,
    invitation_data: GroupInvitationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    그룹 초대 보내기
    - 그룹 소유자 또는 관리자만 초대할 수 있습니다.
    - 이미 멤버인 사용자에게는 초대할 수 없습니다.
    - pending 상태의 중복 초대는 불가능합니다.
    """
    try:
        # 그룹 조회
        group = db.query(Group).filter(Group.group_id == group_id).first()
        
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="그룹을 찾을 수 없습니다."
            )
        
        # 권한 확인: 소유자 또는 관리자여야 함
        member = db.query(GroupMember).filter(
            and_(
                GroupMember.group_id == group_id,
                GroupMember.user_id == current_user.user_id
            )
        ).first()
        
        if not member or member.role not in ['owner', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="그룹 소유자 또는 관리자만 초대할 수 있습니다."
            )
        
        # 초대받을 사용자 확인
        invitee = db.query(User).filter(User.user_id == invitation_data.invitee_id).first()
        
        if not invitee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="초대받을 사용자를 찾을 수 없습니다."
            )
        
        if invitee.deleted_at is not None or not invitee.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="비활성화된 사용자에게는 초대할 수 없습니다."
            )
        
        # 자기 자신에게 초대 불가
        if invitation_data.invitee_id == current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="자기 자신에게는 초대할 수 없습니다."
            )
        
        # 이미 멤버인지 확인
        existing_member = db.query(GroupMember).filter(
            and_(
                GroupMember.group_id == group_id,
                GroupMember.user_id == invitation_data.invitee_id
            )
        ).first()
        
        if existing_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 그룹 멤버입니다."
            )
        
        # 멤버 수 확인
        current_member_count = db.query(GroupMember).filter(
            GroupMember.group_id == group_id
        ).count()
        
        if current_member_count >= group.max_members:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="그룹이 가득 찼습니다."
            )
        
        # 중복 초대 확인 (pending 상태인 경우만)
        existing_invitation = db.query(GroupInvitation).filter(
            and_(
                GroupInvitation.group_id == group_id,
                GroupInvitation.invitee_id == invitation_data.invitee_id,
                GroupInvitation.status == 'pending'
            )
        ).first()
        
        if existing_invitation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 초대가 전송되었습니다."
            )
        
        # 초대 생성
        new_invitation = GroupInvitation(
            group_id=group_id,
            inviter_id=current_user.user_id,
            invitee_id=invitation_data.invitee_id,
            status='pending'
        )
        db.add(new_invitation)
        db.commit()
        db.refresh(new_invitation)
        
        # 관계 로드
        db.refresh(new_invitation)
        
        logger.info(f"그룹 초대 생성 완료: invitation_id={new_invitation.invitation_id}, group_id={group_id}, invitee_id={invitation_data.invitee_id}")
        
        return _build_group_invitation_response(new_invitation, db)
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"그룹 초대 생성 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="그룹 초대 생성 중 오류가 발생했습니다."
        )


# ========== 그룹 통계 API ==========

def _calculate_member_statistics(user_id: int, db: Session) -> GroupMemberStatisticsResponse:
    """
    멤버별 연습 통계 계산
    
    Args:
        user_id: 사용자 ID
        db: 데이터베이스 세션
    
    Returns:
        GroupMemberStatisticsResponse: 멤버 통계 정보
    """
    from app.models.user import User
    
    # 사용자 정보 조회
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다."
        )
    
    # 총 연습 시간 및 횟수
    stats = db.query(
        func.sum(PracticeSession.actual_play_time).label("total_time"),
        func.count(PracticeSession.session_id).label("total_sessions"),
        func.max(PracticeSession.practice_date).label("last_date")
    ).filter(
        and_(
            PracticeSession.user_id == user_id,
            PracticeSession.status == "completed"
        )
    ).first()
    
    total_practice_time = int(stats.total_time or 0)
    total_sessions = int(stats.total_sessions or 0)
    last_practice_date = stats.last_date
    
    # 평균 세션 시간 계산
    average_session_time = None
    if total_sessions > 0:
        average_session_time = total_practice_time / total_sessions
    
    # 연속 연습 일수 계산
    consecutive_days = 0
    if last_practice_date:
        today = date.today()
        start_check_date = today - timedelta(days=365)
        
        practice_dates = db.query(
            func.distinct(PracticeSession.practice_date).label("practice_date")
        ).filter(
            and_(
                PracticeSession.user_id == user_id,
                PracticeSession.practice_date >= start_check_date,
                PracticeSession.practice_date <= today,
                PracticeSession.status == "completed"
            )
        ).order_by(desc(PracticeSession.practice_date)).all()
        
        practice_date_set = {row.practice_date for row in practice_dates}
        check_date = today
        while check_date >= start_check_date:
            if check_date in practice_date_set:
                consecutive_days += 1
                check_date = check_date - timedelta(days=1)
            else:
                break
    
    return GroupMemberStatisticsResponse(
        user_id=user.user_id,
        nickname=user.nickname,
        profile_image_url=user.profile_image_url,
        total_practice_time=total_practice_time,
        total_sessions=total_sessions,
        consecutive_days=consecutive_days,
        last_practice_date=last_practice_date,
        average_session_time=average_session_time
    )


@router.get("/{group_id}/statistics", response_model=GroupStatisticsResponse)
async def get_group_statistics(
    group_id: int,
    period: str = Query("all", description="통계 기간: 'all' (전체 기간) 또는 'week' (이번 주)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    그룹 전체 통계 조회
    - 그룹 내 전체 연습 통계 및 멤버별 통계 제공
    """
    try:
        # 그룹 조회
        group = db.query(Group).filter(Group.group_id == group_id).first()
        
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="그룹을 찾을 수 없습니다."
            )
        
        # 권한 확인: 공개 그룹이거나 멤버여야 함
        is_member = db.query(GroupMember).filter(
            and_(
                GroupMember.group_id == group_id,
                GroupMember.user_id == current_user.user_id
            )
        ).first() is not None
        
        if not group.is_public and not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 그룹에 대한 접근 권한이 없습니다."
            )
        
        # 그룹 멤버 목록 조회
        members = db.query(GroupMember).filter(
            GroupMember.group_id == group_id
        ).all()
        
        if not members:
            return GroupStatisticsResponse(
                group_id=group_id,
                total_members=0,
                total_practice_time=0,
                total_sessions=0,
                average_practice_time_per_member=0.0,
                average_sessions_per_member=0.0,
                most_active_member=None,
                weekly_practice_data=[0] * 7
            )
        
        member_ids = [m.user_id for m in members]
        
        # 기간 필터 설정
        date_filter = None
        if period == "week":
            # 이번 주(월~일) 범위 설정
            today = date.today()
            day_of_week = today.weekday()  # 0(월) ~ 6(일)
            monday_offset = day_of_week  # 월요일로부터의 오프셋
            monday = today - timedelta(days=monday_offset)
            sunday = monday + timedelta(days=6)
            date_filter = and_(
                PracticeSession.practice_date >= monday,
                PracticeSession.practice_date <= sunday
            )
        
        # 그룹 전체 통계 계산
        base_filter = and_(
            PracticeSession.user_id.in_(member_ids),
            PracticeSession.status == "completed"
        )
        if date_filter:
            base_filter = and_(base_filter, date_filter)
        
        group_stats = db.query(
            func.sum(PracticeSession.actual_play_time).label("total_time"),
            func.count(PracticeSession.session_id).label("total_sessions")
        ).filter(base_filter).first()
        
        total_practice_time = int(group_stats.total_time or 0)
        total_sessions = int(group_stats.total_sessions or 0)
        total_members = len(members)
        
        average_practice_time_per_member = total_practice_time / total_members if total_members > 0 else 0.0
        average_sessions_per_member = total_sessions / total_members if total_members > 0 else 0.0
        
        # 가장 활발한 멤버 찾기 (기간 필터 적용)
        most_active_member = None
        max_practice_time = 0
        for member in members:
            # 멤버 통계 계산 시 기간 필터 적용
            member_stats_query = db.query(
                func.sum(PracticeSession.actual_play_time).label("total_time"),
                func.count(PracticeSession.session_id).label("total_sessions")
            ).filter(
                and_(
                    PracticeSession.user_id == member.user_id,
                    PracticeSession.status == "completed"
                )
            )
            if date_filter:
                member_stats_query = member_stats_query.filter(date_filter)
            
            member_stats_result = member_stats_query.first()
            member_total_time = int(member_stats_result.total_time or 0)
            
            if member_total_time > max_practice_time:
                max_practice_time = member_total_time
                # 멤버 정보 가져오기
                user = db.query(User).filter(User.user_id == member.user_id).first()
                if user:
                    most_active_member = GroupMemberStatisticsResponse(
                        user_id=member.user_id,
                        nickname=user.nickname,
                        profile_image_url=user.profile_image_url,
                        total_practice_time=member_total_time,
                        total_sessions=int(member_stats_result.total_sessions or 0),
                        consecutive_days=0,  # 주간 통계에서는 연속 일수 계산 생략
                        last_practice_date=None,
                        average_session_time=None
                    )
        
        # 이번 주(월~일) 일별 총 연습 시간 계산
        today = date.today()
        day_of_week = today.weekday()  # 0(월) ~ 6(일)
        monday_offset = day_of_week  # 월요일로부터의 오프셋
        
        monday = today - timedelta(days=monday_offset)
        weekly_practice_data = []
        for i in range(7):  # 월요일부터 일요일까지
            check_date = monday + timedelta(days=i)
            day_stats = db.query(
                func.sum(PracticeSession.actual_play_time).label("total_time")
            ).filter(
                and_(
                    PracticeSession.user_id.in_(member_ids),
                    PracticeSession.practice_date == check_date,
                    PracticeSession.status == "completed"
                )
            ).first()
            weekly_practice_data.append(int(day_stats.total_time or 0))
        
        return GroupStatisticsResponse(
            group_id=group_id,
            total_members=total_members,
            total_practice_time=total_practice_time,
            total_sessions=total_sessions,
            average_practice_time_per_member=average_practice_time_per_member,
            average_sessions_per_member=average_sessions_per_member,
            most_active_member=most_active_member,
            weekly_practice_data=weekly_practice_data
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"그룹 통계 조회 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="그룹 통계를 조회하는 중 오류가 발생했습니다."
        )


@router.get("/{group_id}/members/statistics", response_model=GroupMemberStatisticsListResponse)
async def get_group_member_statistics(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    그룹 멤버별 통계 조회
    - 그룹 내 모든 멤버의 개별 연습 통계 제공
    """
    try:
        # 그룹 조회
        group = db.query(Group).filter(Group.group_id == group_id).first()
        
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="그룹을 찾을 수 없습니다."
            )
        
        # 권한 확인: 공개 그룹이거나 멤버여야 함
        is_member = db.query(GroupMember).filter(
            and_(
                GroupMember.group_id == group_id,
                GroupMember.user_id == current_user.user_id
            )
        ).first() is not None
        
        if not group.is_public and not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 그룹에 대한 접근 권한이 없습니다."
            )
        
        # 그룹 멤버 목록 조회
        members = db.query(GroupMember).options(
            joinedload(GroupMember.user)
        ).filter(
            GroupMember.group_id == group_id
        ).order_by(
            case(
                (GroupMember.role == "owner", 1),
                (GroupMember.role == "admin", 2),
                else_=3
            ),
            GroupMember.joined_at
        ).all()
        
        # 각 멤버의 통계 계산
        member_statistics = []
        for member in members:
            try:
                stats = _calculate_member_statistics(member.user_id, db)
                member_statistics.append(stats)
            except Exception as e:
                logger.warning(f"멤버 {member.user_id} 통계 계산 중 오류: {str(e)}")
                continue
        
        # 총 연습 시간 기준으로 정렬 (내림차순)
        member_statistics.sort(key=lambda x: x.total_practice_time, reverse=True)
        
        return GroupMemberStatisticsListResponse(
            members=member_statistics,
            total=len(member_statistics)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"그룹 멤버 통계 조회 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="그룹 멤버 통계를 조회하는 중 오류가 발생했습니다."
        )

