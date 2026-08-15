import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPost, fetchPostSummary } from "../api/postsApi";
import { readPhotoFile } from "../features/posts/photoFile";
import { TEAM_OPTIONS } from "../features/posts/teamOptions";
import { getSavedNickname, saveNickname } from "../lib/nicknameStorage";
import { savePreviousGyan } from "../lib/routeProgressStorage";

export function PostPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTeam = searchParams.get("team");
  const [team, setTeam] = useState(
    initialTeam && TEAM_OPTIONS.includes(initialTeam) ? initialTeam : "A",
  );
  const [nickname, setNickname] = useState("");
  const [comment, setComment] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setNickname(getSavedNickname());
  }, []);

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoDataUrl(await readPhotoFile(file));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nickname.trim() || !comment.trim() || !photoDataUrl) return;

    setIsSubmitting(true);
    try {
      const summary = await fetchPostSummary();
      savePreviousGyan(summary.totalGyan);
      saveNickname(nickname.trim());
      await createPost({
        team,
        nickname: nickname.trim(),
        comment: comment.trim(),
        photoDataUrl,
      });
      navigate("/result");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="screen form-screen">
      <div className="content-panel">
        <header className="screen-header">
          <p className="eyebrow">投稿作成</p>
          <h1>GYANを送る</h1>
        </header>
        <form className="post-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>班</span>
            <select
              id="team"
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              required
            >
              {TEAM_OPTIONS.map((teamOption) => (
                <option key={teamOption} value={teamOption}>
                  班 {teamOption}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>ニックネーム</span>
            <input
              id="nickname"
              type="text"
              autoComplete="nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>写真</span>
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              required
            />
          </label>
          <div id="photo-preview" className="photo-preview">
            {photoDataUrl ? (
              <img src={photoDataUrl} alt="選択した写真のプレビュー" />
            ) : null}
          </div>
          <label className="field">
            <span>コメント</span>
            <textarea
              id="comment"
              rows={5}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              required
            />
          </label>
          <div className="button-row">
            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting}
            >
              投稿する
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => navigate("/")}
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
