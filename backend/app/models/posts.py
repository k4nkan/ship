from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class PostInput(BaseModel):
    team: str = Field(min_length=1, max_length=32)
    nickname: str = Field(min_length=1, max_length=80)
    comment: str = Field(min_length=1, max_length=2000)
    photoDataUrl: str = Field(min_length=1)


class PostResult(BaseModel):
    gyan: int
    gyanLevel: str = Field(validation_alias=AliasChoices("gyanLevel", "level"))
    reaction: str
    facebookText: str

    model_config = ConfigDict(populate_by_name=True)


class AdventurePost(PostInput, PostResult):
    id: str
    createdAt: str
    imagePath: str = ""
    resultImagePath: str | None = None
    imageUrl: str = ""

    model_config = ConfigDict(populate_by_name=True)


class PostSummary(BaseModel):
    posts: list[AdventurePost]
    totalGyan: int
    lastPost: AdventurePost | None
    currentSpeed: int


class JourneyState(BaseModel):
    totalGyan: int
    progress: float
    speed: int
    updatedAt: str
