# 배포 가이드

이 문서는 Mysic 프로젝트의 Docker 설정 및 AWS EC2 배포 방법을 안내합니다.

## 📋 목차

1. [로컬 개발 환경 설정](#로컬-개발-환경-설정)
   - [Windows 환경 빠른 시작](#windows-환경-빠른-시작)
   - [사전 요구사항](#사전-요구사항)
2. [AWS EC2 배포](#aws-ec2-배포)
3. [환경 변수 설정](#환경-변수-설정)
4. [서비스 관리](#서비스-관리)
5. [데이터베이스 관리](#데이터베이스-관리)
6. [문제 해결](#문제-해결)
7. [보안 체크리스트](#보안-체크리스트)

## 🚀 Windows 환경 빠른 시작

Windows에서 Docker를 이용해 로컬 개발 환경을 빠르게 설정하려면 다음 단계를 따르세요:

### 1. Docker Desktop 설치 및 실행

1. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop) 다운로드 및 설치
2. 설치 후 Docker Desktop 실행
3. 시스템 트레이에서 Docker Desktop이 실행 중인지 확인 (고래 아이콘)

### 2. 환경 변수 파일 생성

PowerShell을 프로젝트 루트에서 실행:

```powershell
Copy-Item infrastructure\aws\env.example .env.local
notepad .env.local
```

`.env.local` 파일에서 최소한 다음 값들을 수정:
- `POSTGRES_PASSWORD`: 안전한 비밀번호로 변경
- `SECRET_KEY`: 32자 이상의 랜덤 문자열 (생성 방법은 아래 참고)

### 3. 서비스 시작

```powershell
docker-compose -f infrastructure\docker\docker-compose.yml up -d --build
```

### 4. 서비스 접속 확인

브라우저에서 다음 주소 확인:
- 프론트엔드: http://localhost
- 백엔드 API: http://localhost:8000/docs

### 문제 발생 시

포트 80이 이미 사용 중이라면:
- IIS나 다른 웹 서버 종료
- 또는 Docker Compose 파일에서 포트 변경

자세한 내용은 [로컬 개발 환경 설정](#로컬-개발-환경-설정) 및 [문제 해결](#문제-해결) 섹션을 참고하세요.

## 🏠 로컬 개발 환경 설정

### 사전 요구사항

#### Windows 환경

1. **Docker Desktop for Windows**
   - [Docker Desktop 다운로드](https://www.docker.com/products/docker-desktop)
   - WSL 2 (Windows Subsystem for Linux 2) 백엔드 사용 권장
   - 설치 후 Docker Desktop 실행 및 시작 확인

2. **시스템 요구사항**
   - Windows 10 64-bit: Pro, Enterprise, 또는 Education (빌드 19041 이상)
   - Windows 11 64-bit
   - WSL 2 기능 활성화
   - 가상화 기능 활성화 (BIOS에서)

3. **Docker Desktop 설정 확인**
   - Docker Desktop 실행 후 우측 하단 트레이에서 실행 중인지 확인
   - 설정(Settings) > General에서 "Use the WSL 2 based engine" 체크 확인
   - 설정(Settings) > Resources에서 충분한 메모리 할당 (최소 4GB 권장)

#### Mac/Linux 환경

- Docker Desktop (Mac) 또는 Docker Engine (Linux)
- Docker Compose (일반적으로 Docker Desktop에 포함)

### 1단계: 환경 변수 파일 생성

**중요**: 로컬 개발 환경에서는 `.env.local` 파일을 사용합니다. 이 파일은 EC2 프로덕션 환경의 `.env.production` 파일과 완전히 분리되어 있습니다.

프로젝트 루트에 `.env.local` 파일을 생성하세요.

#### Windows (PowerShell)

```powershell
# PowerShell에서 실행
Copy-Item infrastructure\aws\env.example .env.local

# 또는 CMD에서
copy infrastructure\aws\env.example .env.local
```

#### Mac/Linux

```bash
cp infrastructure/aws/env.example .env.local
```

#### 환경 변수 수정

`.env.local` 파일을 열어 다음 값들을 수정하세요 (로컬 개발 환경에 맞게 설정):

```env
# Database Configuration
POSTGRES_USER=mysic_user
POSTGRES_PASSWORD=your-secure-password-here
POSTGRES_DB=mysic_db

# Backend Configuration
SECRET_KEY=your-secret-key-change-this-min-32-chars
ENVIRONMENT=development
CORS_ORIGINS=http://localhost,http://localhost:80,http://localhost:3000,http://localhost:5173

# Frontend Configuration
REACT_APP_API_URL=http://localhost:8000

# Database URL (로컬 개발용)
DATABASE_URL=postgresql://mysic_user:your-secure-password-here@postgres:5432/mysic_db
```

**SECRET_KEY 생성 방법 (Windows PowerShell):**
```powershell
# PowerShell에서 실행
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

또는 Python 사용:
```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2단계: Docker Compose로 서비스 시작

**중요**: Docker Compose는 자동으로 `.env.local` 파일을 로드합니다. 프로젝트 루트에 `.env.local` 파일이 있는지 확인하세요.

#### Windows (PowerShell 또는 CMD)

```powershell
# PowerShell 또는 CMD에서 프로젝트 루트로 이동
cd C:\Users\Lein(홍혜민)\Desktop\개발\Mysic

# .env.local 파일 확인
Test-Path .env.local

# Docker Compose로 서비스 시작 (.env.local 자동 로드)
docker-compose -f infrastructure\docker\docker-compose.yml up -d --build
```

**참고**: 
- Docker Compose는 `infrastructure/docker/docker-compose.yml`에서 `../../.env.local` 파일을 자동으로 로드합니다.
- 포트 80을 사용하려면 Docker Desktop에서 관리자 권한이 필요할 수 있습니다.
- 포트 80이 이미 사용 중이라면 `docker-compose.yml`에서 포트를 변경하거나 해당 프로세스를 종료해야 합니다.
- Windows에서 경로 구분자는 백슬래시(`\`) 또는 슬래시(`/`) 모두 사용 가능합니다.

#### Mac/Linux

```bash
# 프로젝트 루트에서 실행
docker-compose -f infrastructure/docker/docker-compose.yml up -d --build
```

### 3단계: 서비스 확인

서비스가 시작되면 다음 주소에서 접근할 수 있습니다:

- **프론트엔드**: http://localhost (로그인 페이지가 표시됩니다)
- **백엔드 API**: http://localhost:8000
- **API 문서 (Swagger)**: http://localhost:8000/docs
- **API 문서 (ReDoc)**: http://localhost:8000/redoc

#### 서비스 상태 확인

```powershell
# Windows PowerShell
docker-compose -f infrastructure\docker\docker-compose.yml ps

# Mac/Linux
docker-compose -f infrastructure/docker/docker-compose.yml ps
```

모든 서비스가 `Up` 상태여야 합니다:
- `mysic_postgres` - 데이터베이스
- `mysic_backend` - 백엔드 API
- `mysic_frontend` - 프론트엔드

### 4단계: 서비스 관리

#### 서비스 중지

```powershell
# Windows
docker-compose -f infrastructure\docker\docker-compose.yml down

# Mac/Linux
docker-compose -f infrastructure/docker/docker-compose.yml down
```

#### 로그 확인

```powershell
# Windows - 모든 서비스 로그
docker-compose -f infrastructure\docker\docker-compose.yml logs -f

# Windows - 특정 서비스 로그
docker-compose -f infrastructure\docker\docker-compose.yml logs -f backend
docker-compose -f infrastructure\docker\docker-compose.yml logs -f frontend
docker-compose -f infrastructure\docker\docker-compose.yml logs -f postgres

# Mac/Linux
docker-compose -f infrastructure/docker/docker-compose.yml logs -f
```

#### 서비스 재시작

```powershell
# Windows
docker-compose -f infrastructure\docker\docker-compose.yml restart

# Mac/Linux
docker-compose -f infrastructure/docker/docker-compose.yml restart
```

#### 컨테이너 재빌드 (코드 변경 후)

```powershell
# Windows - 변경사항 반영을 위해 재빌드
docker-compose -f infrastructure\docker\docker-compose.yml up -d --build

# Mac/Linux
docker-compose -f infrastructure/docker/docker-compose.yml up -d --build
```

## ☁️ AWS EC2 배포

### 사전 준비사항

1. **AWS EC2 인스턴스**
   - 인스턴스 타입: t3.micro (프리티어)
   - OS: Amazon Linux 2, Amazon Linux 2023, Ubuntu 22.04 LTS 등
   - 보안 그룹:
     - SSH (22): 본인 IP만 허용
     - HTTP (80): 0.0.0.0/0
     - HTTPS (443): 0.0.0.0/0
     - Custom TCP (8000): 0.0.0.0/0 (선택사항)

2. **SSH 키 페어**
   - EC2 인스턴스 생성 시 다운로드한 `.pem` 파일

### 1단계: EC2 서버 초기 설정

#### 1.1 EC2 서버 접속

```bash
# Amazon Linux의 경우
ssh -i your-key.pem ec2-user@your-ec2-ip

# Ubuntu의 경우
ssh -i your-key.pem ubuntu@your-ec2-ip
```

#### 1.2 초기 설정 스크립트 실행

프로젝트를 클론한 후:

```bash
cd Mysic
chmod +x infrastructure/aws/setup-ec2.sh
./infrastructure/aws/setup-ec2.sh
```

또는 수동으로 설치 (배포판별로 다름):

**Amazon Linux의 경우:**
```bash
sudo yum update -y
sudo yum install -y docker git
sudo systemctl start docker
sudo systemctl enable docker
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo usermod -aG docker $USER
```

**Ubuntu의 경우:**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git nginx
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

**모든 배포판 공통:**
```bash
# 로그아웃 후 재접속 (docker 그룹 적용)
exit
ssh -i your-key.pem ec2-user@your-ec2-ip  # Amazon Linux
# 또는
ssh -i your-key.pem ubuntu@your-ec2-ip    # Ubuntu
```

### 2단계: 프로젝트 코드 배포

#### 2.1 GitHub에서 코드 클론

```bash
# Amazon Linux의 경우
cd /home/ec2-user

# Ubuntu의 경우
cd /home/ubuntu

# 프로젝트 클론
git clone https://github.com/your-username/Mysic.git
cd Mysic
```

#### 2.2 환경 변수 파일 생성

**중요**: EC2 프로덕션 환경에서는 `.env.production` 파일을 사용합니다. 이 파일은 로컬 개발 환경의 `.env.local` 파일과 완전히 분리되어 있습니다.

```bash
cp infrastructure/aws/env.example .env.production
nano .env.production
```

필수 환경 변수 입력 (자세한 내용은 [환경 변수 설정](#환경-변수-설정) 참고)

**참고**: `infrastructure/aws/docker-compose.prod.yml` 파일은 자동으로 `.env.production` 파일을 로드합니다.

**SECRET_KEY 생성:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3단계: Docker로 서비스 실행

#### 3.1 배포 스크립트 실행 (권장)

```bash
chmod +x infrastructure/aws/deploy.sh
./infrastructure/aws/deploy.sh
```

#### 3.2 수동 배포

```bash
# Docker Compose로 서비스 시작
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --build

# 로그 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f
```

### 4단계: 서비스 확인

- **프론트엔드**: http://your-ec2-ip
- **백엔드 API**: http://your-ec2-ip:8000
- **API 문서**: http://your-ec2-ip:8000/docs

### 5단계: Nginx 설정 (선택사항)

외부 Nginx를 사용하여 SSL을 설정하거나 추가 설정이 필요한 경우:

```bash
sudo cp infrastructure/aws/nginx-mysic.conf /etc/nginx/sites-available/mysic
sudo ln -s /etc/nginx/sites-available/mysic /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 6단계: SSL 인증서 설정 (선택사항)

```bash
# Amazon Linux의 경우
sudo yum install -y certbot python3-certbot-nginx

# Ubuntu의 경우
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급 (모든 배포판 공통)
sudo certbot --nginx -d your-domain.com
```

## 🔐 환경 변수 설정

### 환경별 파일 위치 및 사용 방법

이 프로젝트는 **로컬 개발 환경**과 **프로덕션 환경(EC2)**에서 서로 다른 환경 변수 파일을 사용합니다:

| 환경 | 파일 이름 | 위치 | Docker Compose 파일 | 설명 |
|------|----------|------|-------------------|------|
| **로컬 개발** | `.env.local` | 프로젝트 루트 | `infrastructure/docker/docker-compose.yml` | 로컬에서 개발 및 테스트 시 사용 |
| **프로덕션 (EC2)** | `.env.production` | 프로젝트 루트 | `infrastructure/aws/docker-compose.prod.yml` | EC2 서버에서 배포 시 사용 |

**중요 사항:**
- 두 파일은 완전히 독립적으로 관리됩니다.
- `.env.local`은 로컬 개발 환경용 설정만 포함합니다.
- `.env.production`은 프로덕션 환경용 설정만 포함합니다.
- 두 파일 모두 `.gitignore`에 추가되어 Git에 커밋되지 않습니다.
- 각 Docker Compose 파일은 해당 환경의 env 파일을 자동으로 로드합니다.

### 로컬 개발 환경 필수 환경 변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `POSTGRES_USER` | PostgreSQL 사용자명 | `mysic_user` |
| `POSTGRES_PASSWORD` | PostgreSQL 비밀번호 | `강력한-비밀번호` |
| `POSTGRES_DB` | 데이터베이스 이름 | `mysic_db` |
| `SECRET_KEY` | JWT 토큰 암호화 키 (최소 32자) | `랜덤-문자열-생성` |
| `ENVIRONMENT` | 환경 설정 | `development` |
| `CORS_ORIGINS` | 허용할 CORS 오리진 | `http://localhost,http://localhost:80,http://localhost:3000,http://localhost:5173` |
| `REACT_APP_API_URL` | 프론트엔드에서 사용할 API URL | `http://localhost:8000` |
| `DATABASE_URL` | 데이터베이스 연결 URL | `postgresql://mysic_user:your-password@postgres:5432/mysic_db` |

### 프로덕션 환경 필수 환경 변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `POSTGRES_USER` | PostgreSQL 사용자명 | `mysic_user` |
| `POSTGRES_PASSWORD` | PostgreSQL 비밀번호 | `강력한-비밀번호` |
| `POSTGRES_DB` | 데이터베이스 이름 | `mysic_db` |
| `SECRET_KEY` | JWT 토큰 암호화 키 (최소 32자) | `랜덤-문자열-생성` |
| `ENVIRONMENT` | 환경 설정 | `production` |
| `CORS_ORIGINS` | 허용할 CORS 오리진 | `https://your-domain.com` |

### 선택적 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `REACT_APP_API_URL` | 프론트엔드에서 사용할 API URL | `http://localhost:8000` |
| `AWS_ACCESS_KEY_ID` | AWS 액세스 키 (Phase 2부터) | - |
| `AWS_SECRET_ACCESS_KEY` | AWS 시크릿 키 (Phase 2부터) | - |
| `AWS_REGION` | AWS 리전 | `ap-northeast-2` |
| `AWS_S3_BUCKET` | S3 버킷 이름 (Phase 2부터) | - |

### SECRET_KEY 생성 방법

#### Windows (PowerShell)

```powershell
# Python 사용 (권장)
python -c "import secrets; print(secrets.token_urlsafe(32))"

# PowerShell 직접 생성
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

#### Mac/Linux

```bash
# Python 사용
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# OpenSSL 사용
openssl rand -base64 32
```

### 환경 변수 파일 생성 예시

#### 로컬 개발 환경 (.env.local)

```env
# Database Configuration
POSTGRES_USER=mysic_user
POSTGRES_PASSWORD=your-secure-password-here
POSTGRES_DB=mysic_db

# Backend Configuration
SECRET_KEY=your-secret-key-min-32-chars-generated-above
ENVIRONMENT=development
CORS_ORIGINS=http://localhost,http://localhost:80,http://localhost:3000,http://localhost:5173

# Frontend Configuration
REACT_APP_API_URL=http://localhost:8000

# Database URL (로컬 개발용 - postgres는 Docker 서비스 이름)
DATABASE_URL=postgresql://mysic_user:your-secure-password-here@postgres:5432/mysic_db
```

#### 프로덕션 환경 (.env.production)

```env
# Database Configuration
POSTGRES_USER=mysic_user
POSTGRES_PASSWORD=your-secure-password-here
POSTGRES_DB=mysic_db

# Backend Configuration
SECRET_KEY=your-secret-key-min-32-chars-generated-above
ENVIRONMENT=production
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Frontend Configuration
REACT_APP_API_URL=http://your-ec2-ip:8000

# Database URL
DATABASE_URL=postgresql://mysic_user:your-secure-password-here@postgres:5432/mysic_db
```

### 주의사항

1. **파일 인코딩**: UTF-8 (BOM 없음) 권장
2. **줄바꿈**: Unix 형식(LF) 권장, Windows 형식(CRLF)도 동작함
3. **비밀번호**: 특수문자 포함 시 따옴표 불필요 (Docker Compose가 자동 처리)
4. **.gitignore**: `.env.local`과 `.env.production` 파일은 Git에 커밋하지 마세요

## 🔧 서비스 관리

### 서비스 상태 확인

#### 로컬 개발 환경

```powershell
# Windows
docker-compose -f infrastructure\docker\docker-compose.yml ps

# Mac/Linux
docker-compose -f infrastructure/docker/docker-compose.yml ps
```

#### 프로덕션 환경 (EC2)

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps
```

### 로그 확인

#### 로컬 개발 환경

```powershell
# Windows - 모든 서비스 로그
docker-compose -f infrastructure\docker\docker-compose.yml logs -f

# Windows - 특정 서비스 로그
docker-compose -f infrastructure\docker\docker-compose.yml logs -f backend
docker-compose -f infrastructure\docker\docker-compose.yml logs -f frontend
docker-compose -f infrastructure\docker\docker-compose.yml logs -f postgres

# Mac/Linux
docker-compose -f infrastructure/docker/docker-compose.yml logs -f
```

#### 프로덕션 환경 (EC2)

```bash
# 모든 서비스 로그
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f backend
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f frontend
```

### 서비스 재시작

#### 로컬 개발 환경

```powershell
# Windows
docker-compose -f infrastructure\docker\docker-compose.yml restart

# Mac/Linux
docker-compose -f infrastructure/docker/docker-compose.yml restart
```

#### 프로덕션 환경 (EC2)

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml restart
```

### 서비스 중지

#### 로컬 개발 환경

```powershell
# Windows
docker-compose -f infrastructure\docker\docker-compose.yml down

# 데이터베이스 볼륨까지 제거하려면
docker-compose -f infrastructure\docker\docker-compose.yml down -v

# Mac/Linux
docker-compose -f infrastructure/docker/docker-compose.yml down
```

#### 프로덕션 환경 (EC2)

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml down
```

### 코드 업데이트 및 재배포

#### 로컬 개발 환경

```powershell
# Windows - 코드 변경 후 컨테이너 재빌드
git pull
docker-compose -f infrastructure\docker\docker-compose.yml up -d --build

# Mac/Linux
git pull
docker-compose -f infrastructure/docker/docker-compose.yml up -d --build
```

#### 프로덕션 환경 (EC2)

```bash
# 코드 업데이트
git pull

# 재배포
./infrastructure/aws/deploy.sh
```

## 🗄️ 데이터베이스 관리

### 데이터베이스 백업

#### 로컬 개발 환경

```powershell
# Windows PowerShell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
docker-compose -f infrastructure\docker\docker-compose.yml exec postgres pg_dump -U mysic_user mysic_db > "backup_$timestamp.sql"

# Mac/Linux
docker-compose -f infrastructure/docker/docker-compose.yml exec postgres pg_dump -U mysic_user mysic_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 프로덕션 환경 (EC2)

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml exec postgres pg_dump -U mysic_user mysic_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 데이터베이스 복원

#### 로컬 개발 환경

```powershell
# Windows PowerShell
Get-Content backup_file.sql | docker-compose -f infrastructure\docker\docker-compose.yml exec -T postgres psql -U mysic_user mysic_db

# Mac/Linux
docker-compose -f infrastructure/docker/docker-compose.yml exec -T postgres psql -U mysic_user mysic_db < backup_file.sql
```

#### 프로덕션 환경 (EC2)

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml exec -T postgres psql -U mysic_user mysic_db < backup_file.sql
```

### 데이터베이스 접속

#### 로컬 개발 환경

```powershell
# Windows
docker-compose -f infrastructure\docker\docker-compose.yml exec postgres psql -U mysic_user -d mysic_db

# Mac/Linux
docker-compose -f infrastructure/docker/docker-compose.yml exec postgres psql -U mysic_user -d mysic_db
```

## 🐛 문제 해결

### 포트 충돌

#### Windows 환경

```powershell
# 포트 사용 중인 프로세스 확인 (관리자 권한 PowerShell)
netstat -ano | findstr :80
netstat -ano | findstr :8000
netstat -ano | findstr :5432

# 특정 포트를 사용하는 프로세스 종료
# PID는 위 명령어 실행 결과에서 확인
taskkill /PID <PID> /F

# 또는 프로세스 이름으로 종료 (예: IIS)
Get-Process -Name w3wp | Stop-Process -Force
```

**일반적인 포트 충돌 원인:**
- 포트 80: IIS (Internet Information Services), 다른 웹 서버
- 포트 8000: 다른 개발 서버가 실행 중
- 포트 5432: 로컬 PostgreSQL이 설치되어 실행 중

**해결 방법:**
1. 다른 서비스 종료
2. Docker Compose 파일에서 포트 변경 (예: 80 → 3000, 8000 → 8001)
3. IIS 비활성화 (제어판 > Windows 기능 켜기/끄기)

#### Mac/Linux 환경

```bash
# 포트 사용 중인 프로세스 확인
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :8000

# 프로세스 종료
sudo kill -9 <PID>
```

### Docker 권한 문제

#### Windows 환경

- Docker Desktop을 관리자 권한으로 실행
- Docker Desktop 설정에서 WSL 2 백엔드 사용 확인
- Docker Desktop이 실행 중인지 확인 (시스템 트레이)

#### Mac/Linux 환경

```bash
# docker 그룹에 사용자 추가
sudo usermod -aG docker $USER
newgrp docker
```

### 컨테이너가 시작되지 않을 때

#### Windows 환경

```powershell
# 로그 확인 (로컬 개발)
docker-compose -f infrastructure\docker\docker-compose.yml logs

# 컨테이너 상태 확인
docker-compose -f infrastructure\docker\docker-compose.yml ps

# 컨테이너 재생성
docker-compose -f infrastructure\docker\docker-compose.yml up -d --force-recreate

# 모든 컨테이너와 볼륨 제거 후 재시작 (완전 초기화)
docker-compose -f infrastructure\docker\docker-compose.yml down -v
docker-compose -f infrastructure\docker\docker-compose.yml up -d --build
```

#### Mac/Linux 환경

```bash
# 로그 확인
docker-compose -f infrastructure/docker/docker-compose.yml logs

# 컨테이너 재생성
docker-compose -f infrastructure/docker/docker-compose.yml up -d --force-recreate
```

### 환경 변수 로드 문제

#### Windows 환경

```powershell
# .env.local 파일이 프로젝트 루트에 있는지 확인
Test-Path .env.local

# 파일 내용 확인
Get-Content .env.local

# 파일이 없으면 생성
Copy-Item infrastructure\aws\env.example .env.local
```

**주의사항:**
- Windows에서 환경 변수 파일은 프로젝트 루트에 있어야 합니다.
- 파일 인코딩은 UTF-8 (BOM 없음)을 권장합니다.
- Windows 줄바꿈(CRLF)보다는 Unix 줄바꿈(LF)을 권장합니다.

#### Mac/Linux 환경

```bash
# .env.local 파일 확인
ls -la .env.local

# 파일이 없으면 생성
cp infrastructure/aws/env.example .env.local
```

### 데이터베이스 연결 문제

#### Windows 환경

```powershell
# 데이터베이스 컨테이너 상태 확인
docker-compose -f infrastructure\docker\docker-compose.yml ps postgres

# 데이터베이스 로그 확인
docker-compose -f infrastructure\docker\docker-compose.yml logs postgres

# 데이터베이스에 직접 연결 테스트
docker-compose -f infrastructure\docker\docker-compose.yml exec postgres psql -U mysic_user -d mysic_db

# 데이터베이스 컨테이너 재시작
docker-compose -f infrastructure\docker\docker-compose.yml restart postgres
```

#### Mac/Linux 환경

```bash
# 데이터베이스 컨테이너 상태 확인
docker-compose -f infrastructure/docker/docker-compose.yml ps postgres

# 데이터베이스 로그 확인
docker-compose -f infrastructure/docker/docker-compose.yml logs postgres
```

### Windows 특화 문제

#### WSL 2 관련 문제

**문제**: Docker Desktop이 시작되지 않거나 컨테이너가 실행되지 않음

**해결 방법:**
1. WSL 2 업데이트 확인:
   ```powershell
   wsl --update
   ```

2. WSL 2 기본 버전 설정:
   ```powershell
   wsl --set-default-version 2
   ```

3. Docker Desktop 재시작

#### 볼륨 마운트 문제

**문제**: Windows 파일 시스템이 Docker 컨테이너에 제대로 마운트되지 않음

**해결 방법:**
1. Docker Desktop 설정 > Resources > File Sharing에서 프로젝트 디렉토리 추가
2. WSL 2 백엔드 사용 (권장)
3. 상대 경로 대신 절대 경로 사용

#### 포트 바인딩 문제

**문제**: "port is already allocated" 오류

**해결 방법:**
1. 포트 사용 프로세스 확인 및 종료 (위 "포트 충돌" 섹션 참고)
2. Docker Compose 파일에서 다른 포트 사용
3. `docker ps`로 실행 중인 컨테이너 확인 후 중지

## 📚 추가 자료

- [AWS EC2 상세 배포 가이드](infrastructure/aws/README.md)
- [프로젝트 요구사항](requirements.md)

## 🔒 보안 체크리스트

### 로컬 개발 환경

- [ ] `.env.local` 파일을 `.gitignore`에 추가 확인
- [ ] SECRET_KEY를 강력한 랜덤 문자열로 변경 (최소 32자)
- [ ] 데이터베이스 비밀번호를 강력하게 설정
- [ ] Docker 볼륨에 민감한 정보가 저장되지 않도록 주의
- [ ] 로컬 환경에서는 프로덕션 키를 사용하지 않도록 주의

### 프로덕션 환경 (EC2)

- [ ] `.env.production` 파일 권한 설정: `chmod 600 .env.production`
- [ ] SSH 키 파일 권한 설정: `chmod 400 your-key.pem`
- [ ] 방화벽 설정 확인 (보안 그룹)
  - SSH (22): 본인 IP만 허용
  - HTTP (80): 필요한 IP만 허용
  - HTTPS (443): 필요한 IP만 허용
- [ ] SECRET_KEY를 강력한 랜덤 문자열로 변경
- [ ] 데이터베이스 비밀번호를 강력하게 설정
- [ ] SSL 인증서 설정 (프로덕션 환경)
- [ ] 정기적인 백업 설정
- [ ] Docker 컨테이너 로그에 민감한 정보가 포함되지 않도록 확인

