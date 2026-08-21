from pydantic import BaseModel, Field


class AdminLogin(BaseModel):
    password: str = Field(min_length=1, max_length=256)


class AdminSession(BaseModel):
    token: str
