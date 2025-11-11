# Git 저장소 설정 가이드

## 문제 상황
- Git 저장소가 홈 디렉토리에 잘못 초기화되어 있음
- 프로젝트 디렉토리에 Git 저장소가 없음

## 해결 방법

### 방법 1: Git Bash 사용 (권장)

1. Git Bash를 열고 다음 명령어를 실행하세요:

```bash
# 프로젝트 디렉토리로 이동
cd "/c/Users/Lein(홍혜민)/Desktop/개발/Mysic"

# Git 저장소 초기화
git init

# 모든 파일 추가
git add .

# 첫 커밋 생성
git commit -m "Initial commit"

# 원격 저장소 추가 (GitHub 저장소 URL로 변경)
git remote add origin https://github.com/your-username/your-repo.git

# GitHub에 push
git push -u origin master
```

### 방법 2: PowerShell에서 실행

PowerShell을 관리자 권한으로 열고 다음을 실행:

```powershell
# UTF-8 인코딩 설정
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 프로젝트 디렉토리로 이동
Set-Location -LiteralPath "C:\Users\Lein(홍혜민)\Desktop\개발\Mysic"

# Git 저장소 초기화
git init

# 모든 파일 추가
git add .

# 첫 커밋 생성
git commit -m "Initial commit"

# 원격 저장소 추가
git remote add origin https://github.com/your-username/your-repo.git

# GitHub에 push
git push -u origin master
```

## 주의사항

1. **GitHub 저장소 URL**: `https://github.com/your-username/your-repo.git` 부분을 실제 GitHub 저장소 URL로 변경하세요.

2. **브랜치 이름**: GitHub에서 기본 브랜치가 `main`인 경우, 마지막 명령어를 다음과 같이 변경하세요:
   ```bash
   git push -u origin main
   ```

3. **인증**: GitHub에 push할 때 인증이 필요할 수 있습니다. Personal Access Token을 사용하거나 SSH 키를 설정하세요.

## GitHub 저장소 생성

아직 GitHub 저장소가 없다면:

1. GitHub에 로그인
2. 우측 상단의 "+" 버튼 클릭 → "New repository"
3. 저장소 이름 입력 (예: `Mysic`)
4. Public 또는 Private 선택
5. "Create repository" 클릭
6. 생성된 저장소의 URL을 복사하여 위의 명령어에 사용

