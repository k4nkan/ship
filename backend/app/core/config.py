from functools import lru_cache
from pathlib import Path
from pydantic import BaseModel
import os


class Settings(BaseModel):
    port: int = 8000
    allowed_origin: str = "http://127.0.0.1:5173"
    data_file: Path = Path("backend/data/posts.json")
    openai_api_key: str = ""
    openai_enabled: bool = False
    openai_model: str = "gpt-4o-mini"
    supabase_url: str = ""
    supabase_secret_key: str = ""
    supabase_storage_bucket: str = ""

    @property
    def supabase_enabled(self) -> bool:
        return bool(
            self.supabase_url
            and self.supabase_secret_key
            and self.supabase_storage_bucket
        )


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


@lru_cache
def get_settings() -> Settings:
    root_dir = Path(__file__).resolve().parents[3]
    load_env_file(root_dir / ".env")

    data_file = Path(os.environ.get("DATA_FILE", "backend/data/posts.json"))
    if not data_file.is_absolute():
        data_file = root_dir / data_file

    return Settings(
        port=int(os.environ.get("PORT", "8000")),
        allowed_origin=os.environ.get("ALLOWED_ORIGIN", "http://127.0.0.1:5173"),
        data_file=data_file,
        openai_api_key=os.environ.get("OPENAI_API_KEY", ""),
        openai_enabled=os.environ.get("OPENAI_ENABLED", "false").lower() == "true",
        openai_model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
        supabase_url=os.environ.get("SUPABASE_URL", ""),
        supabase_secret_key=(
            os.environ.get("SUPABASE_SECRET_KEY")
            or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        ),
        supabase_storage_bucket=os.environ.get("SUPABASE_STORAGE_BUCKET", ""),
    )
