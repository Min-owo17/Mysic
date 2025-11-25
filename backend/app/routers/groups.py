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
    GroupInvitationInviteeResponse
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
    # 소유자 정보
    owner = GroupOwnerResponse(
        user_id=group.owner.user_id,
        nickname=group.owner.nickname,
        profile_image_url=group.owner.profile_image_url
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


def _build_group_member_response(member: GroupMember) -> GroupMemberResponse:
    """
    GroupMember 모델을 GroupMemberResponse로 변환
    
    Args:
        member: GroupMember 모델 객체
    
    Returns:
        GroupMemberResponse: 그룹 멤버 응답 객체
    """
    # UTC timezone 정보 추가
    joined_at_aware = member.joined_at
    if joined_at_aware and joined_at_aware.tzinfo is None:
        joined_at_aware = joined_at_aware.replace(tzinfo=timezone.utc)
    
    return GroupMemberResponse(
        member_id=member.member_id,
        user_id=member.user_id,
        nickname=member.user.nickname,
        profile_image_url=member.user.profile_image_url,
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
            _build_group_member_response(member)
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

def _build_group_invitation_response(invitation: GroupInvitation) -> GroupInvitationResponse:
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
    
    # 초대자 정보
    inviter = GroupInvitationInviterResponse(
        user_id=invitation.inviter.user_id,
        nickname=invitation.inviter.nickname,
        profile_image_url=invitation.inviter.profile_image_url
    )
    
    # 초대받은 사용자 정보
    invitee = GroupInvitationInviteeResponse(
        user_id=invitation.invitee.user_id,
        nickname=invitation.invitee.nickname,
        profile_image_url=invitation.invitee.profile_image_url
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
        
        return _build_group_invitation_response(new_invitation)
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"그룹 초대 생성 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="그룹 초대 생성 중 오류가 발생했습니다."
        )


@router.get("/invitations", response_model=GroupInvitationListResponse)
async def get_group_invitations(
    status: Optional[str] = Query(None, description="초대 상태 필터 (pending, accepted, declined, expired)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    내가 받은 그룹 초대 목록 조회
    - 현재 사용자가 받은 초대만 조회합니다.
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
            _build_group_invitation_response(invitation)
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

