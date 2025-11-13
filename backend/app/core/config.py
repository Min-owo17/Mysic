# ⚠️ 주의: 이 파일은 더 이상 사용되지 않습니다.
# Python은 config/ 디렉토리를 패키지로 인식하므로,
# config/__init__.py 파일의 내용이 사용됩니다.
# 이 파일은 삭제해도 되지만, 참고용으로 남겨둡니다.

# 실제 설정은 backend/app/core/config/__init__.py를 참고하세요.

from pydantic_settings import BaseSettings
from typing import List, Union
from pydantic import field_validator


class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "Mysic API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql://mysic_user:mysic_password@localhost:5432/mysic_db"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS - 환경변수에서 쉼표로 구분된 문자열을 받을 수 있도록 Union 사용
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:5173,http://localhost"
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """환경변수에서 쉼표로 구분된 문자열을 리스트로 변환"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        elif isinstance(v, list):
            return v
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# CORS_ORIGINS가 문자열인 경우 리스트로 변환 (안전장치)
if isinstance(settings.CORS_ORIGINS, str):
    settings.CORS_ORIGINS = [origin.strip() for origin in settings.CORS_ORIGINS.split(',') if origin.strip()]

