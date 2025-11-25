"""
게시판 API 라우터
게시글, 댓글, 좋아요 기능 제공
"""
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func, text
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.board import Post, Comment, PostLike, CommentLike
from app.schemas.board import (
    PostCreate,
    PostUpdate,
    PostResponse,
    PostListResponse,
    CommentCreate,
    CommentUpdate,
    CommentResponse,
    CommentListResponse,
    LikeResponse,
    MessageResponse,
    PostAuthorResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/board", tags=["게시판"])


def _build_post_response(post: Post, current_user_id: Optional[int] = None) -> PostResponse:
    """
    Post 모델을 PostResponse로 변환
    
    Args:
        post: Post 모델 객체
        current_user_id: 현재 사용자 ID (좋아요 여부 확인용)
    
    Returns:
        PostResponse: 게시글 응답 객체
    """
    # 작성자 정보
    author = PostAuthorResponse(
        user_id=post.user.user_id,
        nickname=post.user.nickname,
        profile_image_url=post.user.profile_image_url
    )
    
    # 좋아요 여부 확인
    is_liked = False
    if current_user_id:
        like = next((l for l in post.likes if l.user_id == current_user_id), None)
        is_liked = like is not None
    
    return PostResponse(
        post_id=post.post_id,
        user_id=post.user_id,
        author=author,
        title=post.title,
        content=post.content,
        category=post.category,
        tags=post.manual_tags,  # manual_tags를 tags로 반환
        view_count=post.view_count,
        like_count=post.like_count,
        is_liked=is_liked,
        created_at=post.created_at,
        updated_at=post.updated_at
    )


def _build_comment_response(comment: Comment, current_user_id: Optional[int] = None) -> CommentResponse:
    """
    Comment 모델을 CommentResponse로 변환 (답글 포함)
    
    Args:
        comment: Comment 모델 객체
        current_user_id: 현재 사용자 ID (좋아요 여부 확인용)
    
    Returns:
        CommentResponse: 댓글 응답 객체
    """
    # 작성자 정보
    author = PostAuthorResponse(
        user_id=comment.user.user_id,
        nickname=comment.user.nickname,
        profile_image_url=comment.user.profile_image_url
    )
    
    # 좋아요 여부 확인
    is_liked = False
    if current_user_id:
        like = next((l for l in comment.likes if l.user_id == current_user_id), None)
        is_liked = like is not None
    
    # 답글 목록 (재귀적으로 변환)
    replies = []
    if hasattr(comment, 'replies') and comment.replies:
        replies = [
            _build_comment_response(reply, current_user_id)
            for reply in sorted(comment.replies, key=lambda x: x.created_at)
        ]
    
    return CommentResponse(
        comment_id=comment.comment_id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        author=author,
        parent_comment_id=comment.parent_comment_id,
        content=comment.content,
        like_count=comment.like_count,
        is_liked=is_liked,
        replies=replies,
        deleted_at=comment.deleted_at,
        created_at=comment.created_at,
        updated_at=comment.updated_at
    )


# ========== 게시글 엔드포인트 ==========

@router.get("/posts", response_model=PostListResponse)
async def get_posts(
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    category: Optional[str] = Query(None, description="카테고리 필터 (tip, question, free, general)"),
    tag: Optional[str] = Query(None, description="태그 필터"),
    search: Optional[str] = Query(None, description="검색어 (제목, 내용)"),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    게시글 목록 조회
    - Soft Delete된 게시글은 제외
    - 페이지네이션 지원
    - 카테고리, 태그, 검색어 필터링 지원
    """
    # 기본 쿼리: Soft Delete 제외
    query = db.query(Post).filter(Post.deleted_at.is_(None))
    
    # 카테고리 필터
    if category:
        query = query.filter(Post.category == category)
    
    # 태그 필터 (manual_tags 배열에 포함된 태그 검색)
    if tag:
        # 공백 제거 후 PostgreSQL의 ANY() 연산자를 사용하여 정확한 태그 매칭
        tag_trimmed = tag.strip()
        if tag_trimmed:
            # PostgreSQL의 ANY() 연산자를 사용하여 배열에 값이 포함되어 있는지 확인
            # NULL 체크 추가하여 NULL 배열에 대한 오류 방지
            # text()를 사용하여 직접 SQL 작성 (파라미터 바인딩으로 SQL injection 방지)
            query = query.filter(
                and_(
                    Post.manual_tags.isnot(None),
                    text(":tag = ANY(posts.manual_tags)").bindparams(tag=tag_trimmed)
                )
            )
    
    # 검색어 필터 (제목 또는 내용)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Post.title.ilike(search_pattern),
                Post.content.ilike(search_pattern)
            )
        )
    
    # 전체 개수
    total = query.count()
    
    # 정렬 및 페이지네이션
    posts = query.order_by(desc(Post.created_at)).offset((page - 1) * page_size).limit(page_size).all()
    
    # 응답 변환
    current_user_id = current_user.user_id if current_user else None
    post_responses = [_build_post_response(post, current_user_id) for post in posts]
    
    total_pages = (total + page_size - 1) // page_size
    
    return PostListResponse(
        posts=post_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    게시글 작성
    """
    # 게시글 생성
    # updated_at은 None으로 설정하여 신규 게시글임을 명확히 표시
    new_post = Post(
        user_id=current_user.user_id,
        title=post_data.title,
        content=post_data.content,
        category=post_data.category or "general",
        manual_tags=post_data.manual_tags if post_data.manual_tags else None,
        view_count=0,
        like_count=0,
        created_at=datetime.utcnow(),  # UTC로 명시적으로 설정
        updated_at=None  # 신규 게시글은 updated_at을 NULL로 설정
    )
    
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    
    # 관계 데이터 로드
    _ = new_post.user
    _ = new_post.likes
    
    logger.info(f"게시글 작성 완료: post_id={new_post.post_id}, user_id={current_user.user_id}")
    
    return _build_post_response(new_post, current_user.user_id)


@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: int,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    게시글 상세 조회
    - 조회수 증가
    - Soft Delete된 게시글은 404 반환
    """
    post = db.query(Post).filter(
        and_(
            Post.post_id == post_id,
            Post.deleted_at.is_(None)
        )
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다."
        )
    
    # 조회수 증가
    post.view_count += 1
    db.commit()
    db.refresh(post)
    
    # 관계 데이터 로드
    _ = post.user
    _ = post.likes
    
    current_user_id = current_user.user_id if current_user else None
    return _build_post_response(post, current_user_id)


@router.put("/posts/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    post_data: PostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    게시글 수정
    - 작성자만 수정 가능
    - Soft Delete된 게시글은 수정 불가
    """
    post = db.query(Post).filter(
        and_(
            Post.post_id == post_id,
            Post.deleted_at.is_(None)
        )
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다."
        )
    
    # 작성자 확인
    if post.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="게시글을 수정할 권한이 없습니다."
        )
    
    # 수정할 필드만 업데이트
    if post_data.title is not None:
        post.title = post_data.title
    if post_data.content is not None:
        post.content = post_data.content
    if post_data.category is not None:
        post.category = post_data.category
    if post_data.manual_tags is not None:
        post.manual_tags = post_data.manual_tags if post_data.manual_tags else None
    
    post.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(post)
    
    # 관계 데이터 로드
    _ = post.user
    _ = post.likes
    
    logger.info(f"게시글 수정 완료: post_id={post_id}, user_id={current_user.user_id}")
    
    return _build_post_response(post, current_user.user_id)


@router.delete("/posts/{post_id}", response_model=MessageResponse)
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    게시글 삭제 (Soft Delete)
    - 작성자만 삭제 가능
    - deleted_at 필드에 현재 시간 설정
    """
    post = db.query(Post).filter(
        and_(
            Post.post_id == post_id,
            Post.deleted_at.is_(None)
        )
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다."
        )
    
    # 작성자 확인
    if post.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="게시글을 삭제할 권한이 없습니다."
        )
    
    # Soft Delete
    post.deleted_at = datetime.utcnow()
    db.commit()
    
    logger.info(f"게시글 삭제 완료: post_id={post_id}, user_id={current_user.user_id}")
    
    return MessageResponse(message="게시글이 삭제되었습니다.")


@router.post("/posts/{post_id}/likes", response_model=LikeResponse)
async def toggle_post_like(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    게시글 좋아요 토글
    - 이미 좋아요를 누른 경우 취소, 안 누른 경우 추가
    """
    post = db.query(Post).filter(
        and_(
            Post.post_id == post_id,
            Post.deleted_at.is_(None)
        )
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다."
        )
    
    # 기존 좋아요 확인
    existing_like = db.query(PostLike).filter(
        and_(
            PostLike.post_id == post_id,
            PostLike.user_id == current_user.user_id
        )
    ).first()
    
    if existing_like:
        # 좋아요 취소
        db.delete(existing_like)
        post.like_count = max(0, post.like_count - 1)
        is_liked = False
    else:
        # 좋아요 추가
        new_like = PostLike(
            post_id=post_id,
            user_id=current_user.user_id
        )
        db.add(new_like)
        post.like_count += 1
        is_liked = True
    
    db.commit()
    db.refresh(post)
    
    return LikeResponse(
        is_liked=is_liked,
        like_count=post.like_count
    )


# ========== 댓글 엔드포인트 ==========

@router.get("/posts/{post_id}/comments", response_model=CommentListResponse)
async def get_comments(
    post_id: int,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    게시글의 댓글 목록 조회
    - 부모 댓글만 반환 (답글은 replies에 포함)
    - Soft Delete된 게시글의 댓글은 조회 불가
    """
    # 게시글 존재 및 Soft Delete 확인
    post = db.query(Post).filter(
        and_(
            Post.post_id == post_id,
            Post.deleted_at.is_(None)
        )
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다."
        )
    
    # 부모 댓글만 조회 (parent_comment_id가 NULL인 댓글)
    # 삭제된 댓글도 포함하여 "삭제된 댓글입니다" 메시지를 표시하기 위해 필터링하지 않음
    comments = db.query(Comment).filter(
        and_(
            Comment.post_id == post_id,
            Comment.parent_comment_id.is_(None)
        )
    ).order_by(Comment.created_at).all()
    
    # 관계 데이터 로드
    for comment in comments:
        _ = comment.user
        _ = comment.likes
        # 답글도 로드 (삭제된 답글 포함)
        if hasattr(comment, 'replies'):
            for reply in comment.replies:
                _ = reply.user
                _ = reply.likes
    
    current_user_id = current_user.user_id if current_user else None
    comment_responses = [_build_comment_response(comment, current_user_id) for comment in comments]
    
    return CommentListResponse(
        comments=comment_responses,
        total=len(comment_responses)
    )


@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    댓글 작성
    - 일반 댓글 또는 답글 작성 가능
    - Soft Delete된 게시글에는 댓글 작성 불가
    """
    # 게시글 존재 및 Soft Delete 확인
    post = db.query(Post).filter(
        and_(
            Post.post_id == post_id,
            Post.deleted_at.is_(None)
        )
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다."
        )
    
    # 답글인 경우 부모 댓글 확인
    if comment_data.parent_comment_id:
        parent_comment = db.query(Comment).filter(
            Comment.comment_id == comment_data.parent_comment_id
        ).first()
        
        if not parent_comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="부모 댓글을 찾을 수 없습니다."
            )
        
        if parent_comment.post_id != post_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="부모 댓글이 해당 게시글에 속하지 않습니다."
            )
        
        # 삭제된 댓글에는 답글 작성 불가
        if parent_comment.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="삭제된 댓글에는 답글을 작성할 수 없습니다."
            )
    
    # 댓글 생성
    # created_at은 UTC로 명시적으로 설정, updated_at은 None으로 설정하여 신규 댓글임을 명확히 표시
    new_comment = Comment(
        post_id=post_id,
        user_id=current_user.user_id,
        parent_comment_id=comment_data.parent_comment_id,
        content=comment_data.content,
        like_count=0,
        created_at=datetime.utcnow(),  # UTC로 명시적으로 설정
        updated_at=None  # 신규 댓글은 updated_at을 NULL로 설정
    )
    
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    # 관계 데이터 로드
    _ = new_comment.user
    _ = new_comment.likes
    
    logger.info(f"댓글 작성 완료: comment_id={new_comment.comment_id}, post_id={post_id}, user_id={current_user.user_id}")
    
    return _build_comment_response(new_comment, current_user.user_id)


