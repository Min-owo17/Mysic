# 배포 가이드

이 문서는 Mysic 프로젝트의 Docker 설정 및 AWS EC2 배포 방법을 안내합니다.

## 📋 목차

1. [로컬 개발 환경 설정](#로컬-개발-환경-설정)
2. [AWS EC2 배포](#aws-ec2-배포)
3. [환경 변수 설정](#환경-변수-설정)
4. [문제 해결](#문제-해결)

## 🏠 로컬 개발 환경 설정

### 사전 요구사항

- Docker Desktop (Windows/Mac) 또는 Docker Engine (Linux)
- Docker Compose

### 1단계: 환경 변수 파일 생성

프로젝트 루트에 `.env.local` 파일을 생성하세요:

```bash
cp infrastructure/aws/env.example .env.local
```

`.env.local` 파일을 열어 필요한 값들을 수정하세요.

### 2단계: Docker Compose로 서비스 시작

```bash
# 프로젝트 루트에서 실행
docker-compose -f infrastructure/docker/docker-compose.yml up -d --build
```

### 3단계: 서비스 확인

- **프론트엔드**: http://localhost (로그인 페이지가 표시됩니다)
- **백엔드 API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

### 4단계: 서비스 관리

```bash
# 서비스 중지
docker-compose -f infrastructure/docker/docker-compose.yml down

# 로그 확인
docker-compose -f infrastructure/docker/docker-compose.yml logs -f

# 서비스 재시작
docker-compose -f infrastructure/docker/docker-compose.yml restart
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

```bash
cp infrastructure/aws/env.example .env.production
nano .env.production
```

필수 환경 변수 입력 (자세한 내용은 [환경 변수 설정](#환경-변수-설정) 참고)

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

### 필수 환경 변수

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

```bash
# Python 사용
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# OpenSSL 사용
openssl rand -base64 32
```

## 🔧 서비스 관리

### 서비스 상태 확인

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps
```

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f backend
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f frontend
```

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

## 🗄️ 데이터베이스 관리

### 데이터베이스 백업

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml exec postgres pg_dump -U mysic_user mysic_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 데이터베이스 복원

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml exec -T postgres psql -U mysic_user mysic_db < backup_file.sql
```

## 🐛 문제 해결

### 포트 충돌

```bash
# 포트 사용 중인 프로세스 확인
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :8000

# 프로세스 종료
sudo kill -9 <PID>
```

### Docker 권한 문제

```bash
# docker 그룹에 사용자 추가
sudo usermod -aG docker $USER
newgrp docker
```

### 컨테이너가 시작되지 않을 때

```bash
# 로그 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs

# 컨테이너 재생성
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --force-recreate
```

### 환경 변수 로드 문제

`.env.production` 파일이 프로젝트 루트에 있는지 확인하세요:

```bash
ls -la .env.production
```

### 데이터베이스 연결 문제

```bash
# 데이터베이스 컨테이너 상태 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps postgres

# 데이터베이스 로그 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs postgres
```

## 📚 추가 자료

- [AWS EC2 상세 배포 가이드](infrastructure/aws/README.md)
- [프로젝트 요구사항](requirements.md)

## 🔒 보안 체크리스트

- [ ] `.env.production` 파일 권한 설정: `chmod 600 .env.production`
- [ ] SSH 키 파일 권한 설정: `chmod 400 your-key.pem`
- [ ] 방화벽 설정 확인 (보안 그룹)
- [ ] SECRET_KEY를 강력한 랜덤 문자열로 변경
- [ ] 데이터베이스 비밀번호를 강력하게 설정
- [ ] SSL 인증서 설정 (프로덕션 환경)
- [ ] 정기적인 백업 설정

