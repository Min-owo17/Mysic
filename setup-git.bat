@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 현재 디렉토리: %CD%

echo.
echo Git 저장소 초기화 중...
git init

echo.
echo 파일 추가 중...
git add backend/
git add frontend/
git add infrastructure/
git add *.md
git add .gitignore

echo.
echo 커밋 생성 중...
git commit -m "Initial commit"

echo.
echo 원격 저장소 추가 중...
git remote add origin https://github.com/Min-owo17/Mysic.git

echo.
echo 원격 저장소 확인:
git remote -v

echo.
echo ========================================
echo 설정 완료!
echo.
echo 다음 명령어로 GitHub에 push하세요:
echo   git push -u origin master
echo.
echo 또는 브랜치가 main인 경우:
echo   git push -u origin main
echo ========================================
pause

