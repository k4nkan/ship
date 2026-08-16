import json
import logging

from app.clients.openai import create_openai_client
from app.core.config import get_settings
from app.models.posts import PostInput, PostResult

logger = logging.getLogger(__name__)

GYAN_BY_LEVEL = {
    "small": 120,
    "medium": 145,
    "large": 170,
    "huge": 200,
}


def generate_post_result(post: PostInput) -> PostResult:
    client = create_openai_client()
    if client:
        return _generate_with_openai(client, post)

    return _generate_mock_result(post)


def _generate_mock_result(post: PostInput) -> PostResult:
    candidates = list(GYAN_BY_LEVEL.items())
    score_seed = ord(post.team[0]) + len(post.nickname) + len(post.comment)
    gyan_level, gyan = candidates[score_seed % len(candidates)]
    return _build_result(post, gyan_level, gyan)


def _generate_with_openai(client, post: PostInput) -> PostResult:
    settings = get_settings()
    prompt = (
        "写真とコメントを見て、冒険への貢献度を small, medium, large, huge "
        "のいずれかで判定してください。JSONのみで返してください。"
        "reactionは日本語で20文字以上、facebookTextは日本語で投稿文として"
        "80文字以上にしてください。"
    )

    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You evaluate posts for a local MVP. Return JSON with "
                        "gyanLevel, reaction, and facebookText. Do not decide "
                        "the numeric GYAN value. gyanLevel must be one of "
                        "small, medium, large, huge. reaction and facebookText "
                        "must be natural Japanese text."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "text",
                            "text": (
                                f"team: {post.team}\n"
                                f"nickname: {post.nickname}\n"
                                f"comment: {post.comment}"
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": post.photoDataUrl},
                        },
                    ],
                },
            ],
        )
        content = response.choices[0].message.content or "{}"
        payload = json.loads(content)
        gyan_level = payload.get("gyanLevel", "medium")
        if gyan_level not in GYAN_BY_LEVEL:
            gyan_level = "medium"

        return PostResult(
            gyan=GYAN_BY_LEVEL[gyan_level],
            gyanLevel=gyan_level,
            reaction=_clean_reaction(payload.get("reaction"), gyan_level),
            facebookText=_clean_facebook_text(
                payload.get("facebookText"),
                post,
                GYAN_BY_LEVEL[gyan_level],
            ),
        )
    except Exception:
        logger.exception("OpenAI GYAN generation failed")
        raise


def _build_result(post: PostInput, gyan_level: str, gyan: int) -> PostResult:
    reaction = (
        "かなり大きなGYANが発生しました。"
        if gyan >= 170
        else "着実にGYANが集まりました。"
    )

    return PostResult(
        gyan=gyan,
        gyanLevel=gyan_level,
        reaction=reaction,
        facebookText=_facebook_text(post, gyan),
    )


def _reaction_for_level(gyan_level: str) -> str:
    return (
        "かなり大きなGYANが発生しました。"
        if gyan_level in {"large", "huge"}
        else "着実にGYANが集まりました。"
    )


def _clean_reaction(value: object, gyan_level: str) -> str:
    if isinstance(value, str) and len(value.strip()) >= 10:
        return value.strip()
    return _reaction_for_level(gyan_level)


def _clean_facebook_text(value: object, post: PostInput, gyan: int) -> str:
    if isinstance(value, str) and len(value.strip()) >= 40:
        return value.strip()
    return _facebook_text(post, gyan)


def _facebook_text(post: PostInput, gyan: int) -> str:
    return "\n".join(
        [
            "帰るまでが冒険",
            f"班: {post.team}",
            f"ニックネーム: {post.nickname}",
            f"コメント: {post.comment}",
            f"獲得GYAN: {gyan}",
        ]
    )
