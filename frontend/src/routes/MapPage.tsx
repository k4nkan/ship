import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJourney } from "../api/postsApi";
import { LoadingScreen } from "../components/LoadingScreen";
import { AdventureMap } from "../features/map/AdventureMap";
import {
  getCurrentRouteLabel,
  ROUTE_TARGET_GYAN,
  sampleRouteCoordinate,
} from "../features/map/route";
import {
  getPreviousProgress,
  savePreviousProgress,
} from "../lib/routeProgressStorage";
import { useCurrentLocationControl } from "../hooks/useCurrentLocationControl";
import type { JourneyState } from "../types";

const emptyJourney: JourneyState = {
  totalGyan: 0,
  progress: 0,
  speed: 8,
  updatedAt: "",
};
const JOURNEY_SYNC_INTERVAL_MS = 60_000;
const LOCAL_PROGRESS_INTERVAL_MS = 1_000;

export function MapPage() {
  const navigate = useNavigate();
  const displayProgressRef = useRef(0);
  const [journey, setJourney] = useState<JourneyState>(emptyJourney);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [previousProgress, setPreviousProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const currentLocation = useCurrentLocationControl();
  const currentArea = getCurrentRouteLabel(displayProgress);
  const currentCoordinate = sampleRouteCoordinate(displayProgress);
  const remainingDistance = Math.max(
    0,
    Math.ceil((1 - displayProgress) * ROUTE_TARGET_GYAN),
  );
  const estimatedArrivalTime = getEstimatedArrivalTime(
    displayProgress,
    journey.speed,
  );

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
        )
        .finally(() => setIsLoading(false));
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

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <section className="screen map-screen">
      <div className="map-area">
        <AdventureMap
          progress={displayProgress}
          previousProgress={previousProgress}
          recenterRequest={currentLocation.requestId}
          followCurrentLocation={currentLocation.followCurrentLocation}
          onFollowCurrentLocationChange={
            currentLocation.setFollowCurrentLocation
          }
          onRecenterComplete={currentLocation.completeRecenter}
        />
      </div>
      <aside className="map-status-panel" aria-label="現在の状況">
        <div className="map-status-grid">
          <div className="map-status-metrics">
            <div className="map-status-item">
              <span>速度</span>
              <strong id="current-speed">{journey.speed}</strong>
              <small>gyan/h</small>
            </div>
            <div className="map-status-item">
              <span>累計</span>
              <strong id="current-gyan">{journey.totalGyan}</strong>
              <small>gyan</small>
            </div>
            <div className="map-status-item">
              <span>残り</span>
              <strong id="remaining-distance">{remainingDistance}</strong>
              <small>km</small>
            </div>
          </div>
          <div className="map-status-item map-status-item-detail">
            <span>現在のエリア</span>
            <strong id="current-area">{currentArea}</strong>
            <small id="current-coordinate">
              {formatCoordinate(currentCoordinate)}
            </small>
          </div>
          <div className="map-status-item map-status-item-detail">
            <span>到着予定時刻</span>
            <strong id="arrival-time">{estimatedArrivalTime}</strong>
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
          aria-pressed={currentLocation.followCurrentLocation}
          disabled={currentLocation.isRecentering}
          onClick={currentLocation.requestRecenter}
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

function getEstimatedArrivalTime(progress: number, speed: number): string {
  if (progress >= 1) return "到着済み";
  if (speed <= 0) return "計算中";

  const remainingHours = ((1 - progress) * ROUTE_TARGET_GYAN) / speed;
  const arrivalTime = new Date(Date.now() + remainingHours * 60 * 60 * 1000);

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(arrivalTime);
}

function formatCoordinate([longitude, latitude]: [number, number]): string {
  const latitudeDirection = latitude >= 0 ? "N" : "S";
  const longitudeDirection = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(4)}°${latitudeDirection} / ${Math.abs(
    longitude,
  ).toFixed(4)}°${longitudeDirection}`;
}
