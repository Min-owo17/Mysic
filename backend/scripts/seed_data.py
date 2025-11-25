"""
시드 데이터 생성 스크립트
테스트용 데이터를 데이터베이스에 삽입합니다.

사용법:
    python backend/scripts/seed_data.py
"""
import sys
import os
from datetime import datetime, timedelta, date
from random import randint, choice, sample

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.core.security import get_password_hash
from app.models import (
    Instrument, UserType, Achievement,
    User, UserProfile, SocialAccount,
    UserProfileInstrument, UserProfileUserType,
    PracticeSession, RecordingFile,
    Group, GroupMember,
    Post, Comment, PostLike, CommentLike,
    UserAchievement
)


def seed_instruments(db: Session):
    """악기 시드 데이터 생성"""
    print("📝 악기 데이터 생성 중...")
    
    instruments_data = [
        ('피아노', 1),
        ('기타', 2),
        ('바이올린', 3),
        ('첼로', 4),
        ('플루트', 5),
        ('클라리넷', 6),
        ('트럼펫', 7),
        ('드럼', 8),
        ('베이스', 9),
        ('색소폰', 10),
        ('오보에', 11),
        ('바순', 12),
    ]
    
    for name, display_order in instruments_data:
        existing = db.query(Instrument).filter(Instrument.name == name).first()
        if not existing:
            instrument = Instrument(name=name, display_order=display_order)
            db.add(instrument)
    
    # commit은 main 함수에서 처리
    print(f"✅ {len(instruments_data)}개 악기 데이터 생성 완료")


def seed_user_types(db: Session):
    """사용자 특징 시드 데이터 생성"""
    print("📝 사용자 특징 데이터 생성 중...")
    
    user_types_data = [
        ('진학', 1),
        ('취미', 2),
        ('클래식', 3),
        ('재즈', 4),
        ('밴드', 5),
        ('오케스트라', 6),
        ('실용음악', 7),
        ('국악', 8),
    ]
    
    for name, display_order in user_types_data:
        existing = db.query(UserType).filter(UserType.name == name).first()
        if not existing:
            user_type = UserType(name=name, display_order=display_order)
            db.add(user_type)
    
    # commit은 main 함수에서 처리
    print(f"✅ {len(user_types_data)}개 사용자 특징 데이터 생성 완료")


def seed_achievements(db: Session):
    """칭호 시드 데이터 생성"""
    print("📝 칭호 데이터 생성 중...")
    
    achievements_data = [
        # 연습 시간 관련 칭호
        ('첫 걸음', '총 1시간 연습 달성', 'practice_time', 3600, None),  # 1시간 = 3600초
        ('열정의 시작', '총 10시간 연습 달성', 'practice_time', 36000, None),  # 10시간
        ('연습 마니아', '총 100시간 연습 달성', 'practice_time', 360000, None),  # 100시간
        ('마스터', '총 1000시간 연습 달성', 'practice_time', 3600000, None),  # 1000시간
        
        # 연속 연습일 관련 칭호
        ('하루의 시작', '1일 연속 연습', 'consecutive_days', 1, None),
        ('일주일의 약속', '7일 연속 연습', 'consecutive_days', 7, None),
        ('한 달의 도전', '30일 연속 연습', 'consecutive_days', 30, None),
        ('100일의 기적', '100일 연속 연습', 'consecutive_days', 100, None),
        
        # 악기 종류 관련 칭호
        ('다재다능', '3가지 이상 악기 연주', 'instrument_count', 3, None),
        ('올라운더', '5가지 이상 악기 연주', 'instrument_count', 5, None),
    ]
    
    for title, description, condition_type, condition_value, icon_url in achievements_data:
        existing = db.query(Achievement).filter(Achievement.title == title).first()
        if not existing:
            achievement = Achievement(
                title=title,
                description=description,
                condition_type=condition_type,
                condition_value=condition_value,
                icon_url=icon_url
            )
            db.add(achievement)
    
    # commit은 main 함수에서 처리
    print(f"✅ {len(achievements_data)}개 칭호 데이터 생성 완료")


