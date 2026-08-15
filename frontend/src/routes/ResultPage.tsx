import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { fetchPostSummary } from "../api/postsApi";
import type { AdventurePost } from "../types";

export function ResultPage() {
  const navigate = useNavigate();
  const [latestPost, setLatestPost] = useState<
    AdventurePost | null | undefined
  >(undefined);
  const [copyLabel, setCopyLabel] = useState("Facebook文章をコピー");

  useEffect(() => {
    fetchPostSummary().then((summary) => setLatestPost(summary.lastPost));
  }, []);

  const handleCopy = async () => {
    if (!latestPost) return;

    await navigator.clipboard?.writeText(latestPost.facebookText);
    setCopyLabel("コピーしました");
    window.setTimeout(() => setCopyLabel("Facebook文章をコピー"), 1200);
  };

  if (latestPost === undefined) {
    return null;
  }

  if (latestPost === null) {
    return <Navigate to="/post" replace />;
  }

  return (
    <section className="screen result-screen">
      <div className="content-panel">
        <header className="screen-header">
          <p className="eyebrow">生成結果</p>
          <h1>獲得したGYAN</h1>
        </header>
        <div id="result-content">
          <div className="result-grid">
            <img
              className="result-photo"
              src={latestPost.photoDataUrl}
              alt="投稿した写真"
            />
            <dl className="result-summary">
              <div>
                <dt>班</dt>
                <dd>{latestPost.team}</dd>
              </div>
              <div>
                <dt>ニックネーム</dt>
                <dd>{latestPost.nickname}</dd>
              </div>
              <div>
                <dt>コメント</dt>
                <dd>{latestPost.comment}</dd>
              </div>
              <div>
                <dt>獲得GYAN</dt>
                <dd>{latestPost.gyan}</dd>
              </div>
              <div>
                <dt>リアクション</dt>
                <dd>{latestPost.reaction}</dd>
              </div>
            </dl>
          </div>
          <label className="field">
            <span>Facebook投稿用文章</span>
            <textarea
              id="facebook-text"
              rows={7}
              readOnly
              value={latestPost.facebookText}
            />
          </label>
        </div>
        <div className="button-row">
          <button className="primary-button" type="button" onClick={handleCopy}>
            {copyLabel}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => navigate("/")}
          >
            マップに戻る
          </button>
        </div>
      </div>
    </section>
  );
}
