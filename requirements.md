# 악기 연주자 연습 기록 서비스 요구사항

## 1. 프로젝트 개요

악기 연주자들이 연습 기록을 저장하고 공유할 수 있는 웹 서비스입니다. 사용자는 개인 프로필을 통해 연습 기록을 관리하고, 그룹을 통해 다른 사용자와 데이터를 공유하며, 게시판을 통해 소통할 수 있습니다. AI를 활용한 연주 시간 분석과 칭호 시스템으로 사용자 참여를 유도합니다.

## 2. 핵심 기능

### 2.1 사용자 관리
- **회원가입/로그인**: 이메일 또는 소셜 로그인 지원 (구글, 카카오, 네이버 등)
- **계정 정보 변경**: 이메일 또는 연동된 소셜 로그인 정보, 비밀번호 변경 지원
- **회원 탈퇴**: 계정 삭제 및 개인정보 처리방침에 따른 데이터 삭제
- **소셜 연동**: 기존 계정과 소셜 계정 연결/해제 기능
- **개인 프로필**: 닉네임, 프로필 이미지, 악기 정보, 성향(학생, 취미 등) 관리
- **사용자 정보 표시**: 인스타그램 해시태그 형태로 간단하게 표시
- **칭호 시스템**: 특정 조건 달성 시 획득하는 칭호 표시

### 2.2 연습 기록 관리
- **연습 시작/종료**: 버튼 클릭으로 연습 세션 시작 및 종료
- **실시간 녹음**: 연습 중 소리 녹음 (일시적)
- **AI 분석**: 녹음된 소리를 AI로 분석하여 실제 연주 시간 계산
- **자동 삭제**: 분석 완료 후 녹음 파일 자동 삭제
- **연습 기록 저장**: 특정 일자에 연습 시간, 날짜, 악기 등 정보 저장
- **일자별 데이터 관리**: 캘린더 형태로 연습 기록 관리

### 2.3 프로필 대시보드
- **캘린더 뷰**: 연습 기록을 캘린더 형태로 시각화
- **통계 정보**: 총 연습 시간, 연습 횟수, 연속 연습 일수 등
- **연습 현황**: 최근 연습 기록 및 진행 상황 표시

### 2.4 그룹 기능
- **그룹 생성/가입**: 연습 기록을 공유할 수 있는 그룹 생성 및 가입
- **데이터 공유**: 그룹 내에서 연습 기록 및 통계 데이터 공유
- **그룹 관리**: 그룹 설정, 멤버 관리, 권한 설정
- **그룹 대시보드**: 그룹 내 전체 통계 및 멤버별 활동 현황

### 2.5 게시판 기능
- **통합 게시판**: 모든 게시글을 하나의 게시판에서 관리
- **게시글 작성**: 연습 관련 글, 질문, 팁 등 게시글 작성
- **자동 태그 시스템**: 게시글 작성 시 작성자의 악기, 성향 등이 자동으로 태그로 추가
- **맞춤형 피드**: 사용자의 악기, 성향에 맞는 게시글을 우선적으로 표시
- **필터링 기능**: "전체", "팁", "질문", "자유", "악기별" 등 태그 기반 필터링
- **댓글 시스템**: 게시글에 대한 댓글 작성 및 답글 기능
- **좋아요/추천**: 게시글 및 댓글에 대한 좋아요 기능

### 2.6 칭호 시스템
- **도전과제**: 연습 시간, 연속 일수, 악기 종류 등 다양한 조건의 도전과제
- **칭호 획득**: 조건 달성 시 자동으로 칭호 획득
- **칭호 표시**: 프로필에 획득한 칭호 표시

### 2.7 공유 기능
- **프로필 공유**: 다른 사용자와 프로필 공유 가능
- **연습 기록 공유**: 특정 연습 세션 공유 기능

## 3. 기술 스택

### 3.1 백엔드
- **Framework**: FastAPI (AWS t3.micro EC2 인스턴스)
- **Database**: PostgreSQL (AWS RDS 프리티어 또는 EC2 내 설치)
- **AI 서비스**: AWS Lambda + OpenAI API (Phase 2), AWS SageMaker (Phase 3)
- **파일 저장**: AWS S3 (Phase 2부터)
- **인증**: JWT (Phase 1), OAuth (구글, 카카오, 네이버) (Phase 2)
- **서버**: AWS EC2 t3.micro (프리 티어)
- **큐잉**: DB 기반 큐 (Phase 1), AWS SQS (Phase 2)

### 3.2 프론트엔드
- **기술 스택**: React, TypeScript
- **스타일링**: Tailwind CSS
- **UI/UX**: 반응형 웹 디자인 (모바일 우선)
- **상태 관리**: Zustand (Phase 1), Redux Toolkit (선택사항, Phase 2)
- **서버 상태 관리**: React Query (TanStack Query)
- **로컬 저장소**: localStorage (Phase 1), IndexedDB (Phase 2)