def seed_users(db: Session):
    """테스트 사용자 생성"""
    print("📝 테스트 사용자 생성 중...")
    
    users_data = [
        ('user1@test.com', 'user1', '테스트 사용자 1', ['피아노', '기타'], ['진학', '클래식']),
        ('user2@test.com', 'user2', '테스트 사용자 2', ['바이올린', '첼로'], ['취미', '오케스트라']),
        ('user3@test.com', 'user3', '테스트 사용자 3', ['드럼', '베이스'], ['밴드', '재즈']),
        ('user4@test.com', 'user4', '테스트 사용자 4', ['플루트', '클라리넷'], ['실용음악']),
        ('user5@test.com', 'user5', '테스트 사용자 5', ['색소폰', '트럼펫', '피아노'], ['재즈', '밴드']),
    ]
    
    instruments = db.query(Instrument).all()
    user_types = db.query(UserType).all()
    instrument_map = {inst.name: inst for inst in instruments}
    user_type_map = {ut.name: ut for ut in user_types}
    
    created_users = []
    
    for email, password, nickname, instrument_names, user_type_names in users_data:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"   ⚠️  사용자 {email}는 이미 존재합니다. 건너뜁니다.")
            created_users.append(existing)
            continue
        
        # 디버깅: 비밀번호 확인
        try:
            password_bytes = password.encode('utf-8')
            password_len = len(password_bytes)
            print(f"   🔍 DEBUG: email={email}, password={repr(password)}, password_bytes_len={password_len}")
            
            if password_len > 72:
                print(f"   ⚠️  WARNING: Password for {email} exceeds 72 bytes! Truncating...")
                # 72바이트로 제한
                password_bytes = password_bytes[:72]
                # 잘린 UTF-8 문자 제거
                while len(password_bytes) > 0 and (password_bytes[-1] & 0xC0) == 0x80:
                    password_bytes = password_bytes[:-1]
                password = password_bytes.decode('utf-8', errors='ignore')
                print(f"   🔍 DEBUG: Truncated password={repr(password)}, new_len={len(password.encode('utf-8'))}")
        except Exception as e:
            print(f"   ⚠️  WARNING: Error checking password for {email}: {e}")
        
        # 비밀번호 해싱
        try:
            # 디버깅: 함수가 실제로 어디서 오는지 확인
            import inspect
            func_file = inspect.getfile(get_password_hash)
            func_source = inspect.getsource(get_password_hash)
            print(f"   🔍 DEBUG: get_password_hash function location: {func_file}")
            print(f"   🔍 DEBUG: get_password_hash function source (first 300 chars): {func_source[:300]}")
            print(f"   🔍 DEBUG: About to call get_password_hash with password={repr(password)}")
            
            password_hash = get_password_hash(password)
            print(f"   🔍 DEBUG: Password hash generated successfully for {email}")
            print(f"   🔍 DEBUG: Hash length: {len(password_hash)} characters")
        except Exception as e:
            print(f"   ❌ ERROR: Failed to hash password for {email}: {e}")
            print(f"   🔍 DEBUG: password type={type(password)}, password value={repr(password)}")
            print(f"   🔍 DEBUG: password bytes length={len(password.encode('utf-8'))}")
            import traceback
            traceback.print_exc()
            raise
        
        # 사용자 생성
        user = User(
            email=email,
            password_hash=password_hash,
            nickname=nickname,
            is_active=True,
            last_login_at=datetime.utcnow() - timedelta(days=randint(0, 7))
        )
        db.add(user)
        db.flush()  # user_id를 얻기 위해
        
        # 프로필 생성
        profile = UserProfile(
            user_id=user.user_id,
            bio=f"{nickname}의 프로필입니다. 열심히 연습하고 있습니다!",
            hashtags=[f"#{name}" for name in instrument_names + user_type_names]
        )
        db.add(profile)
        db.flush()
        
        # 악기 연결
        for idx, inst_name in enumerate(instrument_names):
            if inst_name in instrument_map:
                profile_instrument = UserProfileInstrument(
                    profile_id=profile.profile_id,
                    instrument_id=instrument_map[inst_name].instrument_id,
                    is_primary=(idx == 0)  # 첫 번째 악기를 주요 악기로
                )
                db.add(profile_instrument)
        
        # 특징 연결
        for ut_name in user_type_names:
            if ut_name in user_type_map:
                profile_user_type = UserProfileUserType(
                    profile_id=profile.profile_id,
                    user_type_id=user_type_map[ut_name].user_type_id
                )
                db.add(profile_user_type)
        
        created_users.append(user)
        print(f"   ✅ 사용자 생성: {email} ({nickname})")
    
    # commit은 main 함수에서 처리
    print(f"✅ {len(created_users)}명의 사용자 생성 완료")
    return created_users


