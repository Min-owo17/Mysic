# 데이터베이스 설정 가이드

이 문서는 Mysic 프로젝트의 데이터베이스 설정 및 마이그레이션 방법을 안내합니다.

## 사전 준비사항

1. **PostgreSQL 설치 및 실행**
   - 로컬 개발: PostgreSQL이 설치되어 실행 중이어야 합니다.
   - Docker 사용: `docker-compose up -d postgres`로 PostgreSQL 컨테이너 실행

2. **환경 변수 설정**
   - `.env` 파일에 `DATABASE_URL` 설정
   - 기본값: `postgresql://mysic_user:mysic_password@localhost:5432/mysic_db`

## 데이터베이스 초기화 방법

### 방법 1: Alembic 마이그레이션 사용 (권장)

Alembic을 사용하여 데이터베이스 스키마를 관리합니다.

#### 1단계: Alembic 초기화 (최초 1회만)

```bash
cd backend
alembic init alembic
```

> **참고**: 이미 `alembic` 디렉토리가 존재하면 이 단계를 건너뛰세요.

#### 2단계: 초기 마이그레이션 생성

```bash
alembic revision --autogenerate -m "Initial migration"
```

이 명령은 현재 모델과 데이터베이스 상태를 비교하여 마이그레이션 파일을 자동 생성합니다.

#### 3단계: 마이그레이션 실행

```bash
alembic upgrade head
```

이 명령은 모든 마이그레이션을 실행하여 데이터베이스에 테이블을 생성합니다.

### 방법 2: 직접 테이블 생성 (개발용)

개발 환경에서 빠르게 테이블을 생성하려면:

```bash
cd backend
python -m app.core.database
```

또는:

```bash
cd backend
python scripts/init_db.py
```

## 마이그레이션 관리

### 새로운 마이그레이션 생성

모델을 변경한 후:

```bash
alembic revision --autogenerate -m "설명"
```

### 마이그레이션 실행

```bash
# 최신 버전으로 업그레이드
alembic upgrade head

# 특정 버전으로 업그레이드
alembic upgrade <revision>

# 한 단계 되돌리기
alembic downgrade -1

# 특정 버전으로 되돌리기
alembic downgrade <revision>
```

### 마이그레이션 히스토리 확인

```bash
alembic history
```

### 현재 마이그레이션 버전 확인

```bash
alembic current
```

## 데이터베이스 연결 확인

Python에서 직접 연결을 테스트하려면:

```python
from app.core.database import engine
from sqlalchemy import inspect

# 엔진 연결 테스트
with engine.connect() as conn:
    print("✅ 데이터베이스 연결 성공!")

# 테이블 목록 확인
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"생성된 테이블: {tables}")
```

## 문제 해결

### 1. 연결 오류

```
sqlalchemy.exc.OperationalError: could not connect to server
```

**해결 방법:**
- PostgreSQL이 실행 중인지 확인
- `DATABASE_URL`이 올바른지 확인
- 방화벽 설정 확인

### 2. 테이블이 이미 존재함

```
sqlalchemy.exc.ProgrammingError: relation "users" already exists
```

**해결 방법:**
- 기존 테이블을 삭제하고 다시 생성
- 또는 Alembic 마이그레이션 사용 (권장)

### 3. 모델 import 오류

```
ImportError: cannot import name 'User' from 'app.models'
```

**해결 방법:**
- `backend/app/models/__init__.py`에서 모든 모델이 올바르게 import되었는지 확인
- 모델 파일에 문법 오류가 없는지 확인

## 다음 단계

데이터베이스 초기화가 완료되면:

1. **시드 데이터 생성**: `backend/scripts/seed_data.py` 실행 (3단계에서 생성 예정)
2. **API 개발 시작**: 백엔드 라우터 개발 (2단계)

