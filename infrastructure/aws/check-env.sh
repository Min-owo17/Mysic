#!/bin/bash

# 환경 변수 검증 스크립트
# 사용법: ./check-env.sh [.env 파일 경로]
# 예시: ./check-env.sh .env.production

# 스크립트의 실제 위치 찾기 (심볼릭 링크도 처리)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 프로젝트 루트 찾기 (infrastructure/aws 폴더에서 2단계 위로)
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 기본 .env.production 경로 (프로젝트 루트 기준)
DEFAULT_ENV_FILE="$PROJECT_ROOT/.env.production"

# 사용자가 경로를 제공한 경우 처리
if [ -n "$1" ]; then
    # 절대 경로인지 확인
    if [[ "$1" == /* ]]; then
        ENV_FILE="$1"
    else
        # 상대 경로인 경우 현재 작업 디렉토리 기준
        ENV_FILE="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
    fi
else
    ENV_FILE="$DEFAULT_ENV_FILE"
fi

echo "🔍 환경 변수 검증을 시작합니다..."
echo "📁 스크립트 위치: $SCRIPT_DIR"
echo "📁 프로젝트 루트: $PROJECT_ROOT"
echo "📁 환경 변수 파일: $ENV_FILE"
echo ""

# 파일 존재 확인
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ 오류: $ENV_FILE 파일을 찾을 수 없습니다."
    echo ""
    echo "💡 해결 방법:"
    echo "   1. 프로젝트 루트($PROJECT_ROOT)에 .env.production 파일이 있는지 확인하세요:"
    echo "      ls -la $PROJECT_ROOT/.env.production"
    echo ""
    echo "   2. 파일이 없다면 다음 명령어로 생성하세요:"
    echo "      cd $PROJECT_ROOT"
    echo "      cp infrastructure/aws/env.example .env.production"
    echo ""
    echo "   3. 또는 명시적으로 경로를 지정하세요:"
    echo "      ./check-env.sh $PROJECT_ROOT/.env.production"
    exit 1
fi

# 환경 변수 로드
set -a
source "$ENV_FILE" 2>/dev/null || {
    echo "❌ 오류: $ENV_FILE 파일을 읽을 수 없습니다."
    exit 1
}
set +a

# 필수 환경 변수 목록
required_vars=(
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB"
    "SECRET_KEY"
    "REACT_APP_API_URL"
)

# 선택적 환경 변수 목록 (경고만 표시)
optional_vars=(
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_REGION"
    "AWS_S3_BUCKET"
    "CORS_ORIGINS"
)

missing_vars=()
warning_vars=()

# 필수 변수 확인
echo "📋 필수 환경 변수 확인 중..."
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
        echo "   ❌ $var: 설정되지 않음"
    else
        # 비밀번호는 마스킹
        if [[ "$var" == *"PASSWORD"* ]] || [[ "$var" == "SECRET_KEY" ]]; then
            masked_value="${!var:0:4}****"
            echo "   ✅ $var: $masked_value"
        else
            echo "   ✅ $var: ${!var}"
        fi
    fi
done

echo ""
echo "📋 선택적 환경 변수 확인 중..."
for var in "${optional_vars[@]}"; do
    if [ -z "${!var}" ]; then
        warning_vars+=("$var")
        echo "   ⚠️  $var: 설정되지 않음 (선택사항)"
    else
        if [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"KEY"* ]]; then
            masked_value="${!var:0:4}****"
            echo "   ✅ $var: $masked_value"
        else
            echo "   ✅ $var: ${!var}"
        fi
    fi
done

echo ""

# 결과 출력
if [ ${#missing_vars[@]} -eq 0 ]; then
    echo "✅ 모든 필수 환경 변수가 설정되어 있습니다!"
    
    if [ ${#warning_vars[@]} -gt 0 ]; then
        echo ""
        echo "⚠️  다음 선택적 환경 변수가 설정되지 않았습니다:"
        printf '   - %s\n' "${warning_vars[@]}"
        echo ""
        echo "💡 참고: AWS 관련 변수는 S3를 사용하는 경우에만 필요합니다."
    fi
    
    echo ""
    echo "🚀 환경 변수 설정이 완료되었습니다. 배포를 진행할 수 있습니다."
    exit 0
else
    echo "❌ 다음 필수 환경 변수가 설정되지 않았습니다:"
    printf '   - %s\n' "${missing_vars[@]}"
    echo ""
    echo "💡 해결 방법:"
    echo "   1. $ENV_FILE 파일을 열어서 위 변수들을 설정하세요."
    echo "   2. infrastructure/aws/env.example 파일을 참고하세요."
    echo ""
    echo "📝 SECRET_KEY 생성 방법:"
    echo "   python3 -c \"import secrets; print(secrets.token_urlsafe(32))\""
    exit 1
fi

