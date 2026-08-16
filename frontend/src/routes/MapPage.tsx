import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJourney } from "../api/postsApi";
import { AdventureMap } from "../features/map/AdventureMap";
import {
  getPreviousProgress,
  savePreviousProgress,
} from "../lib/routeProgressStorage";
import type { JourneyState } from "../types";

const emptyJourney: JourneyState = {
  totalGyan: 0,
  progress: 0,
  speed: 20,
  updatedAt: "",
};
const ROUTE_TARGET_GYAN = 1000;
const JOURNEY_SYNC_INTERVAL_MS = 60_000;
const LOCAL_PROGRESS_INTERVAL_MS = 1_000;

export function MapPage() {
  const navigate = useNavigate();
  const displayProgressRef = useRef(0);
  const [journey, setJourney] = useState<JourneyState>(emptyJourney);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [previousProgress, setPreviousProgress] = useState(0);
  const [recenterRequest, setRecenterRequest] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const progressPercent = (displayProgress * 100).toFixed(1);
  const currentArea = getCurrentArea(displayProgress);

  useEffect(() => {
    const savedProgress = getPreviousProgress();
    displayProgressRef.current = savedProgress;
    setDisplayProgress(savedProgress);

    const loadJourney = () => {
      fetchJourney()
        .then((nextJourney) => {
          const projectedProgress = getLocalJourneyProgress(nextJourney);
          const startProgress = Math.min(
            displayProgressRef.current || savedProgress,
            projectedProgress,
          );
          displayProgressRef.current = projectedProgress;
          setJourney(nextJourney);
          setPreviousProgress(startProgress);
          setDisplayProgress(projectedProgress);
          savePreviousProgress(projectedProgress);
        })
        .catch((error) =>
          setErrorMessage(
            error instanceof Error ? error.message : "API接続に失敗しました",
          ),
        );
    };

    loadJourney();
    const intervalId = window.setInterval(
      loadJourney,
      JOURNEY_SYNC_INTERVAL_MS,
    );
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!journey.updatedAt) return;

    const intervalId = window.setInterval(() => {
      const nextProgress = getLocalJourneyProgress(journey);
      setPreviousProgress(displayProgressRef.current);
      displayProgressRef.current = nextProgress;
      setDisplayProgress(nextProgress);
      savePreviousProgress(nextProgress);
    }, LOCAL_PROGRESS_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [journey]);

  return (
    <section className="screen map-screen">
      <div className="map-area">
        <AdventureMap
          progress={displayProgress}
          previousProgress={previousProgress}
          recenterRequest={recenterRequest}
        />
      </div>
      <aside className="map-status-panel" aria-label="現在の状況">
        <div className="map-status-grid">
          <div className="map-status-item">
            <span>速度</span>
            <strong id="current-speed">{journey.speed}</strong>
            <small>GYAN/時</small>
          </div>
          <div className="map-status-item">
            <span>エリア</span>
            <strong id="current-area">{currentArea}</strong>
            <small id="current-progress">{progressPercent}%</small>
          </div>
          <div className="map-status-item">
            <span>累計</span>
            <strong id="current-gyan">{journey.totalGyan}</strong>
            <small>GYAN</small>
          </div>
        </div>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      </aside>
      <div className="map-action-stack">
        <button
          className="map-icon-button"
          type="button"
          aria-label="現在地へ移動"
          title="現在地へ移動"
          onClick={() => setRecenterRequest((count) => count + 1)}
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            my_location
          </span>
        </button>
        <button
          className="map-icon-button map-add-button"
          type="button"
          aria-label="GYANを送る"
          title="GYANを送る"
          onClick={() => navigate("/post")}
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            add
          </span>
        </button>
      </div>
    </section>
  );
}

function getCurrentArea(progress: number): string {
  if (progress >= 0.95) return "立命館";
  if (progress >= 0.78) return "富士山";
  if (progress >= 0.58) return "東京";
  if (progress >= 0.34) return "北海道";
  if (progress >= 0.18) return "ロシア";
  if (progress >= 0.06) return "北極海";
  return "北極点";
}

function getLocalJourneyProgress(journey: JourneyState): number {
  const updatedAt = Date.parse(journey.updatedAt);
  if (Number.isNaN(updatedAt)) {
    return journey.progress;
  }

  const elapsedHours = Math.max(0, Date.now() - updatedAt) / 1000 / 3600;
  return Math.min(
    1,
    journey.progress + (elapsedHours * journey.speed) / ROUTE_TARGET_GYAN,
  );
}