@router.put("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    댓글 수정
    - 작성자만 수정 가능
    - 삭제된 댓글은 수정 불가
    """
    comment = db.query(Comment).filter(
        and_(
            Comment.comment_id == comment_id,
            Comment.deleted_at.is_(None)  # 삭제된 댓글은 수정 불가
        )
    ).first()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="댓글을 찾을 수 없습니다."
        )
    
    # 작성자 확인
    if comment.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="댓글을 수정할 권한이 없습니다."
        )
    
    # 댓글 수정
    comment.content = comment_data.content
    comment.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(comment)
    
    # 관계 데이터 로드
    _ = comment.user
    _ = comment.likes
    
    logger.info(f"댓글 수정 완료: comment_id={comment_id}, user_id={current_user.user_id}")
    
    return _build_comment_response(comment, current_user.user_id)


@router.delete("/comments/{comment_id}", response_model=MessageResponse)
async def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    댓글 삭제 (Soft Delete)
    - 작성자만 삭제 가능
    - deleted_at 필드에 현재 시간 설정
    - 하위 댓글(답글)은 삭제하지 않고 유지 (이력 보존)
    """
    comment = db.query(Comment).filter(
        and_(
            Comment.comment_id == comment_id,
            Comment.deleted_at.is_(None)  # 이미 삭제된 댓글은 조회 불가
        )
    ).first()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="댓글을 찾을 수 없습니다."
        )
    
    # 작성자 확인
    if comment.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="댓글을 삭제할 권한이 없습니다."
        )
    
    # Soft Delete
    # 하위 댓글(답글)은 삭제하지 않고 유지하여 이력을 보존
    comment.deleted_at = datetime.utcnow()
    db.commit()
    
    logger.info(f"댓글 삭제 완료: comment_id={comment_id}, user_id={current_user.user_id}")
    
    return MessageResponse(message="댓글이 삭제되었습니다.")


@router.post("/comments/{comment_id}/likes", response_model=LikeResponse)
async def toggle_comment_like(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    댓글 좋아요 토글
    - 이미 좋아요를 누른 경우 취소, 안 누른 경우 추가
    - 삭제된 댓글은 좋아요 불가
    """
    comment = db.query(Comment).filter(
        and_(
            Comment.comment_id == comment_id,
            Comment.deleted_at.is_(None)  # 삭제된 댓글은 좋아요 불가
        )
    ).first()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="댓글을 찾을 수 없습니다."
        )
    
    # 기존 좋아요 확인
    existing_like = db.query(CommentLike).filter(
        and_(
            CommentLike.comment_id == comment_id,
            CommentLike.user_id == current_user.user_id
        )
    ).first()
    
    if existing_like:
        # 좋아요 취소
        db.delete(existing_like)
        comment.like_count = max(0, comment.like_count - 1)
        is_liked = False
    else:
        # 좋아요 추가
        new_like = CommentLike(
            comment_id=comment_id,
            user_id=current_user.user_id
        )
        db.add(new_like)
        comment.like_count += 1
        is_liked = True
    
    db.commit()
    db.refresh(comment)
    
    return LikeResponse(
        is_liked=is_liked,
        like_count=comment.like_count
    )

