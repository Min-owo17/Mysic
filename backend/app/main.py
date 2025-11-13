from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from typing import List

app = FastAPI(
    title=settings.APP_NAME,
    description="악기 연주자 연습 기록 서비스 API",
    version="1.0.0"
)

# CORS 설정
# settings.CORS_ORIGINS가 리스트인지 확인 (안전장치)
cors_origins: List[str] = settings.CORS_ORIGINS
if isinstance(cors_origins, str):
    cors_origins = [origin.strip() for origin in cors_origins.split(',') if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "Hello World! 🎵",
        "service": "Mysic - 악기 연주자 연습 기록 서비스",
        "status": "프로젝트 구조 확장 완료! ✅",
        "environment": settings.ENVIRONMENT
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/test")
async def test():
    return {
        "message": "API 테스트 성공!",
        "environment": settings.ENVIRONMENT
    }

