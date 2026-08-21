from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.models.admin import AdminLogin, AdminSession
from app.services.admin_auth import create_admin_token

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/auth", response_model=AdminSession)
def authenticate_admin(login: AdminLogin) -> AdminSession:
    settings = get_settings()
    if not settings.admin_password:
        raise HTTPException(
            status_code=503,
            detail="ADMIN_PASSWORDがbackendに設定されていません",
        )

    token = create_admin_token(login.password, settings.admin_password)
    if not token:
        raise HTTPException(status_code=401, detail="パスワードが違います")

    return AdminSession(token=token)
