from datetime import datetime, timezone

ROUTE_TARGET_GYAN = 1000
BASE_SPEED = 20
GYAN_SPEED_RATE = 0.2


def calculate_speed(total_gyan: int) -> int:
    return round(BASE_SPEED + total_gyan * GYAN_SPEED_RATE)


def advance_progress(progress: float, speed: int, updated_at: datetime) -> float:
    elapsed_hours = max(
        0,
        (datetime.now(timezone.utc) - updated_at).total_seconds() / 3600,
    )
    return min(1, progress + (elapsed_hours * speed / ROUTE_TARGET_GYAN))


def parse_datetime(value: str | datetime | None) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return datetime.now(timezone.utc)
