from fastapi import APIRouter, Depends

from app.core.config import get_settings
from app.models.posts import PostInput, PostResult, PostSummary
from app.services.gyan import generate_post_result
from app.services.post_store import JsonPostStore

router = APIRouter(prefix="/api", tags=["posts"])


def get_post_store() -> JsonPostStore:
    return JsonPostStore(get_settings().data_file)


@router.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@router.get("/posts", response_model=PostSummary)
def list_posts(store: JsonPostStore = Depends(get_post_store)) -> PostSummary:
    return store.summarize()


@router.post("/posts", response_model=PostSummary)
def create_post(
    post: PostInput,
    store: JsonPostStore = Depends(get_post_store),
) -> PostSummary:
    store.create_post(post)
    return store.summarize()


@router.delete("/posts", response_model=PostSummary)
def clear_posts(store: JsonPostStore = Depends(get_post_store)) -> PostSummary:
    store.clear_posts()
    return store.summarize()


@router.post("/gyan/generate", response_model=PostResult)
def generate_gyan(post: PostInput) -> PostResult:
    return generate_post_result(post)
