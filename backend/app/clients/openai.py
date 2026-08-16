from app.core.config import get_settings


def create_openai_client():
    settings = get_settings()
    if not settings.openai_enabled or not settings.openai_api_key:
        return None

    try:
        from openai import OpenAI
    except ImportError as exc:
        raise RuntimeError("OpenAI SDK is not installed") from exc

    return OpenAI(api_key=settings.openai_api_key)
