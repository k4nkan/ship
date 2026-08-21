import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  authenticateAdmin,
  fetchTeams,
  updateRace,
  updateTeamCurrency,
} from "../api/postsApi";
import { LoadingScreen } from "../components/LoadingScreen";
import { formatCurrency } from "../lib/currency";
import type { RaceState, TeamStats } from "../types";

const CURRENCY_BUTTONS = [10_000, 100_000, 1_000_000, 10_000_000];
const SPEND_BUTTONS = [-10_000, -100_000, -1_000_000];
const ADMIN_TOKEN_KEY = "ship-admin-token";

export function AdminPage() {
  const [adminToken, setAdminToken] = useState(readAdminToken);
  const [password, setPassword] = useState("");
  const [teams, setTeams] = useState<TeamStats[]>([]);
  const [goalCurrency, setGoalCurrency] = useState(100_000_000);
  const [race, setRace] = useState<RaceState>({
    isRunning: false,
    elapsedSeconds: 0,
    speedPerHour: 0.03,
    updatedAt: "",
  });
  const [activeAction, setActiveAction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadTeams = () =>
    fetchTeams()
      .then((result) => {
        setTeams(result.teams);
        setGoalCurrency(result.goalCurrency);
        setRace(result.race);
      })
      .catch((error) =>
        setErrorMessage(
          error instanceof Error ? error.message : "API接続に失敗しました",
        ),
      );

  useEffect(() => {
    if (!adminToken) return;
    void loadTeams();
  }, [adminToken]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    try {
      const session = await authenticateAdmin(password);
      sessionStorage.setItem(ADMIN_TOKEN_KEY, session.token);
      setAdminToken(session.token);
      setPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "認証に失敗しました",
      );
    }
  };

  const handleCurrencyChange = async (teamId: string, amount: number) => {
    const actionKey = `${teamId}:${amount}`;
    setActiveAction(actionKey);
    setErrorMessage("");
    try {
      const result = await updateTeamCurrency(teamId, amount, adminToken);
      setTeams(result.teams);
      setGoalCurrency(result.goalCurrency);
      setRace(result.race);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "通貨を更新できません",
      );
    } finally {
      setActiveAction("");
    }
  };

  const handleRaceControl = async (isRunning: boolean) => {
    const action = isRunning ? "start" : "stop";
    setActiveAction(`race:${action}`);
    setErrorMessage("");
    try {
      const result = await updateRace(action, adminToken);
      setTeams(result.teams);
      setGoalCurrency(result.goalCurrency);
      setRace(result.race);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "レースを更新できません",
      );
    } finally {
      setActiveAction("");
    }
  };

  if (!adminToken) {
    return (
      <section className="screen centered-screen">
        <div className="content-panel admin-login-panel">
          <header className="screen-header">
            <p className="eyebrow">OPERATOR PANEL</p>
            <h1>Adminログイン</h1>
          </header>
          <form className="admin-login-form" onSubmit={handleLogin}>
            <label className="field" htmlFor="admin-password">
              <span>パスワード</span>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoFocus
              />
            </label>
            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
            <button className="primary-button" type="submit">
              管理画面に入る
            </button>
          </form>
        </div>
      </section>
    );
  }

  if (!teams.length && !errorMessage) {
    return <LoadingScreen />;
  }

  return (
    <section className="screen admin-screen">
      <div className="content-panel admin-panel">
        <header className="screen-header admin-header">
          <div>
            <p className="eyebrow">OPERATOR PANEL</p>
            <h1>通貨を配布・使用する</h1>
            <p className="screen-description">
              ゴール {formatCurrency(goalCurrency)} 通貨
            </p>
          </div>
          <div className="admin-header-actions">
            <div className="race-control" aria-label="レース制御">
              <span className="race-control-status">
                {race.isRunning ? "レース運航中" : "レース停止中"}
              </span>
              <button
                className="secondary-button"
                type="button"
                disabled={Boolean(activeAction)}
                onClick={() => void handleRaceControl(true)}
              >
                スタート
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={Boolean(activeAction)}
                onClick={() => void handleRaceControl(false)}
              >
                ストップ
              </button>
            </div>
            <Link className="secondary-button" to="/">
              全体画面へ
            </Link>
          </div>
        </header>
        <div className="admin-team-list">
          {teams.map((team) => (
            <article className="admin-team-card" key={team.id}>
              <div className="admin-team-heading">
                <div className="team-title-row">
                  <span
                    className="team-color-dot"
                    style={{ backgroundColor: team.color }}
                    aria-hidden="true"
                  />
                  <div>
                    <h2>
                      {team.icon} {team.name}
                    </h2>
                    <p>
                      残高 {formatCurrency(team.balance)} 通貨 / {team.rank}位
                    </p>
                  </div>
                </div>
                <Link className="text-link" to={`/teams/${team.id}`}>
                  詳細
                </Link>
              </div>
              <div
                className="admin-actions"
                aria-label={`${team.name}の通貨操作`}
              >
                <span className="admin-action-label">配布</span>
                {CURRENCY_BUTTONS.map((amount) => (
                  <button
                    className="currency-button currency-button-income"
                    key={amount}
                    type="button"
                    disabled={Boolean(activeAction)}
                    onClick={() => void handleCurrencyChange(team.id, amount)}
                  >
                    +{formatCurrency(amount)}
                  </button>
                ))}
                <span className="admin-action-label">使用</span>
                {SPEND_BUTTONS.map((amount) => (
                  <button
                    className="currency-button currency-button-expense"
                    key={amount}
                    type="button"
                    disabled={Boolean(activeAction)}
                    onClick={() => void handleCurrencyChange(team.id, amount)}
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      </div>
    </section>
  );
}

function readAdminToken(): string {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
}
