"""
연습 기록 API 라우터
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from datetime import date, datetime, timedelta
from typing import Optional, List, Union
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.practice import PracticeSession
from app.schemas.practice import (
    PracticeSessionCreate,
    PracticeSessionUpdate,
    PracticeSessionResponse,
    PracticeStatisticsResponse,
    PracticeSessionListResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/practice", tags=["연습 기록"])


@router.post("/sessions", response_model=PracticeSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_practice_session(
    session_data: PracticeSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    연습 세션 시작
    - 현재 진행 중인 세션이 있으면 에러 반환
    - 새로운 세션 생성 및 시작 시간 기록
    """
    # 진행 중인 세션이 있는지 확인
    active_session = db.query(PracticeSession).filter(
        and_(
            PracticeSession.user_id == current_user.user_id,
            PracticeSession.status == "in_progress"
        )
    ).first()
    
    if active_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 진행 중인 연습 세션이 있습니다. 먼저 종료해주세요."
        )
    
    # 새 세션 생성
    new_session = PracticeSession(
        user_id=current_user.user_id,
        practice_date=session_data.practice_date,
        start_time=datetime.now(),
        status="in_progress",
        instrument=session_data.instrument,
        notes=session_data.notes
    )
    
    try:
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        logger.info(f"연습 세션 시작: user_id={current_user.user_id}, session_id={new_session.session_id}")
        return new_session
    except Exception as e:
        db.rollback()
        logger.error(f"연습 세션 생성 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="연습 세션 생성에 실패했습니다."
        )


