# 로컬 테스트 가이드

이 문서는 Docker를 사용한 로컬 테스트 방법을 안내합니다.

## 사전 준비사항

1. **Docker Desktop 설치** (Windows/Mac)
   - [Docker Desktop 다운로드](https://www.docker.com/products/docker-desktop)
   - 또는 Linux의 경우 Docker Engine 설치

2. **Docker 설치 확인**
   ```bash
   docker --version
   docker-compose --version
   ```

## 로컬 테스트 실행

### 1단계: 프로젝트 루트로 이동

```bash
cd C:\Users\Lein(홍혜민)\Desktop\개발\Mysic
```

### 2단계: Docker Compose로 서비스 시작

```bash
docker-compose -f infrastructure/docker/docker-compose.yml up -d --build
```

**설명:**
- `-d`: 백그라운드에서 실행 (detached mode)
- `--build`: 이미지를 다시 빌드

### 3단계: 서비스 확인

서비스가 정상적으로 시작되었는지 확인:

```bash
docker-compose -f infrastructure/docker/docker-compose.yml ps
```

모든 서비스가 `Up` 상태여야 합니다.

### 4단계: 브라우저에서 확인

#### 프론트엔드
- **URL**: http://localhost
- **예상 화면**: "Hello World! 🎵" 메시지가 표시됩니다.

#### 백엔드 API
- **API 루트**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs (Swagger UI)
- **Health Check**: http://localhost:8000/health
- **테스트 엔드포인트**: http://localhost:8000/api/test

### 5단계: 로그 확인

서비스 로그를 확인하려면:

```bash
# 모든 서비스 로그
docker-compose -f infrastructure/docker/docker-compose.yml logs -f

# 특정 서비스 로그
docker-compose -f infrastructure/docker/docker-compose.yml logs -f frontend
docker-compose -f infrastructure/docker/docker-compose.yml logs -f backend
docker-compose -f infrastructure/docker/docker-compose.yml logs -f postgres
```

## 서비스 관리

### 서비스 중지

```bash
docker-compose -f infrastructure/docker/docker-compose.yml down
```

### 서비스 재시작

```bash
docker-compose -f infrastructure/docker/docker-compose.yml restart
```

### 서비스 중지 및 볼륨 삭제 (데이터베이스 데이터 포함)

```bash
docker-compose -f infrastructure/docker/docker-compose.yml down -v
```

## 문제 해결

### 포트 충돌

포트 80, 8000, 5432가 이미 사용 중인 경우:

```bash
# Windows에서 포트 사용 확인
netstat -ano | findstr :80
netstat -ano | findstr :8000
netstat -ano | findstr :5432

# 프로세스 종료 (PID는 위 명령어 결과에서 확인)
taskkill /PID <PID> /F
```

### 컨테이너가 시작되지 않을 때

```bash
# 로그 확인
docker-compose -f infrastructure/docker/docker-compose.yml logs

# 컨테이너 재생성
docker-compose -f infrastructure/docker/docker-compose.yml up -d --force-recreate
```

### 이미지 재빌드

```bash
# 모든 이미지 재빌드
docker-compose -f infrastructure/docker/docker-compose.yml build --no-cache

# 특정 서비스만 재빌드
docker-compose -f infrastructure/docker/docker-compose.yml build --no-cache frontend
docker-compose -f infrastructure/docker/docker-compose.yml build --no-cache backend
```

### Docker Desktop이 실행되지 않을 때

Windows/Mac에서 Docker Desktop이 실행 중인지 확인하세요.

## 예상 결과

### 프론트엔드 (http://localhost)
- "Hello World! 🎵" 제목
- "Mysic - 악기 연주자 연습 기록 서비스" 설명
- "Docker 로컬 테스트 성공! ✅" 메시지

### 백엔드 API (http://localhost:8000)
```json
{
  "message": "Hello World! 🎵",
  "service": "Mysic - 악기 연주자 연습 기록 서비스",
  "status": "Docker 로컬 테스트 성공! ✅"
}
```

### API 문서 (http://localhost:8000/docs)
- Swagger UI가 표시됩니다.
- `/`, `/health`, `/api/test` 엔드포인트를 확인할 수 있습니다.

## 다음 단계

로컬 테스트가 성공하면:
1. EC2 서버에 배포 준비
2. 프로젝트 구조 확장 (옵션 B)
3. 실제 기능 개발 시작

