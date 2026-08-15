from pydantic import BaseModel, Field


class PostInput(BaseModel):
    team: str = Field(min_length=1, max_length=32)
    nickname: str = Field(min_length=1, max_length=80)
    comment: str = Field(min_length=1, max_length=2000)
    photoDataUrl: str = Field(min_length=1)


class PostResult(BaseModel):
    gyan: int
    level: str
    reaction: str
    facebookText: str


class AdventurePost(PostInput, PostResult):
    id: str
    createdAt: str


class PostSummary(BaseModel):
    posts: list[AdventurePost]
    totalGyan: int
    lastPost: AdventurePost | None
    currentSpeed: int