@router.put("/sessions/{session_id}", response_model=PracticeSessionResponse)
async def update_practice_session(
    session_id: int,
    session_data: PracticeSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    연습 세션 종료
    - 세션 종료 시간 기록
    - 실제 연주 시간 계산 (end_time - start_time 또는 actual_play_time 사용)
    - status를 'completed'로 변경
    """
    session = db.query(PracticeSession).filter(
        and_(
            PracticeSession.session_id == session_id,
            PracticeSession.user_id == current_user.user_id
        )
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="연습 세션을 찾을 수 없습니다."
        )
    
    if session.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 종료된 연습 세션입니다."
        )
    
    # 종료 시간 설정
    end_time = session_data.end_time or datetime.now()
    
    # 실제 연주 시간 계산
    if session_data.actual_play_time is not None:
        actual_play_time = session_data.actual_play_time
    elif session.start_time:
        time_diff = (end_time - session.start_time).total_seconds()
        actual_play_time = max(0, int(time_diff))
    else:
        actual_play_time = 0
    
    # 세션 업데이트
    session.end_time = end_time
    session.actual_play_time = actual_play_time
    session.status = "completed"
    
    if session_data.instrument is not None:
        session.instrument = session_data.instrument
    if session_data.notes is not None:
        session.notes = session_data.notes
    
    try:
        db.commit()
        db.refresh(session)
        logger.info(f"연습 세션 종료: user_id={current_user.user_id}, session_id={session_id}, time={actual_play_time}초")
        return session
    except Exception as e:
        db.rollback()
        logger.error(f"연습 세션 업데이트 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="연습 세션 업데이트에 실패했습니다."
        )


@router.get("/sessions", response_model=PracticeSessionListResponse)
async def get_practice_sessions(
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    start_date: Optional[date] = Query(None, description="시작 날짜"),
    end_date: Optional[date] = Query(None, description="종료 날짜"),
    instrument: Optional[str] = Query(None, description="악기 필터"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    연습 기록 목록 조회
    - 페이지네이션 지원
    - 날짜 범위 필터링
    - 악기별 필터링
    - 메모리 최적화: page_size 최대값 100으로 강제 제한
    """
    # 메모리 최적화: page_size 최대값 강제 적용
    if page_size > 100:
        page_size = 100
    """
    연습 기록 목록 조회
    - 페이지네이션 지원
    - 날짜 범위 필터링
    - 악기별 필터링
    """
    query = db.query(PracticeSession).filter(
        PracticeSession.user_id == current_user.user_id
    )
    
    # 날짜 필터
    if start_date:
        query = query.filter(PracticeSession.practice_date >= start_date)
    if end_date:
        query = query.filter(PracticeSession.practice_date <= end_date)
    
    # 악기 필터
    if instrument:
        query = query.filter(PracticeSession.instrument == instrument)
    
    # 총 개수
    total = query.count()
    
    # 정렬 및 페이지네이션
    sessions = query.order_by(desc(PracticeSession.practice_date), desc(PracticeSession.created_at))\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()
    
    return PracticeSessionListResponse(
        sessions=sessions,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/sessions/active")
async def get_active_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    현재 진행 중인 연습 세션 조회
    - 세션이 있으면 PracticeSessionResponse 반환
    - 세션이 없으면 null 반환
    """
    active_session = db.query(PracticeSession).filter(
        and_(
            PracticeSession.user_id == current_user.user_id,
            PracticeSession.status == "in_progress"
        )
    ).first()
    
    if active_session:
        # Pydantic 모델로 변환하여 반환 (FastAPI가 자동으로 JSON 변환)
        return PracticeSessionResponse.model_validate(active_session)
    # None을 반환하면 FastAPI가 자동으로 JSON null로 변환
    return None


@router.get("/sessions/{session_id}", response_model=PracticeSessionResponse)
async def get_practice_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    연습 세션 상세 조회
    """
    session = db.query(PracticeSession).filter(
        and_(
            PracticeSession.session_id == session_id,
            PracticeSession.user_id == current_user.user_id
        )
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="연습 세션을 찾을 수 없습니다."
        )
    
    return session


@router.get("/statistics", response_model=PracticeStatisticsResponse)
async def get_practice_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    연습 통계 정보 조회
    - 총 연습 시간
    - 총 연습 횟수
    - 연속 연습 일수
    - 마지막 연습 날짜
    - 평균 세션 시간
    """
    # 총 연습 시간 및 횟수
    stats = db.query(
        func.sum(PracticeSession.actual_play_time).label("total_time"),
        func.count(PracticeSession.session_id).label("total_sessions"),
        func.max(PracticeSession.practice_date).label("last_date")
    ).filter(
        and_(
            PracticeSession.user_id == current_user.user_id,
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
    
    # 연속 연습 일수 계산 (메모리 최적화: 단일 쿼리로 최적화)
    consecutive_days = 0
    if last_practice_date:
        # 메모리 최적화: 반복 쿼리 대신 단일 쿼리로 연속 일수 계산
        # 오늘부터 역순으로 연속된 날짜의 세션 존재 여부를 한 번에 조회
        
        # 최근 365일 동안의 연습 날짜를 한 번에 조회
        today = date.today()
        start_check_date = today - timedelta(days=365)  # 최대 1년치만 확인
        
        # 각 날짜별로 세션이 있는지 확인하는 쿼리
        practice_dates = db.query(
            func.distinct(PracticeSession.practice_date).label("practice_date")
        ).filter(
            and_(
                PracticeSession.user_id == current_user.user_id,
                PracticeSession.practice_date >= start_check_date,
                PracticeSession.practice_date <= today,
                PracticeSession.status == "completed"
            )
        ).order_by(desc(PracticeSession.practice_date)).all()
        
        # 메모리에서 연속 일수 계산 (최대 365일까지만)
        practice_date_set = {row.practice_date for row in practice_dates}
        check_date = today
        while check_date >= start_check_date:
            if check_date in practice_date_set:
                consecutive_days += 1
                check_date = check_date - timedelta(days=1)
            else:
                break
    
    return PracticeStatisticsResponse(
        total_practice_time=total_practice_time,
        total_sessions=total_sessions,
        consecutive_days=consecutive_days,
        last_practice_date=last_practice_date,
        average_session_time=average_session_time
    )

