import logging

from fastapi import APIRouter, Depends, HTTPException

from app.clients.supabase import get_supabase_client
from app.core.config import get_settings
from app.models.posts import (
    AdventurePost,
    JourneyState,
    PostInput,
    PostResult,
    PostSummary,
)
from app.services.gyan import generate_post_result
from app.services.post_store import JsonPostStore, SupabasePostStore

router = APIRouter(prefix="/api", tags=["posts"])
logger = logging.getLogger(__name__)


def get_post_store() -> JsonPostStore | SupabasePostStore:
    settings = get_settings()
    client = get_supabase_client()
    if client:
        return SupabasePostStore(client, settings)
    return JsonPostStore(settings.data_file)


@router.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@router.get("/posts/{post_id}", response_model=AdventurePost)
def get_post(
    post_id: str,
    store: JsonPostStore | SupabasePostStore = Depends(get_post_store),
) -> AdventurePost:
    if isinstance(store, SupabasePostStore):
        post = store.get_post(post_id)
    else:
        post = next((post for post in store.list_posts() if post.id == post_id), None)

    if not post:
        raise HTTPException(status_code=404, detail="post not found")

    return post


@router.get("/posts", response_model=PostSummary)
def list_posts(
    store: JsonPostStore | SupabasePostStore = Depends(get_post_store),
) -> PostSummary:
    try:
        return store.summarize()
    except Exception as exc:
        logger.exception("Post summary failed")
        raise HTTPException(status_code=502, detail="Supabase接続に失敗しました") from exc


@router.post("/posts", response_model=PostSummary)
def create_post(
    post: PostInput,
    store: JsonPostStore | SupabasePostStore = Depends(get_post_store),
) -> PostSummary:
    try:
        store.create_post(post)
        return store.summarize()
    except ValueError as exc:
        logger.exception("Image conversion failed")
        raise HTTPException(status_code=400, detail="画像変換に失敗しました") from exc
    except Exception as exc:
        logger.exception("Post creation failed")
        raise HTTPException(status_code=502, detail="投稿保存に失敗しました") from exc


@router.delete("/posts", response_model=PostSummary)
def clear_posts(
    store: JsonPostStore | SupabasePostStore = Depends(get_post_store),
) -> PostSummary:
    try:
        store.clear_posts()
        return store.summarize()
    except Exception as exc:
        logger.exception("Post clear failed")
        raise HTTPException(status_code=502, detail="投稿削除に失敗しました") from exc


@router.post("/gyan/generate", response_model=PostResult)
def generate_gyan(post: PostInput) -> PostResult:
    try:
        return generate_post_result(post)
    except Exception as exc:
        logger.exception("GYAN generation failed")
        raise HTTPException(status_code=502, detail="OpenAI処理に失敗しました") from exc


@router.get("/journey", response_model=JourneyState)
def get_journey(
    store: JsonPostStore | SupabasePostStore = Depends(get_post_store),
) -> JourneyState:
    try:
        return store.get_journey_state()
    except Exception as exc:
        logger.exception("Journey fetch failed")
        raise HTTPException(status_code=502, detail="Supabase接続に失敗しました") from exc
