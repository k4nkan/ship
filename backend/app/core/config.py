from functools import lru_cache
from pathlib import Path
from pydantic import BaseModel
import os


class Settings(BaseModel):
    port: int = 4173
    allowed_origin: str = "http://127.0.0.1:5173"
    data_file: Path = Path("backend/data/posts.json")


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
        port=int(os.environ.get("PORT", "4173")),
        allowed_origin=os.environ.get("ALLOWED_ORIGIN", "http://127.0.0.1:5173"),
        data_file=data_file,
    )
