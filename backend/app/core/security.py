from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import bcrypt
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash.
    
    Note: bcrypt는 비밀번호를 72바이트로 제한합니다.
    비밀번호가 72바이트를 초과할 경우 자동으로 잘라냅니다.
    """
    # 입력 검증 및 강제 변환
    if not isinstance(plain_password, str):
        plain_password = str(plain_password)
    
    # UTF-8로 인코딩하여 바이트 길이 확인
    try:
        password_bytes = plain_password.encode('utf-8')
    except (UnicodeEncodeError, AttributeError):
        # 인코딩 실패 시 문자열로 강제 변환 후 재시도
        plain_password = str(plain_password)
        password_bytes = plain_password.encode('utf-8')
    
    # 72바이트 제한 (bcrypt 제한) - 반드시 적용
    if len(password_bytes) > 72:
        # 72바이트로 제한
        password_bytes = password_bytes[:72]
        # 잘린 UTF-8 문자 제거 (연속 바이트 제거)
        # UTF-8 연속 바이트는 0x80-0xBF 범위 (상위 2비트가 10)
        while len(password_bytes) > 0 and (password_bytes[-1] & 0xC0) == 0x80:
            password_bytes = password_bytes[:-1]
    
    # hashed_password가 문자열인 경우 bytes로 변환
    if isinstance(hashed_password, str):
        hashed_bytes = hashed_password.encode('utf-8')
    else:
        hashed_bytes = hashed_password
    
    # bcrypt를 직접 사용하여 비밀번호 검증 (passlib 대신)
    # 이렇게 하면 72바이트 제한을 우리가 제어할 수 있음
    try:
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        # bcrypt 직접 사용 실패 시 passlib으로 fallback
        try:
            # 잘린 비밀번호를 다시 디코딩하여 passlib에 전달
            plain_password = password_bytes.decode('utf-8', errors='ignore')
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e2:
            # 모든 방법 실패
            import traceback
            print(f"ERROR in verify_password (bcrypt direct): {e}")
            print(f"ERROR in verify_password (passlib fallback): {e2}")
            traceback.print_exc()
            return False


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
    
    # passlib의 bcrypt handler가 내부적으로 72바이트 검증을 먼저 수행할 수 있으므로
    # bcrypt 라이브러리를 직접 사용하여 더 확실한 제어
    try:
        # bcrypt는 bytes를 받으므로 UTF-8로 인코딩
        # final_bytes는 이미 위에서 계산되었고 72바이트 이하로 보장됨
        password_bytes = final_bytes
        
        # bcrypt를 직접 사용하여 해싱
        # bcrypt.gensalt()로 솔트 생성, rounds는 기본값(12) 사용
        hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
        
        # bytes를 str로 변환하여 반환 (passlib 형식과 호환)
        return hashed.decode('utf-8')
    except Exception as e:
        # bcrypt 직접 사용 실패 시 passlib으로 fallback
        try:
            return pwd_context.hash(password)
        except Exception as e2:
            # 오류 발생 시 상세 정보 출력
            import traceback
            print(f"ERROR in get_password_hash (bcrypt direct): {e}")
            print(f"ERROR in get_password_hash (passlib fallback): {e2}")
            print(f"Password type: {type(password)}, Password value: {repr(password)}")
            print(f"Password bytes length: {len(password.encode('utf-8'))}")
            print(f"Password bytes (first 100): {password.encode('utf-8')[:100]}")
            traceback.print_exc()
            raise


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    import logging
    logger = logging.getLogger(__name__)
    
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    logger.info(f"Creating access token for user_id: {data.get('sub')}")
    logger.info(f"Token will expire at: {expire} (UTC)")
    logger.info(f"Token expire minutes: {settings.ACCESS_TOKEN_EXPIRE_MINUTES}")
    logger.info(f"Using SECRET_KEY length: {len(settings.SECRET_KEY)}")
    logger.info(f"Using ALGORITHM: {settings.ALGORITHM}")
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    logger.info(f"Token created successfully. Token length: {len(encoded_jwt)}")
    logger.debug(f"Token preview: {encoded_jwt[:20]}...")
    
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token."""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"Attempting to decode token. Token length: {len(token)}")
    logger.info(f"Using SECRET_KEY length: {len(settings.SECRET_KEY)}")
    logger.info(f"Using ALGORITHM: {settings.ALGORITHM}")
    logger.debug(f"Token preview: {token[:20]}...")
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        logger.info(f"Token decoded successfully. User ID: {payload.get('sub')}")
        logger.info(f"Token expires at: {datetime.fromtimestamp(payload.get('exp', 0))} (UTC)")
        logger.info(f"Current time: {datetime.utcnow()} (UTC)")
        return payload
    except jwt.ExpiredSignatureError as e:
        logger.warning(f"Token has expired: {str(e)}")
        logger.warning(f"Current time: {datetime.utcnow()} (UTC)")
        return None
    except jwt.JWTClaimsError as e:
        logger.warning(f"Token claims error: {str(e)}")
        return None
    except JWTError as e:
        # InvalidSignatureError는 python-jose에 없으므로 JWTError로 처리
        logger.warning(f"JWT decode error: {str(e)}")
        logger.warning(f"Error type: {type(e).__name__}")
        # 시그니처 관련 에러인지 확인
        if "signature" in str(e).lower() or "invalid" in str(e).lower():
            logger.error(f"Token signature is invalid. This usually means SECRET_KEY mismatch between token creation and verification.")
        return None
    except Exception as e:
        logger.error(f"Unexpected error decoding token: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(traceback.format_exc())
        return None

