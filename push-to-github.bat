@echo off
chcp 65001 >nul
echo ========================================
echo GitHub Push 스크립트
echo ========================================
echo.

cd /d "%~dp0"
echo 현재 디렉토리: %CD%
echo.

echo 1. Git 저장소 확인...
if not exist ".git" (
    echo Git 저장소가 없습니다. 초기화 중...
    git init
) else (
    echo Git 저장소가 이미 존재합니다.
)
echo.

echo 2. 원격 저장소 확인...
git remote -v
if errorlevel 1 (
    echo 원격 저장소가 없습니다. 추가 중...
    git remote add origin https://github.com/Min-owo17/Mysic.git
) else (
    echo 원격 저장소가 이미 설정되어 있습니다.
)
echo.

echo 3. 파일 추가 중...
git add backend/ frontend/ infrastructure/ *.md .gitignore
echo.

echo 4. 커밋 생성 중...
git commit -m "Initial commit"
echo.

echo 5. 브랜치 확인...
git branch
echo.

echo 6. GitHub에 push 중...
echo 브랜치 이름을 확인한 후 push합니다...
git branch --show-current
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo 현재 브랜치: %CURRENT_BRANCH%
echo.

if "%CURRENT_BRANCH%"=="main" (
    echo main 브랜치로 push합니다...
    git push -u origin main
) else (
    echo master 브랜치로 push합니다...
    git push -u origin master
)

if errorlevel 1 (
    echo.
    echo ========================================
    echo Push 실패!
    echo.
    echo 다음을 확인하세요:
    echo 1. GitHub 인증이 설정되어 있는지
    echo 2. 저장소 URL이 올바른지
    echo 3. 네트워크 연결이 되어 있는지
    echo.
    echo 수동으로 push하려면:
    echo   git push -u origin master
    echo   또는
    echo   git push -u origin main
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Push 성공!
    echo ========================================
)

pause







