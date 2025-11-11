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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스: email은 UNIQUE 제약으로 자동 인덱스 생성됨
CREATE INDEX idx_users_nickname ON users(nickname);
```

#### user_profiles 테이블
```sql
CREATE TABLE user_profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    instruments TEXT[],
    user_type VARCHAR(50),
    bio TEXT,
    hashtags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 성능 최적화를 위한 인덱스
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_category ON posts(category);
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
- 회원 탈퇴 시 관련 데이터 완전 삭제 (CASCADE)

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
