import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchTeams } from "../api/postsApi";
import { LoadingScreen } from "../components/LoadingScreen";
import { formatCurrency } from "../lib/currency";
import type { TeamStats } from "../types";

export function TeamPage() {
  const { teamId } = useParams();
  const [team, setTeam] = useState<TeamStats | null>(null);
  const [goalCurrency, setGoalCurrency] = useState(100_000_000);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchTeams()
      .then((result) => {
        const nextTeam = result.teams.find((item) => item.id === teamId);
        if (!nextTeam) {
          setErrorMessage("チームが見つかりません");
          return;
        }
        setGoalCurrency(result.goalCurrency);
        setTeam(nextTeam);
      })
      .catch((error) =>
        setErrorMessage(
          error instanceof Error ? error.message : "API接続に失敗しました",
        ),
      );
  }, [teamId]);

  if (!team && !errorMessage) {
    return <LoadingScreen />;
  }

  return (
    <section className="screen team-screen">
      <div className="content-panel team-panel">
        <header className="screen-header team-header">
          <Link className="text-link" to="/">
            ← 全体画面
          </Link>
          {team ? (
            <div className="team-title-row">
              <span
                className="team-color-dot"
                style={{ backgroundColor: team.color }}
                aria-hidden="true"
              />
              <div>
                <p className="eyebrow">TEAM DETAIL</p>
                <h1>
                  {team.icon} {team.name}
                </h1>
              </div>
            </div>
          ) : null}
        </header>
        {team ? (
          <>
            <div className="team-rank-card">
              <span>現在順位</span>
              <strong>{team.rank}位</strong>
            </div>
            <section className="team-progress-card" aria-label="レース進行度">
              <div className="progress-card-heading">
                <span>極北</span>
                <strong>{Math.round(team.progress * 100)}%</strong>
                <span>立命館</span>
              </div>
              <div className="currency-progress-track">
                <div
                  className="currency-progress-fill"
                  style={{
                    width: `${team.progress * 100}%`,
                    backgroundColor: team.color,
                  }}
                />
              </div>
              <p>
                {formatCurrency(team.earnedCurrency)} /{" "}
                {formatCurrency(goalCurrency)} 通貨
              </p>
            </section>
            <div className="team-metrics-grid">
              <Metric label="累計獲得" value={team.earnedCurrency} />
              <Metric label="現在残高" value={team.balance} />
              <Metric label="使用済み" value={team.spentCurrency} />
            </div>
            <section className="team-history" aria-labelledby="history-heading">
              <h2 id="history-heading">最近の増減</h2>
              {team.recentTransactions.length ? (
                <ul>
                  {team.recentTransactions.map((transaction) => (
                    <li key={transaction.id}>
                      <span>
                        {formatTransactionDate(transaction.createdAt)}
                      </span>
                      <strong
                        className={
                          transaction.amount > 0 ? "is-income" : "is-expense"
                        }
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        {formatCurrency(transaction.amount)}
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>まだ通貨の増減はありません。</p>
              )}
            </section>
          </>
        ) : null}
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="team-metric">
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
      <small>通貨</small>
    </div>
  );
}

function formatTransactionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
