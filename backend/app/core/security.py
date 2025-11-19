from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password.
    
    Note: bcrypt는 비밀번호를 72바이트로 제한합니다.
    비밀번호가 72바이트를 초과할 경우 자동으로 잘라냅니다.
    """
    # 입력 검증 및 강제 변환
    if not isinstance(password, str):
        password = str(password)
    
    # UTF-8로 인코딩하여 바이트 길이 확인 (에러 처리 강화)
    try:
        password_bytes = password.encode('utf-8')
    except (UnicodeEncodeError, AttributeError) as e:
        # 인코딩 실패 시 문자열로 강제 변환 후 재시도
        password = str(password)
        password_bytes = password.encode('utf-8')
    
    # 72바이트 제한 (bcrypt 제한) - 반드시 적용
    if len(password_bytes) > 72:
        # 72바이트로 제한
        password_bytes = password_bytes[:72]
        # 잘린 UTF-8 문자 제거 (연속 바이트 제거)
        # UTF-8 연속 바이트는 0x80-0xBF 범위 (상위 2비트가 10)
        while len(password_bytes) > 0 and (password_bytes[-1] & 0xC0) == 0x80:
            password_bytes = password_bytes[:-1]
        # 안전하게 디코딩
        password = password_bytes.decode('utf-8', errors='ignore')
        # 최종 확인: 다시 인코딩하여 길이 검증
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            # 여전히 72바이트 초과 시 강제로 잘라냄
            password_bytes = password_bytes[:72]
            # 다시 UTF-8 경계 확인
            while len(password_bytes) > 0 and (password_bytes[-1] & 0xC0) == 0x80:
                password_bytes = password_bytes[:-1]
            password = password_bytes.decode('utf-8', errors='ignore')
    
    # passlib에 str 타입으로 전달하기 전 최종 검증
    # 디버깅: 실제 전달되는 값 확인
    final_bytes = password.encode('utf-8')
    if len(final_bytes) > 72:
        # 이 시점에서 72바이트를 초과하면 심각한 문제
        raise ValueError(
            f"Password still exceeds 72 bytes after truncation: "
            f"{len(final_bytes)} bytes (password: {repr(password[:50])})"
        )
    
    # passlib에 str 타입으로 전달 (bcrypt 버전 읽기 오류 방지)
    # passlib의 bcrypt handler는 str을 받아서 내부에서 bytes로 변환합니다
    # bytes를 직접 전달하면 "error reading bcrypt version" 오류가 발생할 수 있음
    try:
        return pwd_context.hash(password)
    except Exception as e:
        # 오류 발생 시 상세 정보 출력
        import traceback
        print(f"ERROR in get_password_hash: {e}")
        print(f"Password type: {type(password)}, Password value: {repr(password)}")
        print(f"Password bytes length: {len(password.encode('utf-8'))}")
        print(f"Password bytes (first 100): {password.encode('utf-8')[:100]}")
        traceback.print_exc()
        raise


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