### 3.3 인프라
- **배포 전략**: 웹 우선 배포 (AWS EC2 t3.micro)
- **웹 배포**: React 앱 → AWS EC2 t3.micro (Phase 1), CloudFront CDN (Phase 3)
- **빌드 도구**: Vite
- **파일 저장**: AWS S3 (Phase 2부터)
- **CDN**: CloudFront (Phase 3로 이동)
- **모니터링**: CloudWatch (Phase 2)
- **로깅**: CloudWatch Logs (Phase 2)
- **알림**: AWS SNS (Phase 3)
- **캐싱**: 메모리 캐싱 (Phase 1), Redis (Phase 2)

## 4. 데이터베이스 설계

### 4.1 PostgreSQL 테이블 구조

#### users 테이블
```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- 소셜 로그인 사용자는 NULL 가능
    nickname VARCHAR(100) NOT NULL,
    profile_image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP, -- Soft delete: 삭제 시점 기록 (NULL이면 활성 상태)
    last_login_at TIMESTAMP, -- 최종 접속일 (다른 사용자도 확인 가능)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스: email은 UNIQUE 제약으로 자동 인덱스 생성됨
CREATE INDEX idx_users_nickname ON users(nickname);
CREATE INDEX idx_users_deleted_at ON users(deleted_at); -- Soft delete 쿼리 최적화
CREATE INDEX idx_users_last_login_at ON users(last_login_at DESC); -- 최종 접속일 정렬 최적화
```

