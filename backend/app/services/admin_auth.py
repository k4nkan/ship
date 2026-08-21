from hashlib import sha256
import hmac
import time

from fastapi import Header, HTTPException

ADMIN_TOKEN_TTL_SECONDS = 12 * 60 * 60


def create_admin_token(password: str, configured_password: str) -> str | None:
    if not configured_password or not hmac.compare_digest(
        password, configured_password
    ):
        return None

    issued_at = str(int(time.time()))
    signature = _sign(issued_at, configured_password)
    return f"{issued_at}.{signature}"


def require_admin_token(authorization: str | None = Header(default=None)) -> None:
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.admin_password or not authorization:
        raise _unauthorized()

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not _is_valid_token(
        token, settings.admin_password
    ):
        raise _unauthorized()


def _is_valid_token(token: str, configured_password: str) -> bool:
    parts = token.split(".", 1)
    if len(parts) != 2:
        return False

    issued_at, signature = parts
    try:
        issued_timestamp = int(issued_at)
    except ValueError:
        return False

    now = int(time.time())
    if issued_timestamp > now + 60 or now - issued_timestamp > ADMIN_TOKEN_TTL_SECONDS:
        return False

    return hmac.compare_digest(signature, _sign(issued_at, configured_password))


def _sign(value: str, password: str) -> str:
    return hmac.new(
        password.encode("utf-8"), value.encode("utf-8"), sha256
    ).hexdigest()


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail="管理者認証が必要です",
        headers={"WWW-Authenticate": "Bearer"},
    )
