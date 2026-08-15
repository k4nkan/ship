import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearPosts, fetchPostSummary } from "../api/postsApi";
import { AdventureMap } from "../features/map/AdventureMap";
import { getRouteProgress } from "../features/map/route";
import {
  clearPreviousGyan,
  getPreviousGyan,
  savePreviousGyan,
} from "../lib/routeProgressStorage";
import type { PostSummary } from "../types";

const emptySummary: PostSummary = {
  posts: [],
  totalGyan: 0,
  lastPost: null,
  currentSpeed: 0,
};

export function MapPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<PostSummary>(emptySummary);
  const [previousGyan, setPreviousGyan] = useState(0);
  const progressPercent = Math.round(getRouteProgress(summary.totalGyan) * 100);

  useEffect(() => {
    setPreviousGyan(getPreviousGyan());
    fetchPostSummary().then((nextSummary) => {
      setSummary(nextSummary);
      savePreviousGyan(nextSummary.totalGyan);
    });
  }, []);

  const handleReset = async () => {
    const nextSummary = await clearPosts();
    clearPreviousGyan();
    setPreviousGyan(0);
    setSummary(nextSummary);
  };

  return (
    <section className="screen map-screen">
      <div className="map-area">
        <AdventureMap
          totalGyan={summary.totalGyan}
          previousGyan={previousGyan}
        />
      </div>
      <aside className="side-panel" aria-label="現在の状況">
        <div>
          <p className="eyebrow">現在のGYAN</p>
          <p className="metric">
            <span id="current-gyan">{summary.totalGyan}</span>
          </p>
        </div>
        <div className="status-list">
          <div>
            <span>現在の速度</span>
            <strong id="current-speed">{summary.currentSpeed} GYAN/投稿</strong>
          </div>
          <div>
            <span>立命館まで</span>
            <strong id="current-progress">{progressPercent}%</strong>
          </div>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => navigate("/post")}
        >
          GYANを送る
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={handleReset}
        >
          ローカルデータをリセット
        </button>
      </aside>
    </section>
  );
}
