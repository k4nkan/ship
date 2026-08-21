from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.teams import router as teams_router
from app.api.admin import router as admin_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Ship Team Currency API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.allowed_origin],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
app.include_router(teams_router)
app.include_router(admin_router)


@app.get("/health")
def root_health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/api/health")
def api_health() -> dict[str, bool]:
    return {"ok": True}
