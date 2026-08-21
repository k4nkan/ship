from functools import lru_cache

from app.core.config import get_settings


@lru_cache
def get_supabase_client():
    settings = get_settings()
    if not settings.supabase_database_enabled:
        return None

    try:
        from supabase import create_client
    except ImportError as exc:
        raise RuntimeError("Supabase SDK is not installed") from exc

    return create_client(settings.supabase_url, settings.supabase_secret_key)
