# AWS EC2 배포 가이드

이 문서는 Mysic 프로젝트를 AWS EC2에 배포하는 방법을 설명합니다.

## 사전 준비사항

1. **AWS EC2 인스턴스 생성**
   - 인스턴스 타입: t3.micro (프리티어)
   - OS: Amazon Linux 2, Amazon Linux 2023, Ubuntu 22.04 LTS 등
   - 보안 그룹 설정:
     - SSH (22): 본인 IP만 허용
     - HTTP (80): 0.0.0.0/0
     - HTTPS (443): 0.0.0.0/0 (SSL 설정 시)
     - Custom TCP (8000): 0.0.0.0/0 (API 직접 접근용, 선택사항)

2. **SSH 키 페어 준비**
   - EC2 인스턴스 생성 시 다운로드한 `.pem` 파일

## 1단계: EC2 서버 초기 설정

### 1.1 EC2 서버 접속

```bash
# Amazon Linux의 경우
ssh -i your-key.pem ec2-user@your-ec2-ip

# Ubuntu의 경우
ssh -i your-key.pem ubuntu@your-ec2-ip

# 기타 Linux 배포판의 경우 해당 사용자명 사용
```

### 1.2 초기 설정 스크립트 실행

```bash
# 프로젝트를 먼저 클론한 경우
cd Mysic
chmod +x infrastructure/aws/setup-ec2.sh
./infrastructure/aws/setup-ec2.sh

# 또는 수동으로 설치 (배포판별로 다름)
# Amazon Linux의 경우:
# sudo yum update -y
# sudo yum install -y docker git
# sudo systemctl start docker
# sudo systemctl enable docker
# sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
# sudo chmod +x /usr/local/bin/docker-compose

# Ubuntu의 경우:
# sudo apt update && sudo apt upgrade -y
# sudo apt install -y docker.io docker-compose git nginx
# sudo systemctl start docker
# sudo systemctl enable docker

# 모든 배포판 공통:
# sudo usermod -aG docker $USER
```

**⚠️ 중요**: docker 그룹 변경사항을 적용하려면 로그아웃 후 다시 로그인하세요.

```bash
exit
# 다시 접속 (사용자명은 배포판에 따라 다름)
ssh -i your-key.pem ec2-user@your-ec2-ip  # Amazon Linux
# 또는
ssh -i your-key.pem ubuntu@your-ec2-ip    # Ubuntu
```

## 2단계: 프로젝트 코드 배포

### 2.1 GitHub에서 코드 클론

```bash
# Amazon Linux의 경우
cd /home/ec2-user

# Ubuntu의 경우
cd /home/ubuntu

# 프로젝트 클론
git clone https://github.com/your-username/Mysic.git
cd Mysic
```

### 2.2 환경 변수 파일 생성

```bash
cp .env.example .env.production
nano .env.production
```

다음 정보를 입력하세요:

```env
# Database Configuration
POSTGRES_USER=mysic_user
POSTGRES_PASSWORD=강력한-비밀번호-입력
POSTGRES_DB=mysic_db

# Backend Configuration
SECRET_KEY=최소-32자-랜덤-문자열-생성
ENVIRONMENT=production
CORS_ORIGINS=https://your-domain.com

# Frontend Configuration
REACT_APP_API_URL=http://your-ec2-ip:8000

# AWS Configuration (Phase 2부터 사용)
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=your-s3-bucket-name
```

**SECRET_KEY 생성 방법:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 3단계: Docker로 서비스 실행

### 3.1 배포 스크립트 실행

```bash
chmod +x infrastructure/aws/deploy.sh
./infrastructure/aws/deploy.sh
```

### 3.2 수동 배포 (스크립트 사용 안 할 경우)

```bash
# 환경 변수 로드
export $(cat .env.production | xargs)

# Docker Compose로 서비스 시작
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --build

# 로그 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f
```

## 4단계: Nginx 리버스 프록시 설정 (선택사항)

Docker Compose의 frontend 서비스가 이미 Nginx를 사용하므로, 추가 Nginx 설정은 선택사항입니다.

하지만 외부 Nginx를 사용하여 SSL을 설정하거나 추가 설정이 필요한 경우:

```bash
# Nginx 설정 파일 복사
sudo cp infrastructure/aws/nginx-mysic.conf /etc/nginx/sites-available/mysic

# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/mysic /etc/nginx/sites-enabled/

# 기본 설정 비활성화 (충돌 방지)
sudo rm /etc/nginx/sites-enabled/default

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

## 5단계: SSL 인증서 설정 (선택사항)

### 5.1 Let's Encrypt 설치

```bash
# Amazon Linux의 경우
sudo yum install -y certbot python3-certbot-nginx

# Ubuntu의 경우
sudo apt install -y certbot python3-certbot-nginx
```

### 5.2 SSL 인증서 발급

```bash
sudo certbot --nginx -d your-domain.com
```

인증서는 자동으로 갱신됩니다.

## 6단계: 서비스 관리

### 6.1 서비스 상태 확인

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps
```

### 6.2 로그 확인

```bash
# 모든 서비스 로그
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f backend
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs -f frontend
```

### 6.3 서비스 재시작

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml restart
```

### 6.4 서비스 중지

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml down
```

### 6.5 서비스 업데이트

```bash
# 코드 업데이트
git pull

# 재배포
./infrastructure/aws/deploy.sh
```

## 7단계: 데이터베이스 관리

### 7.1 데이터베이스 백업

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml exec postgres pg_dump -U mysic_user mysic_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 7.2 데이터베이스 복원

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml exec -T postgres psql -U mysic_user mysic_db < backup_file.sql
```

## 8단계: 모니터링

### 8.1 리소스 사용량 확인

```bash
# Docker 컨테이너 리소스 사용량
docker stats

# 디스크 사용량
df -h

# 메모리 사용량
free -h
```

### 8.2 CloudWatch 설정 (선택사항)

AWS CloudWatch Agent를 설치하여 모니터링을 강화할 수 있습니다.

## 문제 해결

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

## 보안 체크리스트

- [ ] `.env.production` 파일 권한 설정: `chmod 600 .env.production`
- [ ] SSH 키 파일 권한 설정: `chmod 400 your-key.pem`
- [ ] 방화벽 설정 확인 (보안 그룹)
- [ ] SECRET_KEY를 강력한 랜덤 문자열로 변경
- [ ] 데이터베이스 비밀번호를 강력하게 설정
- [ ] SSL 인증서 설정 (프로덕션 환경)
- [ ] 정기적인 백업 설정

## 다음 단계

- [ ] 도메인 연결
- [ ] SSL 인증서 설정
- [ ] CloudWatch 모니터링 설정
- [ ] 자동 백업 설정
- [ ] CI/CD 파이프라인 구축