def seed_practice_sessions(db: Session, users: list):
    """연습 기록 생성"""
    print("📝 연습 기록 생성 중...")
    
    instruments = db.query(Instrument).all()
    instrument_names = [inst.name for inst in instruments]
    
    total_sessions = 0
    
    for user in users:
        # 사용자당 10-20개의 연습 기록 생성
        num_sessions = randint(10, 20)
        
        for i in range(num_sessions):
            # 최근 30일 내의 날짜
            days_ago = randint(0, 30)
            practice_date = date.today() - timedelta(days=days_ago)
            
            # 연습 시간 (30분 ~ 2시간)
            practice_minutes = randint(30, 120)
            actual_play_time = practice_minutes * 60  # 초 단위
            
            start_time = datetime.combine(practice_date, datetime.min.time()) + timedelta(hours=randint(9, 21))
            end_time = start_time + timedelta(minutes=practice_minutes)
            
            session = PracticeSession(
                user_id=user.user_id,
                practice_date=practice_date,
                start_time=start_time,
                end_time=end_time,
                actual_play_time=actual_play_time,
                status='completed',
                instrument=choice(instrument_names),
                notes=f"{practice_date.strftime('%Y-%m-%d')} 연습 기록"
            )
            db.add(session)
            total_sessions += 1
    
    # commit은 main 함수에서 처리
    print(f"✅ {total_sessions}개의 연습 기록 생성 완료")


def seed_groups(db: Session, users: list):
    """테스트 그룹 생성"""
    print("📝 테스트 그룹 생성 중...")
    
    groups_data = [
        ('피아노 연습 모임', '피아노를 연주하는 분들을 위한 그룹입니다.', True, users[0]),
        ('밴드 연습 그룹', '밴드 연주자들을 위한 그룹입니다.', True, users[2]),
        ('클래식 음악 동호회', '클래식 음악을 사랑하는 분들을 위한 그룹입니다.', False, users[1]),
    ]
    
    created_groups = []
    
    for group_name, description, is_public, owner in groups_data:
        group = Group(
            group_name=group_name,
            description=description,
            owner_id=owner.user_id,
            is_public=is_public,
            max_members=50
        )
        db.add(group)
        db.flush()
        
        # 그룹 소유자를 멤버로 추가
        owner_member = GroupMember(
            group_id=group.group_id,
            user_id=owner.user_id,
            role='owner'
        )
        db.add(owner_member)
        
        # 다른 사용자들도 일부 그룹에 가입
        if len(users) > 1:
            other_users = [u for u in users if u.user_id != owner.user_id]
            num_members = min(randint(2, 4), len(other_users))
            selected_members = sample(other_users, num_members)
            
            for member_user in selected_members:
                member = GroupMember(
                    group_id=group.group_id,
                    user_id=member_user.user_id,
                    role='member'
                )
                db.add(member)
        
        created_groups.append(group)
        print(f"   ✅ 그룹 생성: {group_name}")
    
    # commit은 main 함수에서 처리
    print(f"✅ {len(created_groups)}개의 그룹 생성 완료")
    return created_groups


