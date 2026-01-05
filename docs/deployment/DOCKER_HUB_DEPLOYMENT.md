# Docker Hub 기반 AWS EC2 배포 가이드

이 문서는 로컬에서 빌드하여 Docker Hub에 올린 이미지를 AWS EC2 서버에서 받아 실행하는 방법을 안내합니다.

## 1. 개요

기존 방식은 EC2 서버에서 소스 코드를 `git pull` 받고 직접 빌드하는 방식이었습니다.
이 가이드의 방식은 **로컬/CI 환경에서 빌드 후 Docker Hub에 Push**하고, **EC2에서는 Pull**만 받아 실행합니다.

**장점**:
- EC2 서버의 리소스(CPU/RAM)를 빌드에 소모하지 않습니다.
- 배포 시간이 단축됩니다.
- 빌드 환경 일관성이 보장됩니다.

## 2. 사전 준비 (EC2 서버)

EC2 서버에 SSH로 접속한 상태여야 합니다.

### 2.1 Docker Hub 로그인
private 리포지토리를 사용하는 경우 로그인이 필요합니다. (public인 경우 건너뛰어도 됩니다)

```bash
docker login
# Username과 Password 입력
```

### 2.2 배포 파일 준비
`infrastructure/aws/docker-compose.hub.yml` 파일을 사용합니다.
Git으로 프로젝트를 pull 받으면 해당 파일이 존재합니다.

```bash
cd /home/ec2-user/Mysic
git pull origin main
```

## 3. 환경 변수 설정

`.env.production` 파일에 Docker Hub 관련 설정을 추가해야 합니다.

```bash
nano .env.production
```

다음 내용을 추가/확인합니다:

```env
# ... 기존 설정들 ...

# Docker Hub Username (본인의 아이디로 변경)
DOCKER_HUB_USERNAME=your_docker_hub_id
```

## 4. 서비스 실행

Docker Hub에서 이미지를 받아 서비스를 실행합니다.

```bash
# 1. 기존 서비스 종료 (필요한 경우)
docker-compose -f infrastructure/aws/docker-compose.prod.yml down
docker-compose -f infrastructure/aws/docker-compose.hub.yml down

# 2. Docker Hub 기반으로 실행
# --pull always 옵션은 항상 최신 이미지를 확인하여 다운로드합니다.
docker-compose -f infrastructure/aws/docker-compose.hub.yml up -d --pull always
```

## 5. 배포 프로세스 요약

### 로컬 개발 환경에서:
1. 코드 수정 및 테스트 완료 (`pytest`)
2. 이미지 빌드 및 태그 (`docker tag ...`)
3. Docker Hub로 업로드 (`docker push ...`)

### EC2 서버에서:
1. `docker-compose ... pull` 명령어로 새 이미지 다운로드
2. `docker-compose ... up -d` 명령어로 서비스 재시작

## 6. 트러블슈팅

### 이미지를 찾을 수 없는 경우
`pull access denied` 또는 `manifest for ... not found` 에러 발생 시:
1. Docker Hub 로그인이 되어 있는지 확인 (`docker login`)
2. 이미지가 Docker Hub에 정상적으로 Push 되었는지 웹사이트에서 확인
3. `.env.production`의 `DOCKER_HUB_USERNAME`이 정확한지 확인

## 7. 환경별 실행 방법

실행 환경(Local vs Production)에 따라 서로 다른 환경 변수 파일을 적용해야 할 경우, `--env-file` 옵션을 사용합니다.

### 7.1 로컬 개발 환경 (.env.local)
```bash
# 로컬 설정 파일(.env.local)을 적용하여 실행
docker-compose --env-file .env.local up
```

### 7.2 프로덕션 환경 (.env.production)
```bash
# 프로덕션 설정 파일(.env.production)을 적용하여 실행
docker-compose --env-file .env.production -f infrastructure/aws/docker-compose.hub.yml up -d
```

