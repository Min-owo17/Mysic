"""
칭호 시스템 API 라우터
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import date, timedelta
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.achievement import Achievement, UserAchievement
from app.models.practice import PracticeSession
from app.models.user_profile import UserProfileInstrument
from app.schemas.achievements import (
    AchievementResponse,
    UserAchievementResponse,
    AchievementListResponse,
    UserAchievementListResponse,
    AchievementCreate,
    AchievementUpdate
)
from app.schemas.users import MessageResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/achievements", tags=["칭호"])


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user


@router.post("", response_model=AchievementResponse, status_code=status.HTTP_201_CREATED)
async def create_achievement(
    achievement_data: AchievementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    칭호 생성 (관리자용)
    """
    try:
        new_achievement = Achievement(
            title=achievement_data.title,
            description=achievement_data.description,
            condition_type=achievement_data.condition_type,
            condition_value=achievement_data.condition_value,
            icon_url=achievement_data.icon_url
        )
        db.add(new_achievement)
        db.commit()
        db.refresh(new_achievement)
        
        return AchievementResponse.model_validate(new_achievement)
    except Exception as e:
        db.rollback()
        logger.error(f"칭호 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="칭호 생성에 실패했습니다.")


@router.patch("/{achievement_id}", response_model=AchievementResponse)
async def update_achievement(
    achievement_id: int,
    achievement_data: AchievementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    칭호 수정 (관리자용)
    """
    achievement = db.query(Achievement).filter(Achievement.achievement_id == achievement_id).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="칭호를 찾을 수 없습니다.")
        
    try:
        if achievement_data.title is not None:
            achievement.title = achievement_data.title
        if achievement_data.description is not None:
            achievement.description = achievement_data.description
        if achievement_data.condition_type is not None:
            achievement.condition_type = achievement_data.condition_type
        if achievement_data.condition_value is not None:
            achievement.condition_value = achievement_data.condition_value
        if achievement_data.icon_url is not None:
            achievement.icon_url = achievement_data.icon_url
            
        db.commit()
        db.refresh(achievement)
        return AchievementResponse.model_validate(achievement)
    except Exception as e:
        db.rollback()
        logger.error(f"칭호 수정 실패: {e}")
        raise HTTPException(status_code=500, detail="칭호 수정에 실패했습니다.")


@router.delete("/{achievement_id}", response_model=MessageResponse)
async def delete_achievement(
    achievement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    칭호 삭제 (관리자용)
    """
    achievement = db.query(Achievement).filter(Achievement.achievement_id == achievement_id).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="칭호를 찾을 수 없습니다.")
        
    try:
        db.delete(achievement)
        db.commit()
        return MessageResponse(message="칭호가 삭제되었습니다.")
    except Exception as e:
        db.rollback()
        logger.error(f"칭호 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="칭호 삭제에 실패했습니다.")


@router.get("", response_model=AchievementListResponse)
async def get_all_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    전체 칭호 목록 조회
    """
    try:
        achievements = db.query(Achievement).order_by(Achievement.achievement_id).all()
        
        return AchievementListResponse(
            achievements=[AchievementResponse.model_validate(ach) for ach in achievements],
            total=len(achievements)
        )
    except Exception as e:
        logger.error(f"칭호 목록 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="칭호 목록 조회에 실패했습니다."
        )


@router.get("/my", response_model=UserAchievementListResponse)
async def get_my_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    내가 획득한 칭호 목록 조회
    """
    try:
        user_achievements = db.query(UserAchievement).filter(
            UserAchievement.user_id == current_user.user_id
        ).order_by(UserAchievement.earned_at.desc()).all()
        
        return UserAchievementListResponse(
            user_achievements=[
                UserAchievementResponse.model_validate(ua) for ua in user_achievements
            ],
            total=len(user_achievements)
        )
    except Exception as e:
        logger.error(f"내 칭호 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="칭호 조회에 실패했습니다."
        )


def check_and_award_achievements(user_id: int, db: Session) -> List[Achievement]:
    """
    사용자의 칭호 획득 조건을 체크하고 자동으로 칭호를 부여하는 함수
    
    Returns:
        새로 획득한 칭호 리스트
    """
    newly_earned = []
    
    try:
        # 1. 연습 시간 관련 칭호 체크
        total_practice_time = db.query(func.sum(PracticeSession.actual_play_time)).filter(
            and_(
                PracticeSession.user_id == user_id,
                PracticeSession.status == "completed"
            )
        ).scalar() or 0
        
        # 연습 시간 칭호 체크
        practice_time_achievements = db.query(Achievement).filter(
            and_(
                Achievement.condition_type == "practice_time",
                Achievement.condition_value <= total_practice_time
            )
        ).all()
        
        for achievement in practice_time_achievements:
            # 이미 획득한 칭호인지 확인
            existing = db.query(UserAchievement).filter(
                and_(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement.achievement_id
                )
            ).first()
            
            if not existing:
                # 새 칭호 부여
                user_achievement = UserAchievement(
                    user_id=user_id,
                    achievement_id=achievement.achievement_id
                )
                db.add(user_achievement)
                newly_earned.append(achievement)
                logger.info(f"칭호 획득: user_id={user_id}, achievement_id={achievement.achievement_id}, title={achievement.title}")
        
        # 2. 연속 연습 일수 칭호 체크
        consecutive_days = calculate_consecutive_days(user_id, db)
        
        consecutive_achievements = db.query(Achievement).filter(
            and_(
                Achievement.condition_type == "consecutive_days",
                Achievement.condition_value <= consecutive_days
            )
        ).all()
        
        for achievement in consecutive_achievements:
            existing = db.query(UserAchievement).filter(
                and_(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement.achievement_id
                )
            ).first()
            
            if not existing:
                user_achievement = UserAchievement(
                    user_id=user_id,
                    achievement_id=achievement.achievement_id
                )
                db.add(user_achievement)
                newly_earned.append(achievement)
                logger.info(f"칭호 획득: user_id={user_id}, achievement_id={achievement.achievement_id}, title={achievement.title}")
        
        # 3. 악기 종류 칭호 체크
        from app.models.user import UserProfile
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        instrument_count = 0
        if profile:
            instrument_count = db.query(UserProfileInstrument).filter(
                UserProfileInstrument.profile_id == profile.profile_id
            ).count()
        
        instrument_achievements = db.query(Achievement).filter(
            and_(
                Achievement.condition_type == "instrument_count",
                Achievement.condition_value <= instrument_count
            )
        ).all()
        
        for achievement in instrument_achievements:
            existing = db.query(UserAchievement).filter(
                and_(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement.achievement_id
                )
            ).first()
            
            if not existing:
                user_achievement = UserAchievement(
                    user_id=user_id,
                    achievement_id=achievement.achievement_id
                )
                db.add(user_achievement)
                newly_earned.append(achievement)
                logger.info(f"칭호 획득: user_id={user_id}, achievement_id={achievement.achievement_id}, title={achievement.title}")
        
        if newly_earned:
            db.commit()
        
        return newly_earned
        
    except Exception as e:
        db.rollback()
        logger.error(f"칭호 체크 실패: user_id={user_id}, error={e}")
        return []


def calculate_consecutive_days(user_id: int, db: Session) -> int:
    """
    연속 연습 일수 계산
    """
    try:
        # 오늘부터 역순으로 연습한 날짜들을 가져옴
        today = date.today()
        consecutive_days = 0
        current_date = today
        
        while True:
            # 해당 날짜에 연습 기록이 있는지 확인
            session = db.query(PracticeSession).filter(
                and_(
                    PracticeSession.user_id == user_id,
                    PracticeSession.practice_date == current_date,
                    PracticeSession.status == "completed"
                )
            ).first()
            
            if session:
                consecutive_days += 1
                current_date -= timedelta(days=1)
            else:
                break
        
        return consecutive_days
    except Exception as e:
        logger.error(f"연속 일수 계산 실패: user_id={user_id}, error={e}")
        return 0


@router.put("/my/select", response_model=MessageResponse)
async def select_achievement(
    achievement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    대표 칭호 선택
    - 획득한 칭호 중에서만 선택 가능
    - achievement_id가 None이면 선택 해제
    """
    try:
        # achievement_id가 None이면 선택 해제
        if achievement_id is None:
            current_user.selected_achievement_id = None
            db.commit()
            logger.info(f"칭호 선택 해제: user_id={current_user.user_id}")
            return MessageResponse(message="칭호 선택이 해제되었습니다.")
        
        # 칭호가 존재하는지 확인
        achievement = db.query(Achievement).filter(
            Achievement.achievement_id == achievement_id
        ).first()
        
        if not achievement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="칭호를 찾을 수 없습니다."
            )
        
        # 사용자가 해당 칭호를 획득했는지 확인
        user_achievement = db.query(UserAchievement).filter(
            and_(
                UserAchievement.user_id == current_user.user_id,
                UserAchievement.achievement_id == achievement_id
            )
        ).first()
        
        if not user_achievement:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="획득하지 않은 칭호는 선택할 수 없습니다."
            )
        
        # 선택한 칭호 설정
        current_user.selected_achievement_id = achievement_id
        db.commit()
        db.refresh(current_user)
        
        logger.info(f"칭호 선택: user_id={current_user.user_id}, achievement_id={achievement_id}")
        return MessageResponse(message=f"'{achievement.title}' 칭호가 대표 칭호로 선택되었습니다.")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"칭호 선택 실패: user_id={current_user.user_id}, error={e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="칭호 선택에 실패했습니다."
        )

