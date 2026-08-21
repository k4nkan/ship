from pydantic import BaseModel, Field


class CurrencyTransaction(BaseModel):
    id: str
    amount: int
    createdAt: str


class CurrencyChange(BaseModel):
    amount: int = Field(description="正数は配布、負数は使用")


class RaceState(BaseModel):
    isRunning: bool
    elapsedSeconds: float
    speedPerHour: float
    updatedAt: str


class TeamStats(BaseModel):
    id: str
    name: str
    color: str
    icon: str
    earnedCurrency: int
    spentCurrency: int
    balance: int
    progress: float
    rank: int
    recentTransactions: list[CurrencyTransaction] = Field(default_factory=list)


class TeamList(BaseModel):
    goalCurrency: int
    race: RaceState
    teams: list[TeamStats]
