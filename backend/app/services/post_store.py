from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
import base64
import binascii
import json
import logging
import mimetypes

from app.core.config import Settings
from app.models.posts import AdventurePost, JourneyState, PostInput, PostSummary
from app.services.gyan import generate_post_result
from app.services.journey import (
    BASE_SPEED,
    advance_progress,
    calculate_speed,
    parse_datetime,
)

logger = logging.getLogger(__name__)

_LOCAL_JOURNEY_STARTED_AT = datetime.now(timezone.utc)


class JsonPostStore:
    def __init__(self, data_file: Path) -> None:
        self.data_file = data_file

    def list_posts(self) -> list[AdventurePost]:
        self._ensure_file()
        try:
            raw_posts = json.loads(self.data_file.read_text())
            if not isinstance(raw_posts, list):
                return []
            return [AdventurePost.model_validate(post) for post in raw_posts]
        except (json.JSONDecodeError, ValueError):
            return []

    def create_post(self, input_post: PostInput) -> AdventurePost:
        result = generate_post_result(input_post)
        post = AdventurePost(
            id=str(uuid4()),
            createdAt=datetime.now(timezone.utc).isoformat(),
            **input_post.model_dump(),
            **result.model_dump(),
        )
        posts = [*self.list_posts(), post]
        self._write_posts(posts)
        return post

    def clear_posts(self) -> None:
        self._write_posts([])

    def summarize(self) -> PostSummary:
        posts = self.list_posts()
        total_gyan = sum(post.gyan for post in posts)
        last_post = posts[-1] if posts else None
        journey = self.get_journey_state()

        return PostSummary(
            posts=posts,
            totalGyan=total_gyan,
            lastPost=last_post,
            currentSpeed=journey.speed,
        )

    def get_journey_state(self) -> JourneyState:
        posts = self.list_posts()
        total_gyan = sum(post.gyan for post in posts)
        speed = calculate_speed(total_gyan)
        elapsed_hours = max(
            0,
            (datetime.now(timezone.utc) - _LOCAL_JOURNEY_STARTED_AT).total_seconds()
            / 3600,
        )
        progress = min(1, elapsed_hours * speed / 1000)
        return JourneyState(
            totalGyan=total_gyan,
            progress=progress,
            speed=speed,
            updatedAt=datetime.now(timezone.utc).isoformat(),
        )

    def _ensure_file(self) -> None:
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        if not self.data_file.exists():
            self.data_file.write_text("[]\n")

    def _write_posts(self, posts: list[AdventurePost]) -> None:
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        payload = [post.model_dump() for post in posts]
        self.data_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