#### instruments 테이블
```sql
CREATE TABLE instruments (
    instrument_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- 예: '피아노', '기타', '바이올린' 등
    display_order INTEGER DEFAULT 0, -- 표시 순서
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### user_types 테이블
```sql
CREATE TABLE user_types (
    user_type_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- 예: '진학', '취미', '클래식', '재즈', '밴드' 등
    display_order INTEGER DEFAULT 0, -- 표시 순서
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### user_profiles 테이블
```sql
CREATE TABLE user_profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    bio TEXT,
    hashtags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### user_profile_instruments 테이블 (다대다 관계)
```sql
CREATE TABLE user_profile_instruments (
    profile_id INTEGER REFERENCES user_profiles(profile_id) ON DELETE CASCADE,
    instrument_id INTEGER REFERENCES instruments(instrument_id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false, -- 주요 악기 여부
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (profile_id, instrument_id)
);

CREATE INDEX idx_user_profile_instruments_profile ON user_profile_instruments(profile_id);
CREATE INDEX idx_user_profile_instruments_instrument ON user_profile_instruments(instrument_id);
```

#### user_profile_user_types 테이블 (다대다 관계)
```sql
CREATE TABLE user_profile_user_types (
    profile_id INTEGER REFERENCES user_profiles(profile_id) ON DELETE CASCADE,
    user_type_id INTEGER REFERENCES user_types(user_type_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (profile_id, user_type_id)
);

CREATE INDEX idx_user_profile_user_types_profile ON user_profile_user_types(profile_id);
CREATE INDEX idx_user_profile_user_types_type ON user_profile_user_types(user_type_id);
```

#### practice_sessions 테이블
```sql
CREATE TABLE practice_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    practice_date DATE NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    actual_play_time INTEGER DEFAULT 0, -- 초(seconds) 단위
    status VARCHAR(20) DEFAULT 'completed', -- 'in_progress', 'completed'
    instrument VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 성능 최적화를 위한 인덱스
CREATE INDEX idx_practice_sessions_user_date ON practice_sessions(user_id, practice_date);
CREATE INDEX idx_practice_sessions_date ON practice_sessions(practice_date DESC);
```

#### groups 테이블
```sql
CREATE TABLE groups (
    group_id SERIAL PRIMARY KEY,
    group_name VARCHAR(200) NOT NULL,
    description TEXT,
    owner_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    max_members INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### group_members 테이블
```sql
CREATE TABLE group_members (
    member_id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'member'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);
```

#### posts 테이블
```sql
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general', -- 'tip', 'question', 'free'
    auto_tags TEXT[], -- 작성자의 악기, 성향 등 자동 태그
    manual_tags TEXT[], -- 사용자가 직접 추가한 태그
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    deleted_at TIMESTAMP, -- Soft delete: 삭제 시점 기록 (NULL이면 활성 상태)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 성능 최적화를 위한 인덱스
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_deleted_at ON posts(deleted_at); -- Soft delete 쿼리 최적화
```

#### comments 테이블
```sql
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    parent_comment_id INTEGER REFERENCES comments(comment_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 성능 최적화를 위한 인덱스
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
```

#### post_likes 테이블
```sql
CREATE TABLE post_likes (
    like_id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
```

#### comment_likes 테이블
```sql
CREATE TABLE comment_likes (
    like_id SERIAL PRIMARY KEY,
    comment_id INTEGER REFERENCES comments(comment_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);
```

#### achievements 테이블
```sql
CREATE TABLE achievements (
    achievement_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    condition_type VARCHAR(50), -- 'practice_time', 'consecutive_days', 'instrument_count'
    condition_value INTEGER,
    icon_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### user_achievements 테이블
```sql
CREATE TABLE user_achievements (
    user_achievement_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(achievement_id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);
```

#### social_accounts 테이블
```sql
CREATE TABLE social_accounts (
    social_account_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'kakao', 'naver'
    provider_user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);
```

#### recording_files 테이블
```sql
CREATE TABLE recording_files (
    recording_id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES practice_sessions(session_id) ON DELETE CASCADE,
    file_path VARCHAR(500),
    file_size BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
```

### 4.2 React 클라이언트 저장소
- **로컬 캐싱**: localStorage (Phase 1), IndexedDB (Phase 2)를 통한 연습 기록 로컬 저장
- **동기화**: PostgreSQL과 실시간 동기화 (WebSocket) (Phase 2)
- **성능 최적화**: 로컬 캐싱으로 빠른 데이터 접근 및 오프라인 지원 (Phase 2)
- **상태 관리**: Zustand를 통한 클라이언트 상태 관리 (Phase 1)

### 4.3 AWS 데이터 저장소
- **PostgreSQL**: 메인 데이터베이스 (AWS RDS 프리티어 또는 EC2 내 설치)
- **S3**: 대용량 오디오 파일 임시 저장 (Phase 2부터)
- **Redis**: 세션 데이터 캐싱 (Phase 2부터, EC2 내 설치)

### 4.4 시드 데이터 (테스트 데이터)

#### 4.4.1 instruments 테이블 시드 데이터
```sql
INSERT INTO instruments (name, display_order) VALUES
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
('바순', 12);
```

#### 4.4.2 user_types 테이블 시드 데이터
```sql
INSERT INTO user_types (name, display_order) VALUES
('진학', 1),
('취미', 2),
('클래식', 3),
('재즈', 4),
('밴드', 5),
('오케스트라', 6),
('실용음악', 7),
('국악', 8);
```

#### 4.4.3 achievements 테이블 시드 데이터 (10개)
```sql
INSERT INTO achievements (title, description, condition_type, condition_value, icon_url) VALUES
-- 연습 시간 관련 칭호
('첫 걸음', '총 1시간 연습 달성', 'practice_time', 3600, NULL), -- 1시간 = 3600초
('열정의 시작', '총 10시간 연습 달성', 'practice_time', 36000, NULL), -- 10시간
('연습 마니아', '총 100시간 연습 달성', 'practice_time', 360000, NULL), -- 100시간
('마스터', '총 1000시간 연습 달성', 'practice_time', 3600000, NULL), -- 1000시간

-- 연속 연습일 관련 칭호
('하루의 시작', '1일 연속 연습', 'consecutive_days', 1, NULL),
('일주일의 약속', '7일 연속 연습', 'consecutive_days', 7, NULL),
('한 달의 도전', '30일 연속 연습', 'consecutive_days', 30, NULL),
('100일의 기적', '100일 연속 연습', 'consecutive_days', 100, NULL),

-- 악기 종류 관련 칭호
('다재다능', '3가지 이상 악기 연주', 'instrument_count', 3, NULL),
('올라운더', '5가지 이상 악기 연주', 'instrument_count', 5, NULL);
```

## 5. React 구현 방안

### 5.1 React 패키지 의존성

#### Phase 1 (MVP) 필수 패키지
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "zustand": "^4.4.0",
    "axios": "^1.5.0",
    "react-router-dom": "^6.16.0",
    "@tanstack/react-query": "^5.0.0",
    "react-hook-form": "^7.47.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    "react-calendar": "^4.6.0",
    "recharts": "^2.8.0",
    "jwt-decode": "^4.0.0",
    "date-fns": "^2.30.0",
    "react-hot-toast": "^2.4.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.1.0",
    "eslint": "^8.50.0",
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0",
    "prettier": "^3.0.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0"
  }
}
```

#### Phase 2 추가 패키지
```json
{
  "dependencies": {
    "localforage": "^1.10.0",
    "dexie": "^3.2.0",
    "react-webcam": "^7.1.0",
    "wavesurfer.js": "^7.0.0",
    "socket.io-client": "^4.6.0",
    "react-oauth/google": "^0.11.0"
  }
}
```

#### Phase 3 추가 패키지 (선택사항)
```json
{
  "dependencies": {
    "@reduxjs/toolkit": "^1.9.0",
    "react-redux": "^8.1.0",
    "framer-motion": "^10.16.0"
  }
}
```

### 5.2 PostgreSQL + AWS 연동
- **인증**: JWT (Phase 1), OAuth (구글, 카카오, 네이버) (Phase 2)
- **데이터베이스**: PostgreSQL (Phase 1), 실시간 동기화 (Phase 2)
- **파일 저장**: AWS S3 (Phase 2)
- **AI 처리**: AWS Lambda 함수 호출 (Phase 2)
- **실시간 동기화**: WebSocket (Socket.io) + PostgreSQL LISTEN/NOTIFY (Phase 2)

### 5.3 React 아키텍처
- **상태 관리**: Zustand (Phase 1), Redux Toolkit (선택사항, Phase 3)
- **서버 상태 관리**: React Query (TanStack Query)
- **라우팅**: React Router v6
- **폼 관리**: React Hook Form + Zod
- **로컬 저장소**: localStorage (Phase 1), IndexedDB (대용량 데이터, Dexie.js) (Phase 2)
- **빌드 도구**: Vite
- **코드 품질**: ESLint + Prettier + TypeScript

### 5.4 API 연동 방식
- **REST API**: FastAPI 백엔드와 Axios로 통신
- **AWS API**: Axios로 AWS Lambda 호출 (Phase 2)
- **실시간 데이터**: WebSocket (Socket.io) + PostgreSQL LISTEN/NOTIFY (Phase 2)
- **파일 업로드**: AWS S3 직접 업로드 (Presigned URL) (Phase 2)
- **AI 분석**: AWS Lambda 함수 비동기 호출 (Phase 2)
- **오프라인 지원**: Service Worker + IndexedDB 캐싱 + PostgreSQL 동기화 (Phase 2)
- **에러 처리**: React Query의 에러 핸들링 및 재시도 로직

## 6. 보안 및 개인정보 보호

### 6.1 데이터 보안
- **파일 보안**: AWS S3 임시 저장 + 자동 삭제 (Lambda) (Phase 2)
- **인증**: JWT 토큰 (Phase 1), OAuth + AWS IAM 역할 (Phase 2)
- **API 보안**: FastAPI 보안 + Lambda 권한 관리
  - CORS 설정: 허용된 도메인만 접근 가능
  - Rate Limiting: IP/사용자별 요청 제한
  - SQL Injection 방지: ORM 사용 (SQLAlchemy)
  - XSS 방지: React 기본 방어 + 입력 검증
- **데이터 암호화**: PostgreSQL 암호화 + S3 서버 사이드 암호화 (Phase 2)
- **비밀번호 보안**: bcrypt 해싱, 최소 길이 요구사항

### 6.2 개인정보 보호
- 최소한의 개인정보 수집
- 사용자 동의 하에 데이터 처리
- GDPR 준수
- **Soft Delete 정책**: 사용자 및 게시글 삭제 시 완전 삭제가 아닌 `deleted_at` 필드로 상태 변경
  - 일반 사용자에게는 삭제된 데이터가 보이지 않도록 처리
  - 데이터베이스에는 삭제 시점 정보가 남아있어 복구 및 감사 목적으로 활용 가능
  - 실제 데이터 삭제는 관리자 권한으로만 가능 (장기 보관 정책에 따라)

## 7. 성능 요구사항

### 7.1 응답 시간
- API 응답 시간: 2초 이내
- 페이지 로딩 시간: 3초 이내
- AI 분석 시간: 30초 이내

### 7.2 동시 사용자
- 초기 목표: 1,000명 동시 접속
- 확장 가능한 아키텍처 설계

## 8. React 개발 단계

### 8.0 Phase 0 (프로젝트 설정) - 1주
- React + TypeScript 프로젝트 초기 설정 (Vite)
- Tailwind CSS 설정 및 기본 스타일 시스템 구축
- PostgreSQL 데이터베이스 설정 (AWS RDS 프리티어 또는 EC2 내 설치)
- AWS EC2 t3.micro 인스턴스 설정
- FastAPI 백엔드 기본 구조 구현
- 기본 CI/CD 파이프라인 설정 (GitHub Actions)
- 개발 환경 문서화

### 8.1 Phase 1 (MVP) - 2주
**핵심 기능만 구현**
- 기본 UI/UX 구현 (Tailwind CSS, 반응형 디자인)
- 사용자 인증 (이메일/비밀번호, JWT)
- 기본 프로필 관리 (닉네임, 악기 정보)
- 연습 기록 수동 입력 (시작/종료 시간)
- 기본 통계 (총 연습 시간, 연습 횟수)
- React Query를 통한 서버 상태 관리
- Zustand를 통한 클라이언트 상태 관리
- localStorage를 통한 로컬 저장소 설정
- 기본 에러 처리 및 로깅

### 8.1.5 Phase 1.5 (확장 MVP) - 1주
- 캘린더 뷰 (react-calendar 또는 커스텀 컴포넌트)
- 기본 게시판 기능 (게시글 작성/조회, 댓글 없음)
- 프로필 대시보드
- 연속 연습 일수 통계

### 8.2 Phase 2 - 3-4주
- 소셜 로그인 (구글, 카카오, 네이버)
- 실시간 녹음 기능 (Web Audio API, MediaRecorder API)
- AWS Lambda AI 분석 함수 구현
- AWS S3 파일 업로드/관리 (Presigned URL)
- 통계 기능 고도화 (Recharts)
- 게시판 기능 고도화 (댓글, 답글, 좋아요)
- 그룹 기능 구현
- WebSocket 실시간 동기화 (Socket.io)
- CloudWatch 모니터링 설정
- 오프라인 지원 강화 (Service Worker, IndexedDB)
- Redis 캐싱 도입
- React Router를 통한 라우팅 최적화

### 8.3 Phase 3 - 2-3주
- 칭호/도전과제 시스템 구현
- 공유 기능 (Web Share API)
- AWS SNS 알림 시스템 (이메일, 웹 푸시)
- 고급 AI 분석 (SageMaker)
- 웹 성능 최적화 (코드 스플리팅, lazy loading)
- CloudFront CDN 설정
- PWA (Progressive Web App) 지원
- SEO 최적화
- 배포 파이프라인 고도화 (CI/CD)

## 9. 추가 고려사항

### 9.1 비용 최적화 (AWS 프리티어 활용)

#### 프리티어 한도
- **EC2 t3.micro**: 750시간/월 (1년)
- **RDS PostgreSQL**: 20GB 저장, 750시간/월 (1년)
- **S3**: 5GB 저장, 20,000 GET 요청/월 (1년)
- **Lambda**: 1M 요청/월, 400,000 GB-초 (무기한)

#### Phase별 비용 최적화
- **Phase 1**: EC2 + RDS만 사용 (프리티어 내)
- **Phase 2**: S3, Lambda 추가 (프리티어 내)
- **Phase 3**: CloudFront, SNS 추가 (비용 발생 가능)

#### 비용 절감 전략
- CloudFront CDN: Phase 3로 이동 (초기에는 불필요)
- AWS SQS: Phase 2로 이동 (초기에는 DB 큐로 대체)
- AWS SNS: Phase 3로 이동
- Redis: Phase 2로 이동 (초기에는 메모리 캐싱으로 대체)

### 9.2 확장성
- 마이크로서비스 아키텍처 고려 (장기)
- 데이터베이스 샤딩 (장기)
- 캐싱 전략 (Phase 2부터)
- 로드 밸런싱 (사용자 증가 시)

### 9.3 모니터링 및 로깅

#### 로깅 전략
- **구조화된 로깅**: JSON 포맷 사용
- **로그 레벨**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **로그 수집**: CloudWatch Logs (Phase 2)
- **로그 보관**: 30일 (프리티어), 장기 보관은 S3로 아카이빙

#### 모니터링
- **성능 모니터링**: CloudWatch Metrics (Phase 2)
- **에러 추적**: CloudWatch Alarms + 이메일 알림
- **API 모니터링**: 응답 시간, 에러율 추적
- **데이터베이스 모니터링**: 쿼리 성능, 연결 수 추적

### 9.4 에러 처리

#### 백엔드 에러 처리
- **표준화된 에러 응답**: HTTP 상태 코드 + 에러 메시지
- **예외 처리**: FastAPI 예외 핸들러
- **검증**: Pydantic 모델 검증
- **로깅**: 모든 에러는 로그에 기록

#### 프론트엔드 에러 처리
- **React Query 에러 핸들링**: 자동 재시도, 에러 바운더리
- **사용자 친화적 메시지**: 기술적 에러를 사용자 언어로 변환
- **에러 로깅**: 클라이언트 에러를 서버로 전송 (선택사항)

### 9.5 테스트 전략

#### Phase 1
- **단위 테스트**: 핵심 비즈니스 로직 (Vitest)
- **API 테스트**: FastAPI 테스트 클라이언트

#### Phase 2
- **통합 테스트**: API 엔드포인트 통합 테스트
- **프론트엔드 테스트**: React 컴포넌트 테스트

#### Phase 3
- **E2E 테스트**: Playwright 또는 Cypress
- **성능 테스트**: 부하 테스트 (선택사항)

### 9.6 문서화

#### 개발 문서
- **API 문서**: Swagger/OpenAPI (FastAPI 자동 생성)
- **개발 환경 설정 가이드**: README.md
- **데이터베이스 스키마 문서**: ERD 다이어그램
- **배포 가이드**: 배포 절차 문서화

#### 사용자 문서
- **사용자 가이드**: 주요 기능 사용법 (Phase 2)
- **FAQ**: 자주 묻는 질문 (Phase 2)

## 10. React 기술적 도전 과제

### 10.1 AI 음성 분석
- **Web Audio API / MediaRecorder API**: 실시간 음성 녹음
- **AWS S3 업로드**: 대용량 오디오 파일 처리 (Presigned URL, 멀티파트 업로드)
- **AWS Lambda**: 서버리스 AI 분석 함수
- **SageMaker**: 커스텀 AI 모델 배포
- **SQS 큐잉**: 배치 처리 및 비동기 분석
- **Web Workers**: 오디오 파일 처리 시 메인 스레드 블로킹 방지

### 10.2 파일 관리
- **Blob API**: 브라우저 내 오디오 파일 관리
- **AWS S3**: 대용량 오디오 파일 저장
- **Lambda 자동 삭제**: S3 Lifecycle 정책 + Lambda 함수
- **메모리 최적화**: Stream 기반 파일 처리, 청크 단위 업로드
- **백업 전략**: PostgreSQL + S3 이중 저장
- **IndexedDB**: 오프라인 파일 캐싱

### 10.3 실시간 기능
- **WebSocket (Socket.io) + PostgreSQL LISTEN/NOTIFY**: 실시간 데이터 동기화
- **AWS SNS**: 이메일/웹 푸시 알림 및 이벤트 처리
- **CloudWatch Events**: Lambda 트리거 및 모니터링
- **React Query**: 서버 상태 관리 및 실시간 데이터 동기화
- **Redux Toolkit / Zustand**: 클라이언트 상태 관리
- **오프라인 지원**: Service Worker + IndexedDB 캐싱 + PostgreSQL 동기화

### 10.4 웹 최적화
- **반응형 UI**: Tailwind CSS 반응형 클래스, CSS Grid, Flexbox 활용
- **성능 최적화**: React.memo, useMemo, useCallback을 통한 리렌더링 최적화
- **코드 스플리팅**: React.lazy, Suspense를 통한 동적 임포트 (Phase 3)
- **번들 최적화**: Vite 빌드 최적화, Tree shaking
- **웹 최적화**: React 앱 (Phase 1-2), CloudFront CDN (Phase 3)
- **PWA 지원**: Service Worker, Web App Manifest 설정 (Phase 3)
- **SEO 최적화**: React Helmet, SSR 고려 (Next.js로 마이그레이션 검토) (Phase 3)
- **AWS 최적화**: EC2 t3.micro 최적화 + Lambda 콜드 스타트 최적화
- **캐싱 전략**: React Query 캐싱 (Phase 1), HTTP 캐싱 헤더 (Phase 2), CloudFront 캐싱 (Phase 3)

## 11. 개발 진행 순서 (Phase 1 MVP 기준)

이 섹션은 Phase 1 (MVP) 개발을 위한 구체적인 단계별 작업 순서를 제시합니다. 이미 만들어진 페이지들에 기능을 연결하고 데이터베이스를 구축하는 과정을 단계별로 안내합니다.

### 11.1 1단계: 데이터베이스 설정 및 모델 생성 (우선순위: 최우선)

#### 11.1.1 데이터베이스 연결 설정
- `backend/app/core/database.py` 생성
  - SQLAlchemy 엔진 및 세션 설정
  - 데이터베이스 연결 풀 설정
- 데이터베이스 초기화 스크립트 작성

#### 11.1.2 데이터베이스 모델 생성 (`backend/app/models/`)
`requirements.md`의 테이블 구조에 따라 다음 모델 생성:
1. `user.py` - users, user_profiles, social_accounts
2. `instrument.py` - instruments (신규)
3. `user_type.py` - user_types (신규)
4. `user_profile.py` - user_profile_instruments, user_profile_user_types (신규)
5. `practice.py` - practice_sessions, recording_files
6. `group.py` - groups, group_members
7. `board.py` - posts, comments, post_likes, comment_likes
8. `achievement.py` - achievements, user_achievements

**주의사항:**
- 모든 모델에 Soft Delete 필드 (`deleted_at`) 적용 (users, posts)
- 관계 설정 (Foreign Key, 다대다 관계 등)

#### 11.1.3 Alembic 마이그레이션 설정
- Alembic 초기화 및 마이그레이션 스크립트 생성
- 초기 마이그레이션 파일 생성
- 마이그레이션 실행 스크립트 작성

#### 11.1.4 데이터베이스 생성 및 마이그레이션 실행
- PostgreSQL 데이터베이스 생성
- 마이그레이션 실행하여 테이블 생성
- 인덱스 생성 확인

---

### 11.2 2단계: 백엔드 API 개발 (인증 → 사용자 → 연습 기록 순서)

#### 11.2.1 인증 시스템 (`backend/app/routers/auth/`)
1. `auth.py` 라우터 생성
   - POST `/api/auth/register` - 회원가입
   - POST `/api/auth/login` - 로그인 (성공 시 `last_login_at` 업데이트)
   - POST `/api/auth/logout` - 로그아웃
   - GET `/api/auth/me` - 현재 사용자 정보
2. `schemas/auth.py` - 요청/응답 스키마 생성
3. JWT 토큰 생성/검증 로직 (`core/security.py` 확장)
   - 토큰 생성 함수
   - 토큰 검증 미들웨어

#### 11.2.2 사용자 관리 (`backend/app/routers/users/`)
1. `users.py` 라우터 생성
   - GET `/api/users/me` - 내 프로필 조회
   - PUT `/api/users/me` - 프로필 수정
   - DELETE `/api/users/me` - 회원 탈퇴 (Soft Delete: `deleted_at` 설정)
   - GET `/api/instruments` - 악기 목록 조회 (신규)
   - GET `/api/user-types` - 특징 목록 조회 (신규)
2. `schemas/users.py` - 사용자 스키마 생성
   - 프로필 조회 스키마
   - 프로필 수정 스키마
   - 악기/특징 선택 스키마

#### 11.2.3 연습 기록 API (`backend/app/routers/practice/`)
1. `practice.py` 라우터 생성
   - POST `/api/practice/sessions` - 연습 세션 시작
   - PUT `/api/practice/sessions/{session_id}` - 연습 세션 종료
   - GET `/api/practice/sessions` - 연습 기록 목록
   - GET `/api/practice/sessions/{session_id}` - 세션 상세
   - GET `/api/practice/statistics` - 통계 정보 (총 연습 시간, 연습 횟수, 연속 일수)
2. `schemas/practice.py` - 연습 기록 스키마 생성

#### 11.2.4 게시판 API (`backend/app/routers/board/`)
1. `board.py` 라우터 생성
   - GET `/api/board/posts` - 게시글 목록 (Soft Delete 필터링: `deleted_at IS NULL`)
   - POST `/api/board/posts` - 게시글 작성 (자동 태그 추가)
   - GET `/api/board/posts/{post_id}` - 게시글 상세 (Soft Delete 확인)
   - PUT `/api/board/posts/{post_id}` - 게시글 수정
   - DELETE `/api/board/posts/{post_id}` - 게시글 삭제 (Soft Delete: `deleted_at` 설정)
   - POST `/api/board/posts/{post_id}/likes` - 좋아요
   - POST `/api/board/posts/{post_id}/comments` - 댓글 작성
   - GET `/api/board/posts/{post_id}/comments` - 댓글 목록
2. `schemas/board.py` - 게시판 스키마 생성

#### 11.2.5 그룹 API (`backend/app/routers/groups/`)
1. `groups.py` 라우터 생성
   - GET `/api/groups` - 그룹 목록
   - POST `/api/groups` - 그룹 생성
   - GET `/api/groups/{group_id}` - 그룹 상세
   - POST `/api/groups/{group_id}/join` - 그룹 가입
   - DELETE `/api/groups/{group_id}/leave` - 그룹 탈퇴
2. `schemas/groups.py` - 그룹 스키마 생성

#### 11.2.6 칭호 API (`backend/app/routers/achievements/`)
1. `achievements.py` 라우터 생성
   - GET `/api/achievements` - 칭호 목록 조회
   - GET `/api/achievements/my` - 내가 획득한 칭호 목록
   - 칭호 자동 획득 로직 (연습 기록 저장 시 체크)
2. `schemas/achievements.py` - 칭호 스키마 생성

#### 11.2.7 라우터 등록 (`backend/app/main.py`)
- 모든 라우터를 FastAPI 앱에 등록
- API 문서 (Swagger) 자동 생성 확인

---

### 11.3 3단계: 시드 데이터 생성 (테스트용)

#### 11.3.1 시드 스크립트 작성 (`backend/scripts/seed_data.py`)
1. `instruments` 테이블 시드 데이터 (12개 악기)
2. `user_types` 테이블 시드 데이터 (8개 특징)
3. `achievements` 테이블 시드 데이터 (10개 칭호)
4. 테스트 사용자 3-5명 생성
5. 각 사용자별 프로필 생성 (악기 및 특징 연결)
6. 각 사용자별 연습 기록 10-20개 생성 (최근 30일)
7. 테스트 그룹 2-3개 생성
8. 테스트 게시글 10-20개 생성
9. 댓글 및 좋아요 데이터 생성
10. 일부 사용자에게 칭호 부여 (테스트용)

**시드 데이터 실행:**
```bash
python backend/scripts/seed_data.py
```

---

### 11.4 4단계: 프론트엔드 API 연동 (페이지별 순차 개발)

#### 11.4.1 API 클라이언트 설정 (`frontend/src/services/api/`)
1. `client.ts` 확장
   - Axios 인스턴스 설정
   - 요청/응답 인터셉터 추가
   - JWT 토큰 자동 첨부
   - 에러 처리
2. `endpoints.ts` - API 엔드포인트 상수 정의
3. `auth.ts` - 인증 API 함수
4. `users.ts` - 사용자 API 함수
5. `instruments.ts` - 악기 API 함수 (신규)
6. `userTypes.ts` - 특징 API 함수 (신규)
7. `practice.ts` - 연습 기록 API 함수
8. `board.ts` - 게시판 API 함수
9. `groups.ts` - 그룹 API 함수
10. `achievements.ts` - 칭호 API 함수 (신규)

#### 11.4.2 인증 기능 구현 (`frontend/src/components/AuthView.tsx`)
1. 로그인 폼 구현
   - 이메일/비밀번호 입력
   - 유효성 검사 (React Hook Form + Zod)
2. 회원가입 폼 구현
   - 이메일, 비밀번호, 닉네임 입력
   - 비밀번호 확인
   - 유효성 검사
3. React Query를 사용한 API 호출
4. JWT 토큰 저장/관리 (localStorage)
5. AppContext의 `login`, `logout` 함수 구현
6. 인증 상태 관리

#### 11.4.3 연습 기록 기능 (`frontend/src/components/RecordView.tsx`)
1. 연습 시작/종료 버튼 구현
2. 연습 기록 목록 표시
3. React Query로 데이터 페칭
4. AppContext의 `records` 관련 함수 구현
5. 실시간 연습 시간 표시 (타이머)

#### 11.4.4 캘린더 뷰 (`frontend/src/components/CalendarView.tsx`)
1. 캘린더 컴포넌트 연동 (react-calendar)
2. 날짜별 연습 기록 표시
3. 통계 정보 표시
   - 총 연습 시간
   - 연습 횟수
   - 연속 연습 일수
4. 날짜 클릭 시 상세 정보 표시

#### 11.4.5 프로필 뷰 (`frontend/src/components/ProfileView.tsx`)
1. 프로필 정보 표시
   - 닉네임, 프로필 이미지
   - 최종 접속일 (`last_login_at`)
   - 악기 목록 (다중 선택)
   - 특징 목록 (다중 선택)
   - 주요 악기 표시
2. 악기 및 특징 선택 UI (다중 선택 지원)
3. 주요 악기 지정 기능 (`is_primary` 플래그)
4. 프로필 수정 기능
5. 통계 대시보드
   - 총 연습 시간
   - 연습 횟수
   - 연속 연습 일수
6. 획득한 칭호 표시

#### 11.4.6 게시판 기능 (`frontend/src/components/BoardView.tsx`)
1. 게시글 목록 표시 (Soft Delete된 게시글 제외)
2. 필터링 기능
   - 태그 기반 필터링
   - 카테고리 필터링 (팁, 질문, 자유)
   - 악기별 필터링
3. 게시글 작성/수정/삭제 (Soft Delete 처리)
4. 댓글 기능
   - 댓글 작성
   - 답글 기능
   - 댓글 좋아요
5. 좋아요 기능
6. 게시글 상세 보기 (`PostDetailView.tsx`)

#### 11.4.7 그룹 기능 (`frontend/src/components/GroupsView.tsx`)
1. 그룹 목록 표시
2. 그룹 생성/가입
3. 그룹 상세 정보 (`GroupDetailView.tsx`)
4. 그룹 멤버 목록
5. 그룹 통계

#### 11.4.8 설정 기능 (`frontend/src/components/SettingsView.tsx`)
1. 계정 설정
   - 이메일 변경
   - 비밀번호 변경
2. 프로필 설정
   - 닉네임 변경
   - 프로필 이미지 업로드
   - 악기/특징 변경
3. 회원 탈퇴 (Soft Delete 처리)
   - 확인 다이얼로그
   - 탈퇴 후 로그아웃 처리

---

### 11.5 5단계: 통합 테스트 및 버그 수정

#### 11.5.1 기능 테스트
- 각 페이지별 기능 테스트
  - 인증 플로우 (회원가입 → 로그인 → 로그아웃)
  - 연습 기록 생성/조회
  - 프로필 수정
  - 게시글 작성/수정/삭제
  - 그룹 생성/가입
- Soft Delete 동작 확인
  - 삭제된 사용자가 목록에 보이지 않는지 확인
  - 삭제된 게시글이 목록에 보이지 않는지 확인
  - 관리자 권한으로 삭제된 데이터 조회 가능한지 확인
- API 연동 확인
  - 모든 엔드포인트 정상 동작 확인
  - 에러 케이스 처리 확인
- 에러 처리 확인
  - 네트워크 에러 처리
  - 인증 에러 처리
  - 유효성 검사 에러 처리

#### 11.5.2 데이터 검증
- 데이터베이스 데이터 일관성 확인
  - 외래키 제약조건 확인
  - Soft Delete 인덱스 성능 확인
  - 관계 데이터 정합성 확인
- 시드 데이터 검증
  - 모든 테이블에 데이터가 정상적으로 생성되었는지 확인
  - 관계 데이터가 올바르게 연결되었는지 확인

#### 11.5.3 성능 테스트
- API 응답 시간 측정
- 데이터베이스 쿼리 성능 확인
- 프론트엔드 로딩 시간 확인

---

### 11.6 주요 변경사항 요약

#### Soft Delete 처리
- **구현 방법**: 모든 쿼리에서 `WHERE deleted_at IS NULL` 조건 추가
- **삭제 API**: `deleted_at = CURRENT_TIMESTAMP`로 업데이트
- **복구 기능**: 관리자만 실제 삭제 가능 (향후 구현)

#### 악기 및 특징 관리
- **테이블 분리**: 별도 테이블로 관리하여 확장성 향상
- **다대다 관계**: 여러 악기/특징 선택 가능
- **주요 악기**: `is_primary` 플래그로 주요 악기 지정

#### 최종 접속일 관리
- **자동 업데이트**: 로그인 시 `last_login_at` 자동 업데이트
- **공개 정보**: 다른 사용자도 확인 가능
- **인덱스**: 최종 접속일 기준 정렬 최적화

#### 시드 데이터
- **악기**: 12개 악기 포함
- **특징**: 8개 특징 포함
- **칭호**: 10개 칭호 포함 (연습 시간, 연속 일수, 악기 종류)
- **테스트 데이터**: 사용자, 연습 기록, 게시글, 그룹 등 포함

---

### 11.7 예상 작업 시간

- **1단계**: 1-2일 (데이터베이스 설정 및 모델 생성)
- **2단계**: 3-5일 (백엔드 API 개발)
- **3단계**: 0.5일 (시드 데이터 생성)
- **4단계**: 4-6일 (프론트엔드 API 연동)
- **5단계**: 1-2일 (통합 테스트)

**총 예상 시간**: 약 2주 (Phase 1 MVP 기준)

---

### 11.8 권장 작업 순서 요약

```
1. DB 설정 (데이터베이스 연결, 모델, 마이그레이션)
   ↓
2. 백엔드 API 개발 (인증 → 사용자 → 연습 기록 → 게시판 → 그룹 → 칭호)
   ↓
3. 시드 데이터 생성 (테스트 데이터)
   ↓
4. 프론트엔드 API 연동 (인증 → 연습 기록 → 캘린더 → 프로필 → 게시판 → 그룹)
   ↓
5. 통합 테스트
```

이 순서로 진행하면 단계적으로 기능을 연결하고 테스트할 수 있습니다.
