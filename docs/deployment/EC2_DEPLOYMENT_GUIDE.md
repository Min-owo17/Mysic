# EC2 배포 가이드

이 문서는 확장된 프로젝트 구조를 AWS EC2에 배포하는 방법을 안내합니다.

## 사전 준비사항

1. **AWS EC2 인스턴스**
   - 인스턴스 타입: t3.micro (프리티어)
   - OS: Amazon Linux 2, Amazon Linux 2023, Ubuntu 22.04 LTS 등
   - 보안 그룹: SSH (22), HTTP (80), HTTPS (443), API (8000)

2. **SSH 키 페어**
   - EC2 인스턴스 생성 시 다운로드한 `.pem` 파일

## 배포 단계

### 1단계: EC2 서버 초기 설정

#### 1.1 EC2 서버 접속

```bash
# Amazon Linux의 경우
ssh -i your-key.pem ec2-user@your-ec2-ip

# Ubuntu의 경우
ssh -i your-key.pem ubuntu@your-ec2-ip
```

#### 1.2 초기 설정 스크립트 실행

```bash
# 프로젝트를 먼저 클론한 경우
cd Mysic
chmod +x infrastructure/aws/setup-ec2.sh
./infrastructure/aws/setup-ec2.sh
```

**⚠️ 중요**: docker 그룹 변경사항을 적용하려면 로그아웃 후 다시 로그인하세요.

```bash
exit
# 다시 접속
ssh -i your-key.pem ec2-user@your-ec2-ip  # Amazon Linux
```

### 2단계: 프로젝트 코드 배포

#### 2.1 GitHub에서 코드 클론

```bash
# Amazon Linux의 경우
cd /home/ec2-user

# Ubuntu의 경우
cd /home/ubuntu

# 프로젝트 클론
git clone https://github.com/Min-owo17/Mysic.git
cd Mysic
```

#### 2.2 환경 변수 파일 생성

```bash
cp infrastructure/aws/env.example .env.production
nano .env.production
```

**필수 환경 변수 설정:**

```env
# Database Configuration
POSTGRES_USER=mysic_user
POSTGRES_PASSWORD=강력한-비밀번호-입력
POSTGRES_DB=mysic_db

# Backend Configuration
SECRET_KEY=최소-32자-랜덤-문자열-생성
ENVIRONMENT=production
CORS_ORIGINS=http://15.164.128.169,http://15.164.128.169:8000

# Frontend Configuration
REACT_APP_API_URL=http://15.164.128.169:8000
```

**SECRET_KEY 생성:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**EC2 퍼블릭 IP 확인:**
```bash
curl -s http:/15.164.128.169/latest/meta-data/public-ipv4
```

#### 2.3 파일 권한 설정

```bash
chmod 600 .env.production
```

### 3단계: Docker로 서비스 실행

#### 3.1 배포 스크립트 실행 (Git 변경내용 가져오기 포함, 권장)

```bash
chmod +x infrastructure/aws/deploy.sh
./infrastructure/aws/deploy.sh

chmod +x infrastructure/aws/deploy-hub.sh
./infrastructure/aws/deploy-hub.sh
```

#### 3.2 수동 배포

```bash
# Docker Compose로 서비스 시작
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --build

# 로그 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f
```

### 4단계: 서비스 확인

#### 4.1 서비스 상태 확인

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps
```

모든 서비스가 `Up` 상태여야 합니다.

#### 4.2 브라우저에서 확인(ec2 서버)

- **프론트엔드**: http://15.164.128.169
- **백엔드 API**: http://15.164.128.169:8000
- **API 문서**: http://15.164.128.169:8000/docs

### 5단계: 로그 확인

```bash
# 모든 서비스 로그
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f backend
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f frontend
```

## 서비스 관리

### 서비스 재시작

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml restart
```

### 서비스 중지

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml down
```

### 코드 업데이트 및 재배포

```bash
# 코드 업데이트
git pull

# 재배포
./infrastructure/aws/deploy.sh
```

### Docker 리소스 정리

디스크 공간이 부족할 때 Docker 리소스를 정리합니다:

```bash
# 정리 스크립트에 실행 권한 부여 (최초 1회)
chmod +x infrastructure/aws/cleanup-docker.sh

