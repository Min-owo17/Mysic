# 로컬 Docker 개발 환경 가이드 (LOCAL_DOCKER_WALKTHROUGH)

이 문서는 `docker-compose`를 이용한 로컬 개발 환경 구성 및 배포 이미지 테스트 방법에 대해 설명합니다.

## 1. 환경 구성 개요
`docker-compose.yml` 설정을 통해 모든 서비스(Backend, Frontend, Database)를 개발용과 배포 테스트용으로 분리하여 실행할 수 있습니다.

### 개발 모드 (Development Mode)
로컬 소스코드를 직접 빌드하며, 코드 수정 시 즉시 반영(Hot-reloading)됩니다.
- **Frontend**: Port `5173:5173` (Vite Dev Server)
- **Backend**: Port `8000:8000` (Uvicorn Reload)
- **Database**: Port `5432:5432` (표준 `postgres:15-alpine`)

### 프로덕션 테스트 모드 (Production Test Mode)
Docker Hub에 배포된 이미지를 테스트할 때 사용합니다.
- **Frontend-prod**: Port `8080:80` (Nginx)
- **Backend-prod**: Port `8001:8000` (Gunicorn/Uvicorn)
- **Database-prod**: Port `5433:5432` (Custom Postgres Image)

---

## 2. 사용 방법 (명령어)

### 개발 환경 시작
```powershell
docker-compose --env-file .env.local up -d --build
```
- 특정 서비스만 시작: `docker-compose --env-file .env.local up -d [service_name]`

### 프로덕션 이미지 테스트
```powershell
docker-compose --env-file .env.local up -d frontend-prod backend-prod postgres-prod
```

### 서비스 종료
```powershell
docker-compose down
```
- 데이터 볼륨까지 삭제: `docker-compose down -v`

---

## 3. 데이터베이스 접속 및 설정

### DB 접속 정보 (Local/Host 접속용)
DBeaver, PGAdmin 등 외부 툴 사용 시:

| 항목 | 개발 모드 (Dev) | 프로덕션 모드 (Prod) |
| :--- | :--- | :--- |
| **Host** | `localhost` | `localhost` |
| **Port** | `5432` | `5433` |
| **Database** | `mysic_db` | `mysic_db` |
| **User** | `mysic_user` | `mysic_user` |
| **Password** | `mysic_password` | `mysic_password` |

### 초기 데이터베이스 설정 (Migration)
개발용 DB를 처음 실행했거나 초기화한 경우, 테이블 생성을 위해 마이그레이션을 실행해야 합니다.
```powershell
docker-compose exec backend alembic upgrade head
```

---

## 4. 문제 해결 (Troubleshooting)

### 500 에러 (UndefinedTable)
- **원인**: DB 테이블이 생성되지 않음.
- **해결**: 위 '초기 데이터베이스 설정' 섹션의 마이그레이션 명령어를 실행하세요.

### 500 에러 (UndefinedColumn)
- **원인**: 모델 코드와 DB 스키마 불일치 (예: `unique_code` 컬럼 누락).
- **해결**: 마이그레이션을 새로 생성하고 적용합니다.
```powershell
# 마이그레이션 생성
docker-compose exec backend alembic revision --autogenerate -m "fix_missing_columns"
# 적용
docker-compose exec backend alembic upgrade head
```

### 로그인 실패 (User not found)
- **원인**: 개발용 DB가 초기화되어 데이터가 없음.
- **해결**: 회원가입(Register)을 통해 새 계정을 생성한 후 로그인하세요.
