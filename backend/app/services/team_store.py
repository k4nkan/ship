from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from uuid import uuid4

from app.core.config import Settings
from app.models.teams import (
    CurrencyChange,
    CurrencyTransaction,
    RaceState,
    TeamList,
    TeamStats,
)
from app.services.journey import parse_datetime

logger = logging.getLogger(__name__)

ROUTE_TARGET_CURRENCY = 100_000_000

DEFAULT_TEAMS = [
    {"id": "A", "name": "A班", "color": "#8b5cf6", "icon": "🚢"},
    {"id": "B", "name": "B班", "color": "#2563eb", "icon": "🚢"},
    {"id": "C", "name": "C班", "color": "#eab308", "icon": "🚢"},
    {"id": "D", "name": "D班", "color": "#ef4444", "icon": "🚢"},
    {"id": "E", "name": "E班", "color": "#f97316", "icon": "🚢"},
    {"id": "F", "name": "F班", "color": "#14b8a6", "icon": "🚢"},
]


class InsufficientCurrencyError(ValueError):
    pass


class UnknownTeamError(ValueError):
    pass


class JsonTeamStore:
    def __init__(self, data_file: Path, race_speed_per_hour: float) -> None:
        self.data_file = data_file
        self.race_speed_per_hour = race_speed_per_hour

    def list_teams(self) -> TeamList:
        payload = self._read_payload()
        teams = payload["teams"]
        transactions = payload["transactions"]
        return _build_team_list(
            teams,
            transactions,
            _read_race_state(payload["race"]),
            self.race_speed_per_hour,
        )

    def add_currency(self, team_id: str, change: CurrencyChange) -> TeamList:
        payload = self._read_payload()
        team = next((item for item in payload["teams"] if item["id"] == team_id), None)
        if not team:
            raise UnknownTeamError("team not found")

        balance = sum(
            int(item["amount"])
            for item in payload["transactions"]
            if item["teamId"] == team_id
        )
        if change.amount == 0:
            raise ValueError("amount must not be zero")
        if change.amount < 0 and balance + change.amount < 0:
            raise InsufficientCurrencyError("insufficient currency")

        payload["transactions"].append(
            {
                "id": str(uuid4()),
                "teamId": team_id,
                "amount": change.amount,
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
        )
        self._write_payload(payload)
        return _build_team_list(
            payload["teams"],
            payload["transactions"],
            _read_race_state(payload["race"]),
            self.race_speed_per_hour,
        )

    def set_race_running(self, is_running: bool) -> TeamList:
        payload = self._read_payload()
        race = _read_race_state(payload["race"])
        elapsed_seconds = _get_elapsed_seconds(race)
        now = datetime.now(timezone.utc).isoformat()
        payload["race"] = {
            "isRunning": is_running,
            "elapsedSeconds": elapsed_seconds,
            "updatedAt": now,
        }
        self._write_payload(payload)
        return _build_team_list(
            payload["teams"],
            payload["transactions"],
            _read_race_state(payload["race"]),
            self.race_speed_per_hour,
        )

    def _read_payload(self) -> dict:
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        if not self.data_file.exists():
            payload = {
                "teams": DEFAULT_TEAMS,
                "transactions": [],
                "race": _default_race_state(),
            }
            self._write_payload(payload)
            return payload

        try:
            payload = json.loads(self.data_file.read_text())
            if isinstance(payload, dict) and isinstance(payload.get("transactions"), list):
                existing_teams = payload.get("teams") or []
                teams_by_id = {team["id"]: team for team in existing_teams}
                for team in DEFAULT_TEAMS:
                    teams_by_id.setdefault(team["id"], team)
                return {
                    "teams": list(teams_by_id.values()),
                    "transactions": payload["transactions"],
                    "race": payload.get("race") or _default_race_state(),
                }
        except (OSError, json.JSONDecodeError):
            logger.exception("Local team data read failed")

        return {
            "teams": DEFAULT_TEAMS,
            "transactions": [],
            "race": _default_race_state(),
        }

    def _write_payload(self, payload: dict) -> None:
        self.data_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


class SupabaseTeamStore:
    def __init__(self, client, settings: Settings) -> None:
        self.client = client
        self.teams_table = settings.supabase_teams_table
        self.transactions_table = settings.supabase_currency_transactions_table
        self.race_table = settings.supabase_race_table
        self.race_speed_per_hour = settings.race_speed_per_hour

    def list_teams(self) -> TeamList:
        teams_response = self.client.table(self.teams_table).select("*").execute()
        transactions_response = (
            self.client.table(self.transactions_table)
            .select("id, team_id, amount, created_at")
            .order("created_at", desc=False)
            .execute()
        )
        race = self._fetch_race_state()
        return _build_team_list(
            teams_response.data or [],
            transactions_response.data or [],
            race,
            self.race_speed_per_hour,
        )

    def add_currency(self, team_id: str, change: CurrencyChange) -> TeamList:
        if change.amount == 0:
            raise ValueError("amount must not be zero")

        current = self.list_teams()
        team = next((item for item in current.teams if item.id == team_id), None)
        if not team:
            raise UnknownTeamError("team not found")
        if change.amount < 0 and team.balance + change.amount < 0:
            raise InsufficientCurrencyError("insufficient currency")

        self.client.table(self.transactions_table).insert(
            {
                "team_id": team_id,
                "amount": change.amount,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        ).execute()
        return self.list_teams()

    def set_race_running(self, is_running: bool) -> TeamList:
        race = self._fetch_race_state()
        elapsed_seconds = _get_elapsed_seconds(race)
        updated_at = datetime.now(timezone.utc).isoformat()
        self.client.table(self.race_table).upsert(
            {
                "id": 1,
                "is_running": is_running,
                "elapsed_seconds": elapsed_seconds,
                "updated_at": updated_at,
            }
        ).execute()
        return self.list_teams()

    def _fetch_race_state(self) -> RaceState:
        response = (
            self.client.table(self.race_table)
            .select("*")
            .eq("id", 1)
            .limit(1)
            .execute()
        )
        row = (response.data or [None])[0]
        if not row:
            now = datetime.now(timezone.utc).isoformat()
            self.client.table(self.race_table).upsert(
                {
                    "id": 1,
                    "is_running": False,
                    "elapsed_seconds": 0,
                    "updated_at": now,
                }
            ).execute()
            return _default_race_state(now)

        return RaceState(
            isRunning=bool(row.get("is_running")),
            elapsedSeconds=float(row.get("elapsed_seconds") or 0),
            speedPerHour=self.race_speed_per_hour,
            updatedAt=str(row.get("updated_at") or ""),
        )


def _build_team_list(
    teams: list[dict],
    transactions: list[dict],
    race: RaceState,
    race_speed_per_hour: float,
) -> TeamList:
    elapsed_seconds = _get_elapsed_seconds(race)
    race = race.model_copy(
        update={
            "elapsedSeconds": elapsed_seconds,
            "speedPerHour": race_speed_per_hour,
        }
    )
    stats = []
    for team in teams:
        team_id = str(team["id"])
        team_transactions = [
            transaction
            for transaction in transactions
            if str(transaction.get("teamId") or transaction.get("team_id")) == team_id
        ]
        amounts = [int(transaction["amount"]) for transaction in team_transactions]
        earned = sum(amount for amount in amounts if amount > 0)
        spent = sum(abs(amount) for amount in amounts if amount < 0)
        recent = sorted(
            team_transactions,
            key=lambda transaction: transaction.get("createdAt")
            or transaction.get("created_at")
            or "",
            reverse=True,
        )[:5]
        stats.append(
            TeamStats(
                id=team_id,
                name=team["name"],
                color=team["color"],
                icon=team.get("icon") or "🚢",
                earnedCurrency=earned,
                spentCurrency=spent,
                balance=earned - spent,
                progress=min(
                    1,
                    earned / ROUTE_TARGET_CURRENCY
                    + elapsed_seconds / 3600 * race_speed_per_hour,
                ),
                rank=0,
                recentTransactions=[
                    CurrencyTransaction(
                        id=str(transaction["id"]),
                        amount=int(transaction["amount"]),
                        createdAt=str(
                            transaction.get("createdAt")
                            or transaction.get("created_at")
                            or ""
                        ),
                    )
                    for transaction in recent
                ],
            )
        )

    ranked = sorted(stats, key=lambda item: (-item.earnedCurrency, item.id))
    rank_by_id = {item.id: index + 1 for index, item in enumerate(ranked)}
    for item in stats:
        item.rank = rank_by_id[item.id]

    return TeamList(
        goalCurrency=ROUTE_TARGET_CURRENCY,
        race=race,
        teams=sorted(stats, key=lambda item: item.id),
    )


def _default_race_state(updated_at: str | None = None) -> dict:
    return {
        "isRunning": False,
        "elapsedSeconds": 0,
        "updatedAt": updated_at or datetime.now(timezone.utc).isoformat(),
    }


def _read_race_state(value: dict) -> RaceState:
    return RaceState(
        isRunning=bool(value.get("isRunning") or value.get("is_running")),
        elapsedSeconds=float(
            value.get("elapsedSeconds") or value.get("elapsed_seconds") or 0
        ),
        speedPerHour=0,
        updatedAt=str(value.get("updatedAt") or value.get("updated_at") or ""),
    )


def _get_elapsed_seconds(race: RaceState) -> float:
    if not race.isRunning:
        return race.elapsedSeconds

    updated_at = parse_datetime(race.updatedAt)
    if updated_at is None:
        return race.elapsedSeconds
    return race.elapsedSeconds + max(
        0, (datetime.now(timezone.utc) - updated_at).total_seconds()
    )
