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
    # 입력 검증
    if not isinstance(password, str):
        password = str(password)
    
    # UTF-8로 인코딩하여 바이트 길이 확인
    password_bytes = password.encode('utf-8')
    
    # 72바이트 제한 (bcrypt 제한)
    if len(password_bytes) > 72:
        # 72바이트로 제한
        password_bytes = password_bytes[:72]
        # 잘린 UTF-8 문자 제거 (연속 바이트 제거)
        # UTF-8 연속 바이트는 0x80-0xBF 범위 (상위 2비트가 10)
        while len(password_bytes) > 0 and (password_bytes[-1] & 0xC0) == 0x80:
            password_bytes = password_bytes[:-1]
        # 안전하게 디코딩
        password = password_bytes.decode('utf-8', errors='ignore')
        # 다시 인코딩하여 최종 확인
        password_bytes = password.encode('utf-8')
    
    # passlib에 bytes를 직접 전달 (더 확실한 방법)
    # passlib의 bcrypt는 bytes와 str 모두 지원하지만, bytes를 직접 전달하는 것이 더 안전
    try:
        # bytes를 직접 전달하는 방법 (passlib이 지원)
        # bytes 타입으로 전달하면 passlib이 내부에서 처리
        return pwd_context.hash(password_bytes)
    except (TypeError, ValueError, AttributeError):
        # str을 전달하는 방법 (fallback)
        # 일부 버전의 passlib은 bytes를 직접 받지 않을 수 있음
        return pwd_context.hash(password)


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