class SupabasePostStore:
    def __init__(self, client, settings: Settings) -> None:
        self.client = client
        self.bucket = settings.supabase_storage_bucket

    def get_post(self, post_id: str) -> AdventurePost | None:
        try:
            response = (
                self.client.table("posts")
                .select("*")
                .eq("id", post_id)
                .maybe_single()
                .execute()
            )
            return self._row_to_post(response.data) if response.data else None
        except Exception:
            logger.exception("Supabase post fetch failed")
            raise

    def list_posts(self) -> list[AdventurePost]:
        try:
            response = (
                self.client.table("posts")
                .select("*")
                .order("created_at", desc=False)
                .execute()
            )
            return [self._row_to_post(row) for row in response.data or []]
        except Exception:
            logger.exception("Supabase post list failed")
            raise

    def create_post(self, input_post: PostInput) -> AdventurePost:
        result = generate_post_result(input_post)
        post_id = str(uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        image_path = self._upload_photo(post_id, input_post.photoDataUrl)
        payload = {
            "id": post_id,
            "team": input_post.team,
            "nickname": input_post.nickname,
            "comment": input_post.comment,
            "image_path": image_path,
            "result_image_path": None,
            "gyan": result.gyan,
            "gyan_level": result.gyanLevel,
            "ai_reaction": result.reaction,
            "facebook_text": result.facebookText,
            "created_at": created_at,
        }

        try:
            response = self.client.table("posts").insert(payload).execute()
            post = self._row_to_post((response.data or [payload])[0])
            return post
        except Exception:
            logger.exception("Supabase post save failed")
            raise

    def clear_posts(self) -> None:
        try:
            self.client.table("posts").delete().neq(
                "id",
                "00000000-0000-0000-0000-000000000000",
            ).execute()
            self._upsert_journey_state(0, BASE_SPEED, 0)
        except Exception:
            logger.exception("Supabase post clear failed")
            raise

    def summarize(self) -> PostSummary:
        posts = self.list_posts()
        total_gyan = sum(post.gyan for post in posts)
        last_post = posts[-1] if posts else None
        journey = self.get_journey_state(total_gyan)

        return PostSummary(
            posts=posts,
            totalGyan=total_gyan,
            lastPost=last_post,
            currentSpeed=journey.speed,
        )

    def get_journey_state(self, total_gyan: int | None = None) -> JourneyState:
        state = self._fetch_journey_state()
        progress = advance_progress(
            state.progress,
            state.speed,
            parse_datetime(state.updatedAt),
        )
        resolved_total_gyan = state.totalGyan if total_gyan is None else total_gyan
        speed = calculate_speed(resolved_total_gyan)

        if total_gyan is None:
            return JourneyState(
                totalGyan=resolved_total_gyan,
                progress=progress,
                speed=speed,
                updatedAt=datetime.now(timezone.utc).isoformat(),
            )

        return self._upsert_journey_state(resolved_total_gyan, speed, progress)

    def _upload_photo(self, post_id: str, photo_data_url: str) -> str:
        content_type, raw_bytes = _decode_data_url(photo_data_url)
        extension = mimetypes.guess_extension(content_type) or ".webp"
        image_path = f"posts/{post_id}/original{extension}"

        try:
            self.client.storage.from_(self.bucket).upload(
                image_path,
                raw_bytes,
                file_options={"content-type": content_type, "upsert": "false"},
            )
            return image_path
        except Exception:
            logger.exception("Supabase storage upload failed")
            raise

    def _row_to_post(self, row: dict) -> AdventurePost:
        image_path = row.get("image_path") or ""
        image_url = self._image_url(image_path)
        return AdventurePost(
            id=str(row["id"]),
            team=row["team"],
            nickname=row["nickname"],
            comment=row["comment"],
            photoDataUrl=image_url,
            imagePath=image_path,
            resultImagePath=row.get("result_image_path"),
            imageUrl=image_url,
            gyan=row["gyan"],
            gyanLevel=row["gyan_level"],
            reaction=row["ai_reaction"],
            facebookText=row["facebook_text"],
            createdAt=str(row["created_at"]),
        )

    def _image_url(self, image_path: str) -> str:
        if not image_path:
            return ""

        try:
            result = self.client.storage.from_(self.bucket).create_signed_url(
                image_path,
                60 * 60,
            )
            return result.get("signedURL") or result.get("signedUrl") or ""
        except Exception:
            logger.exception("Supabase signed URL creation failed")
            return ""

    def _fetch_journey_state(self) -> JourneyState:
        response = (
            self.client.table("journey_state")
            .select("*")
            .eq("id", 1)
            .maybe_single()
            .execute()
        )
        row = response.data
        if not row:
            return self._upsert_journey_state(0, BASE_SPEED, 0)

        return JourneyState(
            totalGyan=int(row.get("total_gyan") or 0),
            progress=float(row.get("progress") or 0),
            speed=int(row.get("speed") or BASE_SPEED),
            updatedAt=str(row.get("updated_at") or ""),
        )

    def _upsert_journey_state(
        self,
        total_gyan: int,
        speed: int,
        progress: float,
    ) -> JourneyState:
        updated_at = datetime.now(timezone.utc).isoformat()
        payload = {
            "id": 1,
            "total_gyan": total_gyan,
            "progress": progress,
            "speed": speed,
            "updated_at": updated_at,
        }
        try:
            self.client.table("journey_state").upsert(payload).execute()
            return JourneyState(
                totalGyan=total_gyan,
                progress=progress,
                speed=speed,
                updatedAt=updated_at,
            )
        except Exception:
            logger.exception("Supabase journey_state upsert failed")
            raise


def _decode_data_url(data_url: str) -> tuple[str, bytes]:
    if "," not in data_url:
        raise ValueError("invalid image data URL")

    header, encoded = data_url.split(",", 1)
    if ";base64" not in header:
        raise ValueError("image data URL must be base64")

    content_type = header.removeprefix("data:").split(";", 1)[0] or "image/webp"
    try:
        return content_type, base64.b64decode(encoded, validate=True)
    except binascii.Error as exc:
        raise ValueError("invalid base64 image data") from exc