def seed_posts(db: Session, users: list):
    """테스트 게시글 생성"""
    print("📝 테스트 게시글 생성 중...")
    
    categories = ['tip', 'question', 'free']
    post_titles = [
        '피아노 연습 팁 공유합니다',
        '기타 코드 진행 질문이 있습니다',
        '바이올린 활 사용법 알려주세요',
        '연습 시간 관리하는 방법',
        '악보 읽는 팁',
        '연습 동기부여 받는 방법',
        '악기 구매 추천 부탁드립니다',
        '연습실 추천해주세요',
        '오케스트라 오디션 후기',
        '연주회 준비 경험 공유',
        '악기 유지보수 팁',
        '연습 일지 작성하는 방법',
        '음악 이론 공부 방법',
        '연습 슬럼프 극복기',
        '악기 배우기 시작한 후기',
    ]
    
    post_contents = [
        '오늘은 피아노 연습을 하면서 느낀 점을 공유하고 싶습니다...',
        '기타 코드 진행에 대해 궁금한 점이 있어서 질문드립니다...',
        '바이올린 활을 사용할 때 주의할 점들을 정리해봤습니다...',
        '연습 시간을 효율적으로 관리하는 방법을 찾아서 공유합니다...',
        '악보를 읽는 것이 어려우신 분들을 위한 팁입니다...',
        '연습 동기를 유지하는 것이 어려울 때 사용하는 방법들...',
        '악기를 구매하려고 하는데 추천 부탁드립니다...',
        '좋은 연습실을 찾고 있습니다. 추천해주세요...',
        '오케스트라 오디션을 보고 왔습니다. 후기를 공유합니다...',
        '연주회 준비 과정에서 배운 점들을 정리했습니다...',
        '악기를 오래 사용하기 위한 유지보수 팁입니다...',
        '연습 일지를 작성하면서 느낀 점들을 공유합니다...',
        '음악 이론을 공부하는 방법에 대해 이야기하고 싶습니다...',
        '연습 슬럼프를 겪었지만 극복한 경험을 공유합니다...',
        '악기를 배우기 시작한 후기를 작성해봤습니다...',
    ]
    
    created_posts = []
    num_posts = min(15, len(post_titles))
    
    for i in range(num_posts):
        user = choice(users)
        category = choice(categories)
        
        # 게시글 생성 날짜 (최근 7일 내)
        days_ago = randint(0, 7)
        created_at = datetime.utcnow() - timedelta(days=days_ago)
        
        post = Post(
            user_id=user.user_id,
            title=post_titles[i],
            content=post_contents[i],
            category=category,
            manual_tags=[f"태그{i+1}", f"태그{i+2}"] if i % 2 == 0 else None,
            view_count=randint(0, 100),
            like_count=0,
            created_at=created_at
        )
        db.add(post)
        db.flush()
        created_posts.append(post)
    
    # commit은 main 함수에서 처리
    print(f"✅ {len(created_posts)}개의 게시글 생성 완료")
    return created_posts


