from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.posts import router as posts_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Adventure GYAN API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.allowed_origin],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)
app.include_router(posts_router)
