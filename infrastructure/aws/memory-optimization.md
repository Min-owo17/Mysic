# 메모리 최적화 가이드

EC2 t3.micro (1GB RAM) 환경에서 Docker 컨테이너 메모리 제한 설정 가이드입니다.

## 현재 메모리 제한 설정

### PostgreSQL
- **메모리 제한**: 400MB
- **메모리 예약**: 256MB

### Backend (FastAPI)
- **메모리 제한**: 400MB
- **메모리 예약**: 256MB

### Frontend (Nginx)
- **메모리 제한**: 128MB
- **메모리 예약**: 64MB

### 총 메모리 사용량
- 예약: 576MB (256 + 256 + 64)
- 최대: 928MB (400 + 400 + 128)
- 시스템 여유: 약 100MB

## 메모리 사용량 확인

### 컨테이너별 메모리 사용량 확인

```bash
# 실시간 메모리 사용량 모니터링
docker stats

# 특정 컨테이너만 확인
docker stats mysic_postgres_prod mysic_backend_prod mysic_frontend_prod --no-stream
```

### 시스템 메모리 확인

```bash
# 전체 메모리 사용량
free -h

# 상세 메모리 정보
cat /proc/meminfo | head -20
```

## 메모리 부족 시 조정 방법

### 메모리 제한 조정

`docker-compose.prod.yml` 파일에서 각 서비스의 `mem_limit` 값을 조정:

```yaml
# 메모리가 부족한 경우
postgres:
  mem_limit: 300m  # 400m에서 300m로 감소
  mem_reservation: 200m

backend:
  mem_limit: 300m  # 400m에서 300m로 감소
  mem_reservation: 200m

frontend:
  mem_limit: 100m  # 128m에서 100m로 감소
  mem_reservation: 50m
```

### PostgreSQL 메모리 최적화

PostgreSQL 메모리 최적화는 `docker-compose.prod.yml` 파일의 `command` 섹션에서 직접 설정됩니다:

```yaml
postgres:
  command: >
    postgres
    -c shared_buffers=64MB
    -c effective_cache_size=128MB
    -c maintenance_work_mem=32MB
    -c work_mem=4MB
    -c max_connections=50
    -c wal_buffers=4MB
    -c checkpoint_completion_target=0.9
    -c random_page_cost=1.1
    -c effective_io_concurrency=200
```

**설정 설명:**
- `shared_buffers=64MB`: 공유 메모리 버퍼 (전체 메모리의 약 25%)
- `effective_cache_size=128MB`: OS와 PostgreSQL이 함께 사용할 수 있는 예상 캐시 크기
- `maintenance_work_mem=32MB`: 유지보수 작업에 사용되는 메모리
- `work_mem=4MB`: 정렬 및 해시 작업에 사용되는 메모리 (쿼리당)
- `max_connections=50`: 최대 연결 수 (메모리 제한에 맞춰 조정)
- `wal_buffers=4MB`: WAL 버퍼 크기
- `checkpoint_completion_target=0.9`: 체크포인트 완료 목표
- `random_page_cost=1.1`: SSD 환경에 맞춘 랜덤 페이지 비용
- `effective_io_concurrency=200`: SSD 환경에 맞춘 I/O 동시성

**참고:** `infrastructure/aws/postgresql.conf` 파일도 참고용으로 제공되며, 필요시 수동으로 적용할 수 있습니다.

## 메모리 부족 문제 해결

### Swap 메모리 설정 (임시 해결책)

```bash
# Swap 파일 생성 (1GB)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구적으로 설정
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 메모리 사용량 최적화

1. **불필요한 서비스 중지**
```bash
# 사용하지 않는 서비스 확인
sudo systemctl list-units --type=service --state=running

# 불필요한 서비스 중지 (예: nginx가 Docker로 실행 중이면)
sudo systemctl stop nginx
sudo systemctl disable nginx
```

2. **Docker 이미지 정리**
```bash
# 사용하지 않는 이미지 삭제
docker image prune -a

# 사용하지 않는 볼륨 삭제
docker volume prune
```

3. **로그 파일 정리**
```bash
# Docker 로그 크기 제한 (이미 설정됨)
# max-size: "10m", max-file: "3"
```

## 모니터링 스크립트

```bash
#!/bin/bash
# 메모리 모니터링 스크립트

echo "=== 시스템 메모리 ==="
free -h

echo ""
echo "=== Docker 컨테이너 메모리 ==="
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"

echo ""
echo "=== 메모리 사용량 상위 프로세스 ==="
ps aux --sort=-%mem | head -10
```

## 권장 사항

1. **정기적인 모니터링**: `docker stats`로 메모리 사용량 확인
2. **로그 관리**: 로그 파일 크기 제한 설정 (이미 적용됨)
3. **이미지 정리**: 주기적으로 사용하지 않는 이미지 삭제
4. **Swap 설정**: 메모리 부족 시 Swap 메모리 추가 고려

## 문제 발생 시

메모리 부족으로 컨테이너가 종료되는 경우:

```bash
# 1. 메모리 사용량 확인
docker stats --no-stream

# 2. 로그 확인
docker-compose -f infrastructure/aws/docker-compose.prod.yml logs

# 3. 메모리 제한 조정 후 재시작
docker-compose -f infrastructure/aws/docker-compose.prod.yml down
docker-compose -f infrastructure/aws/docker-compose.prod.yml up -d
```