def seed_comments_and_likes(db: Session, users: list, posts: list):
    """댓글 및 좋아요 생성"""
    print("📝 댓글 및 좋아요 생성 중...")
    
    comment_contents = [
        '좋은 정보 감사합니다!',
        '저도 같은 고민이 있었는데 도움이 되었습니다.',
        '추가로 궁금한 점이 있습니다.',
        '정말 유용한 팁이네요!',
        '저도 시도해보겠습니다.',
        '감사합니다!',
        '좋은 글 잘 봤습니다.',
        '도움이 많이 되었어요.',
    ]
    
    total_comments = 0
    total_likes = 0
    
    for post in posts:
        # 각 게시글에 2-5개의 댓글 생성
        num_comments = randint(2, 5)
        comment_users = sample(users, min(num_comments, len(users)))
        
        for i, comment_user in enumerate(comment_users):
            if comment_user.user_id == post.user_id and i == 0:
                continue  # 본인 게시글에 첫 댓글은 건너뛰기
            
            days_ago = randint(0, 5)
            created_at = post.created_at + timedelta(days=days_ago)
            
            comment = Comment(
                post_id=post.post_id,
                user_id=comment_user.user_id,
                content=choice(comment_contents),
                created_at=created_at
            )
            db.add(comment)
            db.flush()
            total_comments += 1
            
            # 댓글 좋아요 (30% 확률)
            if randint(1, 10) <= 3:
                like_user = choice([u for u in users if u.user_id != comment_user.user_id])
                comment_like = CommentLike(
                    comment_id=comment.comment_id,
                    user_id=like_user.user_id
                )
                db.add(comment_like)
                comment.like_count += 1
                total_likes += 1
        
        # 게시글 좋아요 (50% 확률로 1-5명이 좋아요)
        num_likes = randint(0, 5) if randint(1, 10) <= 5 else 0
        like_users = sample([u for u in users if u.user_id != post.user_id], min(num_likes, len(users) - 1))
        
        for like_user in like_users:
            post_like = PostLike(
                post_id=post.post_id,
                user_id=like_user.user_id
            )
            db.add(post_like)
            post.like_count += 1
            total_likes += 1
    
    # commit은 main 함수에서 처리
    print(f"✅ {total_comments}개의 댓글 생성 완료")
    print(f"✅ {total_likes}개의 좋아요 생성 완료")


def seed_user_achievements(db: Session, users: list):
    """일부 사용자에게 칭호 부여"""
    print("📝 사용자 칭호 부여 중...")
    
    achievements = db.query(Achievement).all()
    if not achievements:
        print("   ⚠️  칭호 데이터가 없습니다. 건너뜁니다.")
        return
    
    total_achievements = 0
    
    for user in users:
        # 각 사용자에게 1-3개의 칭호 부여
        num_achievements = randint(1, 3)
        selected_achievements = sample(achievements, min(num_achievements, len(achievements)))
        
        for achievement in selected_achievements:
            existing = db.query(UserAchievement).filter(
                UserAchievement.user_id == user.user_id,
                UserAchievement.achievement_id == achievement.achievement_id
            ).first()
            
            if not existing:
                user_achievement = UserAchievement(
                    user_id=user.user_id,
                    achievement_id=achievement.achievement_id,
                    earned_at=datetime.utcnow() - timedelta(days=randint(1, 30))
                )
                db.add(user_achievement)
                total_achievements += 1
    
    # commit은 main 함수에서 처리
    print(f"✅ {total_achievements}개의 칭호 부여 완료")


def main():
    """시드 데이터 생성 메인 함수"""
    print("=" * 60)
    print("🌱 시드 데이터 생성 시작")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # 1. 기본 데이터 생성
        seed_instruments(db)
        seed_user_types(db)
        seed_achievements(db)
        
        # 2. 사용자 및 프로필 생성
        users = seed_users(db)
        
        if not users:
            print("⚠️  사용자가 생성되지 않았습니다. 시드 데이터 생성을 중단합니다.")
            return
        
        # 3. 연습 기록 생성
        seed_practice_sessions(db, users)
        
        # 4. 그룹 생성
        seed_groups(db, users)
        
        # 5. 게시글 생성
        posts = seed_posts(db, users)
        
        # 6. 댓글 및 좋아요 생성
        if posts:
            seed_comments_and_likes(db, users, posts)
        
        # 7. 칭호 부여
        seed_user_achievements(db, users)
        
        # 모든 작업이 성공적으로 완료된 경우에만 commit
        db.commit()
        print("=" * 60)
        print("✅ 시드 데이터 생성 완료! 모든 변경사항이 커밋되었습니다.")
        print("=" * 60)
        
    except Exception as e:
        # 오류 발생 시 모든 변경사항 롤백
        db.rollback()
        print("=" * 60)
        print(f"❌ 오류 발생: 모든 변경사항이 롤백되었습니다.")
        print(f"❌ 오류 내용: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()

