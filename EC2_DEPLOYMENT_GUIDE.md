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

#### 4.1 서비스 상태 확인

```bash
docker-compose -f infrastructure/aws/docker-compose.prod.yml ps
```

모든 서비스가 `Up` 상태여야 합니다.

#### 4.2 브라우저에서 확인

- **프론트엔드**: http://your-ec2-ip
- **백엔드 API**: http://your-ec2-ip:8000
- **API 문서**: http://your-ec2-ip:8000/docs

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

## 문제 해결

### 포트 충돌

```bash
# 포트 사용 중인 프로세스 확인
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :8000

# 프로세스 종료
sudo kill -9 <PID>
```

### 컨테이너가 시작되지 않을 때

```bash
# 로그 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs

# 컨테이너 재생성
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d --force-recreate
```

### 환경 변수 로드 문제

`.env.production` 파일이 프로젝트 루트에 있는지 확인:

```bash
ls -la .env.production
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

