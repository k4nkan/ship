import { useEffect, useRef, useState } from "react";
import { fetchTeams } from "../api/postsApi";
import { LoadingScreen } from "../components/LoadingScreen";
import { AdventureMap } from "../features/map/AdventureMap";
import { useCurrentLocationControl } from "../hooks/useCurrentLocationControl";
import { formatCurrency } from "../lib/currency";
import type { TeamStats } from "../types";

const TEAM_SYNC_INTERVAL_MS = 10_000;

export function MapPage() {
  const [teams, setTeams] = useState<TeamStats[]>([]);
  const [previousTeams, setPreviousTeams] = useState<TeamStats[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [goalCurrency, setGoalCurrency] = useState(100_000_000);
  const [overviewRequest, setOverviewRequest] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const teamsRef = useRef<TeamStats[]>([]);
  const currentLocation = useCurrentLocationControl();

  useEffect(() => {
    const loadTeams = () => {
      fetchTeams()
        .then((result) => {
          setPreviousTeams(teamsRef.current);
          teamsRef.current = result.teams;
          setTeams(result.teams);
          setGoalCurrency(result.goalCurrency);
          setErrorMessage("");
        })
        .catch((error) =>
          setErrorMessage(
            error instanceof Error ? error.message : "API接続に失敗しました",
          ),
        );
    };

    loadTeams();
    const intervalId = window.setInterval(loadTeams, TEAM_SYNC_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  if (!teams.length) {
    if (errorMessage) {
      return (
        <section className="screen centered-screen">
          <div className="content-panel">
            <p className="form-error">{errorMessage}</p>
          </div>
        </section>
      );
    }
    return <LoadingScreen />;
  }

  const leader = [...teams].sort((left, right) => left.rank - right.rank)[0];
  const selectedTeam = teams.find((team) => team.id === selectedTeamId);
  const previousLeader = previousTeams.find((team) => team.id === leader.id);

  return (
    <section className="screen map-screen">
      <div className="map-area">
        <AdventureMap
          teams={teams}
          previousTeams={previousTeams}
          progress={leader.progress}
          focusProgress={selectedTeam?.progress ?? leader.progress}
          focusRequest={focusRequest}
          overviewRequest={overviewRequest}
          previousProgress={previousLeader?.progress ?? leader.progress}
          recenterRequest={currentLocation.requestId}
          followCurrentLocation={currentLocation.followCurrentLocation}
          onFollowCurrentLocationChange={
            currentLocation.setFollowCurrentLocation
          }
          onRecenterComplete={currentLocation.completeRecenter}
        />
      </div>
      <aside
        className="map-status-panel race-status-panel"
        aria-label="チーム順位"
      >
        <div className="race-status-heading">
          <div>
            <p className="eyebrow">EXPEDITION RACE</p>
            <h1>帰還レース</h1>
          </div>
        </div>
        <p className="race-goal">
          極北 → 立命館 / ゴール {formatCurrency(goalCurrency)} 通貨
        </p>
        <div className="race-team-list">
          {[...teams]
            .sort((left, right) => left.rank - right.rank)
            .map((team) => (
              <button
                className="race-team-row"
                key={team.id}
                type="button"
                aria-pressed={selectedTeamId === team.id}
                onClick={() => {
                  setSelectedTeamId(team.id);
                  setFocusRequest((request) => request + 1);
                }}
              >
                <span className="race-rank">{team.rank}</span>
                <span
                  className="team-color-dot"
                  style={{ backgroundColor: team.color }}
                  aria-hidden="true"
                />
                <span className="race-team-name">
                  {team.icon} {team.name}
                </span>
                <span className="race-team-score">
                  <strong>{formatCurrency(team.earnedCurrency)}</strong>
                  <small>{Math.round(team.progress * 100)}%</small>
                </span>
              </button>
            ))}
        </div>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      </aside>
      <div className="map-action-stack">
        <button
          className="map-icon-button"
          type="button"
          aria-label="全体を見る"
          title="全体を見る"
          onClick={() => {
            setSelectedTeamId(null);
            setOverviewRequest((request) => request + 1);
          }}
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            public
          </span>
        </button>
      </div>
    </section>
  );
}
