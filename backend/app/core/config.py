from functools import lru_cache
from pathlib import Path
from pydantic import BaseModel
import os


class Settings(BaseModel):
    port: int = 8000
    allowed_origin: str = "http://127.0.0.1:5173"
    data_file: Path = Path("backend/data/posts.json")
    teams_data_file: Path = Path("backend/data/teams.json")
    admin_password: str = ""
    race_speed_per_hour: float = 0.03
    openai_api_key: str = ""
    openai_enabled: bool = False
    openai_model: str = "gpt-4o-mini"
    supabase_url: str = ""
    supabase_secret_key: str = ""
    supabase_storage_bucket: str = ""
    supabase_table_prefix: str = ""
    supabase_storage_prefix: str = ""

    @property
    def supabase_enabled(self) -> bool:
        return bool(
            self.supabase_url
            and self.supabase_secret_key
            and self.supabase_storage_bucket
        )

    @property
    def supabase_posts_table(self) -> str:
        return f"{self.supabase_table_prefix}posts"

    @property
    def supabase_journey_table(self) -> str:
        return f"{self.supabase_table_prefix}journey_state"

    @property
    def supabase_database_enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_secret_key)

    @property
    def supabase_teams_table(self) -> str:
        return f"{self.supabase_table_prefix}teams"

    @property
    def supabase_currency_transactions_table(self) -> str:
        return f"{self.supabase_table_prefix}currency_transactions"

    @property
    def supabase_race_table(self) -> str:
        return f"{self.supabase_table_prefix}race_state"

    @property
    def supabase_storage_path_prefix(self) -> str:
        prefix = self.supabase_storage_prefix.strip("/")
        return f"{prefix}/" if prefix else ""


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
    backend_dir = Path(__file__).resolve().parents[2]
    load_env_file(backend_dir / ".env")
    load_env_file(root_dir / ".env")

    data_file = Path(os.environ.get("DATA_FILE", "backend/data/posts.json"))
    if not data_file.is_absolute():
        data_file = root_dir / data_file

    teams_data_file = Path(
        os.environ.get("TEAMS_DATA_FILE", "backend/data/teams.json")
    )
    if not teams_data_file.is_absolute():
        teams_data_file = root_dir / teams_data_file

    return Settings(
        port=int(os.environ.get("PORT", "8000")),
        allowed_origin=os.environ.get("ALLOWED_ORIGIN", "http://127.0.0.1:5173"),
        data_file=data_file,
        teams_data_file=teams_data_file,
        admin_password=os.environ.get("ADMIN_PASSWORD", ""),
        race_speed_per_hour=float(os.environ.get("RACE_SPEED_PER_HOUR", "0.03")),
        openai_api_key=os.environ.get("OPENAI_API_KEY", ""),
        openai_enabled=os.environ.get("OPENAI_ENABLED", "false").lower() == "true",
        openai_model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
        supabase_url=os.environ.get("SUPABASE_URL", ""),
        supabase_secret_key=(
            os.environ.get("SUPABASE_SECRET_KEY")
            or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        ),
        supabase_storage_bucket=os.environ.get("SUPABASE_STORAGE_BUCKET", ""),
        supabase_table_prefix=os.environ.get("SUPABASE_TABLE_PREFIX", ""),
        supabase_storage_prefix=os.environ.get("SUPABASE_STORAGE_PREFIX", ""),
    )
