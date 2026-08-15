from app.models.posts import PostInput, PostResult


def generate_post_result(post: PostInput) -> PostResult:
    candidates = [120, 145, 170, 200]
    score_seed = ord(post.team[0]) + len(post.nickname) + len(post.comment)
    gyan = candidates[score_seed % len(candidates)]
    level = "high" if gyan >= 170 else "normal"
    reaction = (
        "かなり大きなGYANが発生しました。"
        if level == "high"
        else "着実にGYANが集まりました。"
    )
    facebook_text = "\n".join(
        [
            "帰るまでが冒険",
            f"班: {post.team}",
            f"ニックネーム: {post.nickname}",
            f"コメント: {post.comment}",
            f"獲得GYAN: {gyan}",
        ]
    )

    return PostResult(
        gyan=gyan,
        level=level,
        reaction=reaction,
        facebookText=facebook_text,
    )
