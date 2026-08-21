import logging

from fastapi import APIRouter, Depends, HTTPException

from app.clients.supabase import get_supabase_client
from app.core.config import get_settings
from app.models.teams import CurrencyChange, TeamList
from app.services.team_store import (
    InsufficientCurrencyError,
    JsonTeamStore,
    SupabaseTeamStore,
    UnknownTeamError,
)
from app.services.admin_auth import require_admin_token

router = APIRouter(prefix="/api", tags=["teams"])
logger = logging.getLogger(__name__)


def get_team_store() -> JsonTeamStore | SupabaseTeamStore:
    settings = get_settings()
    client = get_supabase_client()
    if client:
        return SupabaseTeamStore(client, settings)
    return JsonTeamStore(settings.teams_data_file, settings.race_speed_per_hour)


@router.get("/teams", response_model=TeamList)
def list_teams(
    store: JsonTeamStore | SupabaseTeamStore = Depends(get_team_store),
) -> TeamList:
    try:
        return store.list_teams()
    except Exception as exc:
        logger.exception("Team list failed")
        raise HTTPException(status_code=502, detail="チーム情報を取得できません") from exc


@router.post("/teams/{team_id}/currency", response_model=TeamList)
def add_currency(
    team_id: str,
    change: CurrencyChange,
    store: JsonTeamStore | SupabaseTeamStore = Depends(get_team_store),
    _: None = Depends(require_admin_token),
) -> TeamList:
    try:
        return store.add_currency(team_id, change)
    except UnknownTeamError as exc:
        raise HTTPException(status_code=404, detail="チームが見つかりません") from exc
    except InsufficientCurrencyError as exc:
        raise HTTPException(status_code=409, detail="残高が不足しています") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="通貨額が不正です") from exc
    except Exception as exc:
        logger.exception("Currency transaction failed")
        raise HTTPException(status_code=502, detail="通貨を更新できません") from exc


@router.post("/race/start", response_model=TeamList)
def start_race(
    store: JsonTeamStore | SupabaseTeamStore = Depends(get_team_store),
    _: None = Depends(require_admin_token),
) -> TeamList:
    try:
        return store.set_race_running(True)
    except Exception as exc:
        logger.exception("Race start failed")
        raise HTTPException(status_code=502, detail="レースを開始できません") from exc


@router.post("/race/stop", response_model=TeamList)
def stop_race(
    store: JsonTeamStore | SupabaseTeamStore = Depends(get_team_store),
    _: None = Depends(require_admin_token),
) -> TeamList:
    try:
        return store.set_race_running(False)
    except Exception as exc:
        logger.exception("Race stop failed")
        raise HTTPException(status_code=502, detail="レースを停止できません") from exc
