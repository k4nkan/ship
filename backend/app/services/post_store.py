from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
import json

from app.models.posts import AdventurePost, PostInput, PostSummary
from app.services.gyan import generate_post_result


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

        return PostSummary(
            posts=posts,
            totalGyan=total_gyan,
            lastPost=last_post,
            currentSpeed=last_post.gyan if last_post else 0,
        )

    def _ensure_file(self) -> None:
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        if not self.data_file.exists():
            self.data_file.write_text("[]\n")

    def _write_posts(self, posts: list[AdventurePost]) -> None:
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        payload = [post.model_dump() for post in posts]
        self.data_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