# 안전 모드로 정리 (기본값, 7일 이상 사용하지 않은 이미지만 삭제)
./infrastructure/aws/cleanup-docker.sh

# 공격적 모드로 정리 (모든 사용하지 않는 리소스 삭제, 주의!)
./infrastructure/aws/cleanup-docker.sh --aggressive
```

자세한 내용은 [디스크 공간 부족 문제](#디스크-공간-부족-문제) 섹션을 참고하세요.

## 문제 해결

### 스크립트 실행 권한 오류 (Permission denied)

**증상**: `./infrastructure/aws/check-env.sh` 또는 다른 스크립트 실행 시 `Permission denied` 오류 발생

**원인**: 스크립트 파일에 실행 권한이 없음

**해결 방법**:

```bash
# 프로젝트 루트로 이동
cd /home/ec2-user/Mysic  # 또는 /home/ubuntu/Mysic

# 모든 스크립트에 실행 권한 부여 (권장)
chmod +x infrastructure/aws/*.sh

# 또는 특정 스크립트만 권한 부여
chmod +x infrastructure/aws/check-env.sh
chmod +x infrastructure/aws/deploy.sh
chmod +x infrastructure/aws/setup-ec2.sh

# 권한 확인
ls -l infrastructure/aws/*.sh
# 출력 예시: -rwxr-xr-x ... (x가 있으면 실행 권한이 있음)

# 이제 스크립트 실행
./infrastructure/aws/check-env.sh
```

**참고**: Git에서 클론한 파일은 기본적으로 실행 권한이 없을 수 있습니다. 처음 사용하기 전에 반드시 실행 권한을 부여해야 합니다.

### 포트 충돌

```bash
# 포트 사용 중인 프로세스 확인
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :8000

# 프로세스 종료
sudo kill -9 <PID>
```

### 컨테이너가 시작되지 않을 때

**증상**: `docker-compose ps`에서 PostgreSQL만 보이고 Backend/Frontend가 보이지 않음

#### 1. 문제 진단

```bash
# 모든 컨테이너 상태 확인 (중지된 컨테이너 포함)
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps -a

# 중지된 컨테이너 확인
docker ps -a | grep mysic

# Backend 로그 확인 (가장 중요!)
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs backend

# Frontend 로그 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs frontend

# PostgreSQL 상태 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps postgres
```

#### 2. 일반적인 원인 및 해결 방법

**원인 A: 환경 변수 누락 또는 잘못된 값**

```bash
# 환경 변수 확인 스크립트 실행
# ⚠️ Permission denied 오류가 발생하면 먼저 실행 권한 부여:
chmod +x infrastructure/aws/check-env.sh

# 스크립트 실행
./infrastructure/aws/check-env.sh

# 특히 다음 변수들이 필수입니다:
# - POSTGRES_USER
# - POSTGRES_PASSWORD
# - POSTGRES_DB
# - SECRET_KEY
# - REACT_APP_API_URL
```

**원인 B: PostgreSQL Health Check 실패**

Backend는 PostgreSQL이 healthy 상태가 되어야 시작됩니다. PostgreSQL이 unhealthy 상태일 수 있습니다:

```bash
# PostgreSQL 로그 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs postgres

# PostgreSQL health check 수동 실행
docker exec mysic_postgres_prod pg_isready -U mysic_user

# PostgreSQL 컨테이너 재시작
docker-compose -f infrastructure/aws/docker-compose.prod.yml restart postgres

# 잠시 대기 후 상태 확인
sleep 10
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps
```

**원인 C: Backend 빌드 실패**

```bash
# Backend 이미지 빌드 확인
docker images | grep mysic

# Backend 이미지 재빌드
docker-compose -f infrastructure/aws/docker-compose.prod.yml build --no-cache backend

# 빌드 로그 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml build backend
```

**원인 D: Backend 컨테이너가 시작 후 즉시 종료**

```bash
# Backend 컨테이너의 종료 코드 확인
docker inspect mysic_backend_prod | grep -A 10 "State"

# Backend 컨테이너를 직접 실행하여 에러 확인
docker run --rm --env-file .env.production \
  -e DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB} \
  -e SECRET_KEY=${SECRET_KEY} \
  mysic_backend_prod
```

**원인 E: 포트 충돌**

```bash
# 8000 포트 사용 확인
sudo netstat -tulpn | grep :8000
# 또는
sudo lsof -i :8000

# 80 포트 사용 확인
sudo netstat -tulpn | grep :80
# 또는
sudo lsof -i :80

# 포트를 사용하는 프로세스 종료
sudo kill -9 <PID>
```

**원인 F: 메모리 부족**

```bash
# 메모리 사용량 확인
free -h
docker stats --no-stream

# 사용하지 않는 컨테이너/이미지 정리
docker system prune -a
```

#### 3. 해결 방법

**방법 1: 전체 재시작 (권장)**

```bash
# 프로젝트 루트에서 실행
cd /home/ec2-user/Mysic

# 모든 컨테이너 중지 및 제거
docker-compose -f infrastructure/aws/docker-compose.prod.yml down

# 환경 변수 확인
./infrastructure/aws/check-env.sh

# 이미지 재빌드 및 시작
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --build

# 상태 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps

# 로그 확인 (실시간)
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f
```

**방법 2: 단계별 시작**

```bash
# 1. PostgreSQL만 시작
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d postgres

# 2. PostgreSQL이 healthy 상태가 될 때까지 대기
sleep 15
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps postgres

# 3. Backend 시작
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --build backend

# 4. Backend 로그 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f backend

# 5. Backend가 정상 작동하면 Frontend 시작
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --build frontend
```

**방법 3: 컨테이너 재생성**

```bash
# 특정 서비스만 재생성
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --force-recreate backend
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --force-recreate frontend
```

### 환경 변수 로드 문제

**증상**: `The "변수명" variable is not set. Defaulting to a blank string` 메시지가 여러 개 나타남

**원인**: 
- `.env.production` 파일이 프로젝트 루트에 없거나
- `docker-compose`를 잘못된 위치에서 실행하거나
- `check-env.sh` 스크립트를 잘못된 위치에서 실행하는 경우

#### 1. 문제 진단

```bash
# .env.production 파일이 프로젝트 루트에 있는지 확인
ls -la .env.production

# 파일 내용 확인 (비밀번호는 마스킹됨)
cat .env.production

# 필수 환경 변수 확인
cat .env.production | grep -E "POSTGRES_USER|POSTGRES_PASSWORD|POSTGRES_DB|SECRET_KEY"
```

#### 2. 해결 방법

**방법 A: .env.production 파일 생성/수정**

```bash
# 프로젝트 루트에서 실행 (중요!)
cd /home/ec2-user/Mysic  # 또는 /home/ubuntu/Mysic

# env.example을 복사하여 .env.production 생성
cp infrastructure/aws/env.example .env.production

# 파일 편집
nano .env.production
```

**필수로 설정해야 할 환경 변수:**

```env
# Database Configuration (필수)
POSTGRES_USER=mysic_user
POSTGRES_PASSWORD=강력한-비밀번호-입력
POSTGRES_DB=mysic_db

# Backend Configuration (필수)
SECRET_KEY=최소-32자-랜덤-문자열-생성
ENVIRONMENT=production
CORS_ORIGINS=http://15.164.128.169,http://15.164.128.169:8000

# Frontend Configuration (필수)
REACT_APP_API_URL=http://15.164.128.169:8000

# AWS Configuration (선택사항 - S3 사용 시에만 필요)
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=your-s3-bucket-name
```

**SECRET_KEY 생성:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**EC2 퍼블릭 IP 확인:**
```bash
curl -s http://169.254.169.254/latest/meta-data/public-ipv4
```

**방법 B: 파일 권한 설정**

```bash
# .env.production 파일 권한 설정 (보안)
chmod 600 .env.production
```

**방법 C: docker-compose 실행 위치 확인**

`.env.production` 파일은 **프로젝트 루트**에 있어야 합니다. 
`docker-compose.prod.yml`에서 `../../.env.production` 경로를 참조하므로, **반드시 프로젝트 루트에서 실행**해야 합니다:

```bash
# 프로젝트 루트로 이동
cd /home/ec2-user/Mysic  # 또는 /home/ubuntu/Mysic

# 현재 위치 확인
pwd
# 출력: /home/ec2-user/Mysic (프로젝트 루트여야 함)

# .env.production 파일 확인
ls -la .env.production

# 프로젝트 루트에서 docker-compose 실행 (중요!)
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --build
```

**⚠️ 중요**: `docker-compose`는 반드시 프로젝트 루트(`/home/ec2-user/Mysic`)에서 실행해야 합니다. 
다른 디렉토리에서 실행하면 상대 경로(`../../.env.production`)가 잘못된 위치를 가리켜 환경 변수를 찾을 수 없습니다.

**방법 D: 환경 변수 수동 export (임시 해결책)**

`.env.production` 파일이 제대로 로드되지 않는 경우:

```bash
# 환경 변수 수동 export
export $(cat .env.production | grep -v '^#' | xargs)

# docker-compose 실행
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --build
```

**방법 E: 환경 변수 검증 스크립트**

제공된 검증 스크립트를 사용하여 환경 변수를 확인하세요:

```bash
# ⚠️ 중요: 스크립트에 실행 권한 부여 (필수!)
chmod +x infrastructure/aws/check-env.sh

# 스크립트 실행 (어디서든 실행 가능 - 자동으로 프로젝트 루트를 찾습니다)
./infrastructure/aws/check-env.sh

# 또는 명시적으로 경로 지정
./infrastructure/aws/check-env.sh /home/ec2-user/Mysic/.env.production
```

**⚠️ Permission denied 오류 발생 시:**

`Permission denied` 오류가 발생하면 스크립트에 실행 권한이 없는 것입니다. 다음 명령어로 실행 권한을 부여하세요:

```bash
# 프로젝트 루트에서 실행
cd /home/ec2-user/Mysic  # 또는 /home/ubuntu/Mysic

# 실행 권한 부여
chmod +x infrastructure/aws/check-env.sh

# 권한 확인 (선택사항)
ls -l infrastructure/aws/check-env.sh
# 출력 예시: -rwxr-xr-x ... (x가 있으면 실행 권한이 있음)

# 이제 스크립트 실행
./infrastructure/aws/check-env.sh
```

**참고**: 수정된 스크립트는 실행 위치와 관계없이 자동으로 프로젝트 루트를 찾아 `.env.production` 파일을 검색합니다.

#### 3. 재배포

환경 변수를 수정한 후:

```bash
# 기존 컨테이너 중지
docker-compose -f infrastructure/aws/docker-compose.prod.yml down

# 다시 시작
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --build

# 로그 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f
```

### PostgreSQL 컨테이너가 unhealthy 상태일 때

PostgreSQL 컨테이너가 unhealthy 상태인 경우 다음을 시도하세요:

#### 1. 문제 진단

```bash
# 진단 스크립트 실행
chmod +x infrastructure/aws/troubleshoot-postgres.sh
./infrastructure/aws/troubleshoot-postgres.sh
```

또는 수동으로:

```bash
# PostgreSQL 로그 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs postgres

# 컨테이너 상태 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps postgres

# Health check 수동 실행
docker exec mysic_postgres_prod pg_isready -U mysic_user
```

#### 2. 해결 방법

**방법 A: 컨테이너 재시작**
```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml restart postgres
```

**방법 B: 볼륨 삭제 후 재생성 (데이터 손실 주의!)**
```bash
# 모든 컨테이너 중지
docker-compose -f infrastructure/aws/docker-compose.prod.yml down

# 볼륨 삭제
docker volume rm mysic_postgres_data_prod

# 다시 시작
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d
```

**방법 C: 환경 변수 확인**
```bash
# .env.production 파일 확인
cat .env.production | grep POSTGRES

# 환경 변수가 올바르게 설정되어 있는지 확인
# POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB가 모두 설정되어 있어야 합니다
```

**방법 D: Health check 시간 증가**
PostgreSQL 초기화에 시간이 오래 걸리는 경우, `docker-compose.prod.yml`의 `start_period`를 늘릴 수 있습니다.

### 메모리 부족 문제

EC2 t3.micro (1GB RAM) 환경에서 메모리 부족으로 컨테이너가 멈추는 경우:

#### 1. 메모리 사용량 확인

```bash
# 컨테이너별 메모리 사용량 확인
docker stats --no-stream

# 시스템 메모리 확인
free -h
```

#### 2. 메모리 제한 설정

`docker-compose.prod.yml`에 이미 메모리 제한이 설정되어 있습니다:
- PostgreSQL: 400MB 제한
- Backend: 400MB 제한
- Frontend: 128MB 제한

#### 3. 메모리 부족 시 조정

메모리가 부족한 경우 `docker-compose.prod.yml`에서 `mem_limit` 값을 조정:

```yaml
# 예시: 메모리 제한 감소
postgres:
  mem_limit: 300m  # 400m에서 300m로 감소

backend:
  mem_limit: 300m  # 400m에서 300m로 감소
```

#### 4. Swap 메모리 설정 (임시 해결책)

```bash
# 1GB Swap 파일 생성
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구적으로 설정
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### 5. 추가 최적화

```bash
# 사용하지 않는 Docker 이미지 삭제
docker image prune -a

# 사용하지 않는 볼륨 삭제
docker volume prune
```

자세한 내용은 `infrastructure/aws/memory-optimization.md`를 참고하세요.

### 데이터베이스 마이그레이션 오류

#### 1. 순환 Import 오류 (Circular Import Error)

**증상**: `alembic upgrade head` 실행 시 다음 오류 발생
```
ImportError: cannot import name 'Base' from partially initialized module 
'app.core.database' (most likely due to a circular import)
```

**원인**: 
- `alembic/env.py`에서 `Base`를 모델보다 먼저 import하여 순환 참조 발생
- `app.models.__init__.py`가 `app.core.database`를 import하는데, `alembic/env.py`에서 먼저 `Base`를 import하면 순환 참조 발생

**해결 방법**:

`backend/alembic/env.py` 파일의 import 순서를 수정:

```python
# ❌ 잘못된 순서 (순환 import 발생)
from app.core.config import settings
from app.core.database import Base  # ← 먼저 Base import
from app.models import *  # ← 모델 import 시 순환 참조 발생

# ✅ 올바른 순서 (수정됨)
from app.core.config import settings
from app.models import *  # ← 모델을 먼저 import
from app.core.database import Base  # ← 그 다음 Base import
```

**적용 방법**:

1. **로컬에서 수정 후 Git에 푸시**:
   ```bash
   # 로컬에서 파일 수정
   # backend/alembic/env.py 파일을 위 순서로 수정
   
   git add backend/alembic/env.py
   git commit -m "Fix circular import in alembic env.py"
   git push
   
   # EC2에서
   git pull
   docker-compose -f infrastructure/aws/docker-compose.prod.yml restart backend
   ```

2. **EC2에서 직접 수정**:
   ```bash
   # 백엔드 컨테이너 내부에서 수정
   docker exec -it mysic_backend_prod bash
   nano /app/alembic/env.py
   # import 순서를 위와 같이 수정
   exit
   
   # 백엔드 컨테이너 재시작
   docker-compose -f infrastructure/aws/docker-compose.prod.yml restart backend
   ```

3. **마이그레이션 재시도**:
   ```bash
   docker exec -it mysic_backend_prod alembic upgrade head
   ```

#### 2. 컨테이너 내부 경로 오류

**증상**: `cd /app/backend` 실행 시 `no such file or directory` 오류

**원인**: 
- Dockerfile에서 `WORKDIR /app`로 설정되어 있고, `backend/` 디렉토리의 내용이 `/app`에 직접 복사됨
- 따라서 `/app/backend` 경로는 존재하지 않음

**해결 방법**:

```bash
# 컨테이너 내부로 진입
docker exec -it mysic_backend_prod bash

# 현재 위치 확인 (보통 /app)
pwd

# 파일 구조 확인
ls -la

# 이미 /app에 있으므로 바로 alembic 실행 (cd 불필요)
alembic upgrade head

# 또는 컨테이너 외부에서 직접 실행 (더 간단)
docker exec -it mysic_backend_prod alembic upgrade head
```

#### 3. 데이터베이스 연결 오류

**증상**: `alembic upgrade head` 실행 시 데이터베이스 연결 실패

**해결 방법**:

```bash
# PostgreSQL 컨테이너 상태 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps postgres

# PostgreSQL 연결 테스트
docker exec -it mysic_postgres_prod pg_isready -U mysic_user

# DATABASE_URL 환경 변수 확인
docker exec -it mysic_backend_prod env | grep DATABASE_URL

# .env.production 파일 확인
cat .env.production | grep POSTGRES
```

#### 4. 마이그레이션 파일이 없는 경우

**증상**: `alembic upgrade head` 실행 시 마이그레이션 파일이 없다는 오류

**해결 방법**:

```bash
# 초기 마이그레이션 생성
docker exec -it mysic_backend_prod bash
cd /app
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
exit
```

#### 5. SQLAlchemy ArgumentError: postgresql_unique_constraint 오류

**증상**: `alembic upgrade head` 실행 시 다음 오류 발생
```
sqlalchemy.exc.ArgumentError: Argument 'postgresql_unique_constraint' is not accepted 
by dialect 'postgresql' on behalf of <class 'sqlalchemy.sql.schema.Table'>
```

**원인**: 
- `postgresql_unique_constraint`는 유효한 SQLAlchemy 인자가 아닙니다
- 복합 유니크 제약조건을 정의할 때는 `UniqueConstraint`를 사용해야 합니다

**해결 방법**:

모델 파일에서 `__table_args__`를 다음과 같이 수정:

```python
# ❌ 잘못된 방법
from sqlalchemy import Column, Integer, String, ForeignKey
from app.core.database import Base

class MyModel(Base):
    __tablename__ = "my_table"
    
    id = Column(Integer, primary_key=True)
    field1 = Column(String(50))
    field2 = Column(String(50))
    
    __table_args__ = (
        {"postgresql_unique_constraint": ("field1", "field2")},  # ❌ 잘못됨
    )

# ✅ 올바른 방법
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from app.core.database import Base

class MyModel(Base):
    __tablename__ = "my_table"
    
    id = Column(Integer, primary_key=True)
    field1 = Column(String(50))
    field2 = Column(String(50))
    
    __table_args__ = (
        UniqueConstraint("field1", "field2", name="uq_my_table_field1_field2"),  # ✅ 올바름
    )
```

**수정이 필요한 파일들**:
- `backend/app/models/user.py` - `SocialAccount` 모델
- `backend/app/models/board.py` - `PostLike`, `CommentLike` 모델
- `backend/app/models/group.py` - `GroupMember` 모델
- `backend/app/models/achievement.py` - `UserAchievement` 모델

**적용 방법**:

1. **로컬에서 수정 후 Git에 푸시**:
   ```bash
   # 모든 모델 파일 수정 후
   git add backend/app/models/*.py
   git commit -m "Fix: Replace postgresql_unique_constraint with UniqueConstraint"
   git push
   
   # EC2에서
   git pull
   docker-compose -f infrastructure/aws/docker-compose.prod.yml restart backend
   ```

2. **마이그레이션 재시도**:
   ```bash
   docker exec -it mysic_backend_prod alembic upgrade head
   ```

#### 6. PostgreSQL 연결 오류: 비밀번호 미제공

**증상**: `alembic upgrade head` 또는 백엔드 실행 시 다음 오류 발생
```
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) connection to server at "postgres" (172.21.0.2), 
port 5432 failed: fe_sendauth: no password supplied
```

**원인**: 
- `.env.production` 파일이 없거나 잘못된 위치에 있음
- `.env.production` 파일에 `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`가 제대로 설정되지 않음
- Docker Compose가 환경 변수를 제대로 확장하지 못함
- 백엔드 컨테이너 내부에서 `DATABASE_URL`이 제대로 설정되지 않음

**해결 방법**:

1. **`.env.production` 파일 확인**:
   ```bash
   # 프로젝트 루트에서 실행
   cd /home/ec2-user/Mysic  # 또는 프로젝트 경로
   
   # .env.production 파일 존재 확인
   ls -la .env.production
   
   # .env.production 파일 내용 확인 (비밀번호는 마스킹)
   cat .env.production | grep POSTGRES
   ```

2. **`.env.production` 파일 생성/수정**:
   ```bash
   # 파일이 없으면 생성
   if [ ! -f .env.production ]; then
       cp infrastructure/aws/env.example .env.production
   fi
   
   # 파일 편집
   nano .env.production
   ```

   다음 내용이 반드시 포함되어 있어야 합니다:
   ```env
   # Database Configuration
   POSTGRES_USER=mysic_user
   POSTGRES_PASSWORD=your-secure-password-here  # ⚠️ 실제 비밀번호로 변경 필요
   POSTGRES_DB=mysic_db
   ```

3. **DATABASE_URL 직접 설정 (권장)**:
   
   `.env.production` 파일에 `DATABASE_URL`을 직접 추가:
   ```env
   # Database Configuration
   POSTGRES_USER=mysic_user
   POSTGRES_PASSWORD=your-secure-password-here
   POSTGRES_DB=mysic_db
   
   # Database URL (Docker Compose 환경 변수 확장 문제 해결)
   DATABASE_URL=postgresql://mysic_user:your-secure-password-here@postgres:5432/mysic_db
   ```
   
   ⚠️ **주의**: `DATABASE_URL`의 비밀번호를 실제 비밀번호로 변경해야 합니다.

4. **환경 변수 확인**:
   ```bash
   # 백엔드 컨테이너의 환경 변수 확인
   docker exec -it mysic_backend_prod env | grep DATABASE_URL
   
   # DATABASE_URL이 비어있거나 잘못된 경우
   # 컨테이너 재시작 필요
   ```

5. **컨테이너 재시작**:
   ```bash
   # 모든 컨테이너 중지
   docker-compose -f infrastructure/aws/docker-compose.prod.yml down
   
   # 환경 변수 다시 로드하여 시작
   docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d
   
   # 또는 백엔드만 재시작
   docker-compose -f infrastructure/aws/docker-compose.prod.yml restart backend
   ```

6. **연결 테스트**:
   ```bash
   # PostgreSQL 연결 테스트
   docker exec -it mysic_postgres_prod psql -U mysic_user -d mysic_db
   # 연결되면 \q로 종료
   
   # 백엔드에서 DATABASE_URL 확인
   docker exec -it mysic_backend_prod python -c "
   import os
   print('DATABASE_URL:', os.getenv('DATABASE_URL', 'NOT SET'))
   "
   ```

**중요: docker-compose.prod.yml의 우선순위 문제**

`docker-compose.prod.yml`의 `environment` 섹션에서 설정한 환경 변수는 `env_file`의 값보다 **우선순위가 높습니다**. 

따라서 `docker-compose.prod.yml`에서 다음과 같이 `DATABASE_URL`을 설정하면:
```yaml
environment:
  - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

`.env.production` 파일에 `DATABASE_URL`을 설정해도 **무시됩니다**.

**해결 방법**: `docker-compose.prod.yml`에서 `DATABASE_URL`을 `environment` 섹션에서 제거하고, `.env.production`에서만 읽도록 수정했습니다.

```yaml
backend:
  env_file:
    - ../../.env.production
  environment:
    # DATABASE_URL은 .env.production에서 직접 읽도록 함
    # - DATABASE_URL=...  # ← 이 줄을 제거하거나 주석 처리
    - SECRET_KEY=${SECRET_KEY}
    - ENVIRONMENT=production
    # ... 기타 환경 변수
```

이제 `.env.production` 파일의 `DATABASE_URL`이 정상적으로 사용됩니다.

**최종 확인**:
```bash
# 백엔드 컨테이너에서 마이그레이션 재시도
docker exec -it mysic_backend_prod alembic upgrade head
```

### 디스크 공간 부족 문제

**증상**: Docker 빌드 중 `no space left on device` 오류 발생

**오류 예시**:
```
target backend: failed to solve: rpc error: code = Unknown desc = 
write /usr/local/lib/python3.11/site-packages/yaml/_yaml.cpython-311-x86_64-linux-gnu.so: 
no space left on device
```

**원인**: 
- EC2 t3.micro는 기본 8GB 스토리지만 제공
- Docker 이미지, 컨테이너, 볼륨, 빌드 캐시가 누적되면 디스크 공간 부족 발생
- 빌드 중 패키지 설치 단계에서 디스크가 가득 차면 해당 오류 발생

#### 1. 문제 진단

```bash
# 전체 디스크 사용량 확인
df -h

# Docker 관련 디스크 사용량 확인
docker system df

# 가장 큰 디렉토리 확인
sudo du -h --max-depth=1 / | sort -hr | head -10
```

#### 2. 즉시 해결 방법

**방법 A: 정리 스크립트 사용 (권장)**

```bash
# 프로젝트 루트로 이동
cd /home/ec2-user/Mysic  # 또는 /home/ubuntu/Mysic

# 스크립트에 실행 권한 부여
chmod +x infrastructure/aws/cleanup-docker.sh

# 안전 모드로 정리 (기본값)
./infrastructure/aws/cleanup-docker.sh

# 또는 공격적 모드로 정리 (모든 사용하지 않는 리소스 삭제, 주의!)
./infrastructure/aws/cleanup-docker.sh --aggressive
```

**방법 B: 수동 정리**

```bash
# 사용하지 않는 모든 Docker 리소스 정리
docker system prune -a --volumes

# 또는 단계별로 정리
# 1. 중지된 컨테이너 삭제
docker container prune -f

# 2. 사용하지 않는 이미지 삭제
docker image prune -a -f

# 3. 사용하지 않는 볼륨 삭제 (주의: 데이터 손실 가능)
docker volume prune -f

# 4. 빌드 캐시 삭제
docker builder prune -a -f
```

**방법 C: 추가 정리**

```bash
# 특정 이미지만 삭제
docker images
docker rmi <이미지_ID>

# 로그 파일 정리
sudo journalctl --vacuum-time=3d

# 패키지 캐시 정리 (Ubuntu/Debian)
sudo apt-get clean
sudo apt-get autoremove -y

# 패키지 캐시 정리 (Amazon Linux)
sudo yum clean all
```

#### 3. 정리 후 재배포

```bash
# 정리 완료 후 다시 배포
cd /home/ec2-user/Mysic  # 또는 /home/ubuntu/Mysic
./infrastructure/aws/deploy.sh
```

#### 4. 예방 방법

**정기적인 정리 스크립트 실행**

`cleanup-docker.sh` 스크립트를 cron에 추가하여 정기적으로 실행:

```bash
# cron 편집
crontab -e

# 다음 줄 추가 (매주 일요일 새벽 2시에 실행)
0 2 * * 0 /home/ec2-user/Mysic/infrastructure/aws/cleanup-docker.sh

# 또는 매일 새벽 3시에 실행
0 3 * * * /home/ec2-user/Mysic/infrastructure/aws/cleanup-docker.sh
```

**스토리지 확장 (장기 해결책)**

EC2 인스턴스의 스토리지를 확장하는 것을 고려하세요:

1. **AWS 콘솔에서 EBS 볼륨 크기 증가**
   - EC2 콘솔 → 볼륨 선택 → 작업 → 볼륨 수정
   - 크기를 8GB에서 16GB 또는 20GB로 증가

2. **파일 시스템 확장** (Linux)
   ```bash
   # 파일 시스템 확인
   lsblk
   df -h
   
   # 파일 시스템 확장 (Amazon Linux 2)
   sudo growpart /dev/xvda 1
   sudo xfs_growfs /
   
   # 파일 시스템 확장 (Ubuntu)
   sudo growpart /dev/nvme0n1 1
   sudo resize2fs /dev/nvme0n1p1
   ```

#### 5. 디스크 사용량 모니터링

```bash
# 디스크 사용량 확인 스크립트
#!/bin/bash
echo "=== 디스크 사용량 ==="
df -h
echo ""
echo "=== Docker 리소스 사용량 ==="
docker system df
echo ""
echo "=== 큰 디렉토리 Top 10 ==="
sudo du -h --max-depth=1 / 2>/dev/null | sort -hr | head -10
```

**참고**: 정기적으로 디스크 사용량을 확인하고, 80% 이상 사용 중이면 정리 스크립트를 실행하세요.

## 보안 체크리스트

- [ ] `.env.production` 파일 권한 설정: `chmod 600 .env.production`
- [ ] SSH 키 파일 권한 설정: `chmod 400 your-key.pem`
- [ ] 방화벽 설정 확인 (보안 그룹)
- [ ] SECRET_KEY를 강력한 랜덤 문자열로 변경
- [ ] 데이터베이스 비밀번호를 강력하게 설정
- [ ] SSL 인증서 설정 (프로덕션 환경, 선택사항)

## 다음 단계

- [ ] 도메인 연결
- [ ] SSL 인증서 설정 (Let's Encrypt)
- [ ] CloudWatch 모니터링 설정
- [ ] 자동 백업 설정
- [ ] CI/CD 파이프라인 구축

## 추가 자료

- [상세 배포 가이드](infrastructure/aws/README.md)
- [로컬 테스트 가이드](LOCAL_TEST.md)

