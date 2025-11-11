# Mysic - 악기 연주자 연습 기록 서비스

악기 연주자들이 연습 기록을 저장하고 공유할 수 있는 웹 서비스입니다.

## 프로젝트 구조

```
Mysic/
├── frontend/              # React 프론트엔드
│   ├── src/
│   │   ├── components/    # 재사용 가능한 컴포넌트
│   │   │   ├── common/    # 공통 컴포넌트 (Button, Input 등)
│   │   │   └── layout/    # 레이아웃 컴포넌트 (Header, Footer, Sidebar 등)
│   │   ├── pages/         # 페이지 컴포넌트
│   │   │   ├── auth/      # 인증 관련 페이지 (로그인, 회원가입)
│   │   │   ├── dashboard/ # 대시보드 페이지
│   │   │   ├── practice/  # 연습 기록 관련 페이지
│   │   │   ├── board/     # 게시판 페이지
│   │   │   └── profile/   # 프로필 페이지
│   │   ├── hooks/         # 커스텀 React Hooks
│   │   ├── store/         # 상태 관리 (Zustand)
│   │   │   └── slices/    # 상태 슬라이스
│   │   ├── services/      # API 서비스 레이어
│   │   │   └── api/       # API 클라이언트 및 엔드포인트
│   │   ├── utils/         # 유틸리티 함수
│   │   ├── types/         # TypeScript 타입 정의
│   │   ├── assets/        # 정적 자산
│   │   │   ├── images/    # 이미지 파일
│   │   │   └── icons/     # 아이콘 파일
│   │   └── styles/        # 스타일 파일
│   └── public/            # 정적 파일 (index.html 등)
│
├── backend/               # FastAPI 백엔드
│   ├── app/
│   │   ├── routers/       # API 라우터
│   │   │   ├── auth/      # 인증 라우터
│   │   │   ├── users/     # 사용자 라우터
│   │   │   ├── practice/  # 연습 기록 라우터
│   │   │   ├── board/     # 게시판 라우터
│   │   │   └── groups/    # 그룹 라우터
│   │   ├── models/        # 데이터베이스 모델 (SQLAlchemy)
│   │   ├── schemas/       # Pydantic 스키마 (요청/응답 검증)
│   │   ├── services/      # 비즈니스 로직
│   │   ├── core/          # 핵심 설정
│   │   │   ├── config/    # 설정 파일
│   │   │   └── security/  # 보안 관련 (JWT, OAuth 등)
│   │   ├── utils/         # 유틸리티 함수
│   │   └── middleware/    # 미들웨어
│   ├── tests/             # 테스트 코드
│   └── scripts/           # 유틸리티 스크립트
│
├── database/              # 데이터베이스 관련
│   ├── migrations/        # 데이터베이스 마이그레이션 스크립트
│   ├── seeds/             # 시드 데이터
│   └── schemas/           # 데이터베이스 스키마 정의
│
├── docs/                  # 문서
│   ├── api/               # API 문서
│   ├── architecture/      # 아키텍처 문서
│   └── deployment/        # 배포 가이드
│
├── scripts/               # 프로젝트 유틸리티 스크립트
│
├── infrastructure/        # 인프라 설정
│   ├── aws/               # AWS 관련 설정
│   └── docker/            # Docker 설정
│
└── requirements.md        # 프로젝트 요구사항 문서
```

## 폴더별 상세 설명

### Frontend (`frontend/`)

#### `src/components/`
- **common/**: 프로젝트 전반에서 재사용되는 공통 컴포넌트
  - Button, Input, Modal, Toast 등
- **layout/**: 페이지 레이아웃을 구성하는 컴포넌트
  - Header, Footer, Sidebar, Navigation 등

#### `src/pages/`
- **auth/**: 인증 관련 페이지
  - Login, Signup, PasswordReset 등
- **dashboard/**: 사용자 대시보드
  - 통계, 캘린더 뷰 등
- **practice/**: 연습 기록 관련 페이지
  - PracticeSession, PracticeHistory 등
- **board/**: 게시판 페이지
  - PostList, PostDetail, PostCreate 등
- **profile/**: 프로필 관련 페이지
  - UserProfile, ProfileEdit 등

#### `src/hooks/`
- 커스텀 React Hooks
- 예: `useAuth`, `usePractice`, `useLocalStorage` 등

#### `src/store/`
- Zustand를 사용한 전역 상태 관리
- **slices/**: 기능별 상태 슬라이스
  - authSlice, practiceSlice, userSlice 등

#### `src/services/`
- API 통신 로직
- **api/**: Axios 인스턴스 및 API 엔드포인트 정의

#### `src/utils/`
- 유틸리티 함수
- 날짜 포맷팅, 유효성 검사, 헬퍼 함수 등

#### `src/types/`
- TypeScript 타입 정의
- API 응답 타입, 컴포넌트 Props 타입 등

### Backend (`backend/`)

#### `app/routers/`
- FastAPI 라우터 모듈
- 각 기능별로 분리된 라우터
- **auth/**: 인증 관련 엔드포인트
- **users/**: 사용자 관리 엔드포인트
- **practice/**: 연습 기록 엔드포인트
- **board/**: 게시판 엔드포인트
- **groups/**: 그룹 관리 엔드포인트

#### `app/models/`
- SQLAlchemy 데이터베이스 모델
- 테이블과 매핑되는 ORM 모델

#### `app/schemas/`
- Pydantic 스키마
- 요청/응답 데이터 검증 및 직렬화

#### `app/services/`
- 비즈니스 로직
- 데이터베이스 쿼리, 외부 API 호출 등

#### `app/core/`
- 핵심 설정 및 보안
- **config/**: 환경 변수, 데이터베이스 설정 등
- **security/**: JWT, OAuth, 암호화 등

#### `app/middleware/`
- FastAPI 미들웨어
- CORS, 인증, 로깅 등

### Database (`database/`)

#### `migrations/`
- 데이터베이스 마이그레이션 스크립트
- Alembic 또는 수동 SQL 스크립트

#### `seeds/`
- 초기 데이터 시드 스크립트
- 테스트 데이터, 기본 데이터 등

#### `schemas/`
- 데이터베이스 스키마 정의
- CREATE TABLE 스크립트 등

### Documentation (`docs/`)

#### `api/`
- API 문서
- Swagger/OpenAPI 스펙, 엔드포인트 설명 등

#### `architecture/`
- 아키텍처 문서
- 시스템 설계, 데이터베이스 ERD 등

#### `deployment/`
- 배포 가이드
- AWS 배포 절차, 환경 설정 등

### Infrastructure (`infrastructure/`)

#### `aws/`
- AWS 관련 설정 파일
- CloudFormation, Terraform, 설정 스크립트 등

#### `docker/`
- Docker 관련 파일
- Dockerfile, docker-compose.yml 등

## 개발 시작하기

자세한 개발 가이드는 `requirements.md`를 참고하세요.

## 기술 스택

- **Frontend**: React, TypeScript, Tailwind CSS, Zustand, React Query
- **Backend**: FastAPI, PostgreSQL, SQLAlchemy
- **Infrastructure**: AWS (EC2, RDS, S3, Lambda)

