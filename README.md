# ship

キャンプ中の良い行動をMCがオリジナル通貨で評価し、A班〜F班の6チーム対抗で極北から立命館への帰還を競うWebアプリです。

## MVPの画面

- `/`：全体レース画面。MapLibreの航路、チーム別アイコン、順位、累計獲得通貨、進行度を表示
- `/teams/:teamId`：チーム詳細。順位、進行度、累計獲得、残高、使用済みを表示
- `/admin`：MC用画面。チームごとに `+1 / +5 / +10 / +50`、`-5 / -10 / -50` を操作

`/admin` はbackendの `ADMIN_PASSWORD` で認証します。全体画面にはAdminへのリンクを表示しません。

進行度は累計獲得通貨だけで計算し、残高とは分離しています。

```text
累計獲得通貨 -> レース進行度
累計獲得通貨 - 使用通貨 -> 現在残高
```

ゴールは `1億通貨` です。表示は `10000`、`10 0000`、`100 0000` のようなイベント用の単位にしています。Storage、AI、QR/NFC、通貨ショップはこのMVPでは使用しません。

レースの移動はAdmin画面のスタート・ストップで制御します。スタート中は、通貨とは別に一定速度で船が進み、ストップするとその位置で止まります。

## 構成

```text
React + Vite -> FastAPI -> Supabase Database
                         └-> 未設定時は backend/data/teams.json
```

- `frontend/`：3画面、MapLibre、Admin操作
- `backend/`：チーム取得、通貨履歴の追加・集計
- `database/schema.sql`：Supabaseに必要なテーブルを作る唯一のSQL

## セットアップ

```sh
make install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
make dev
```

- frontend: `http://127.0.0.1:5173/`
- backend: `http://127.0.0.1:8000/health`

Supabaseを使わないローカル確認では、`SUPABASE_URL` と `SUPABASE_SECRET_KEY` を空にします。チームデータは `backend/data/teams.json` に保存されます。

## frontendとbackendの接続先

接続先は環境ごとに分かれています。

```text
make dev
  frontend 127.0.0.1:5173 -> backend 127.0.0.1:8000

Vercel Production
  frontend ship.k4nkan.com -> Cloud Run ship-api
```

`make dev` はMakefileからローカルAPI URLを明示するため、`frontend/.env` に古い本番URLが残っていてもローカルbackendを使用します。`make dev tunnel` はVite proxy経由で `/api` をローカルbackendへ転送します。

VercelのProduction環境変数には、次を設定してください。

```env
VITE_API_BASE_URL=https://ship-api-774806497724.asia-northeast1.run.app
```

本番backendは `backend/**` の変更をmainへpushするとCloud Runへデプロイされます。frontendはVercelの自動デプロイと、Vercel側のProduction環境変数を使用します。

## backend/.env

```env
PORT=8000
ALLOWED_ORIGIN=http://127.0.0.1:5173
TEAMS_DATA_FILE=backend/data/teams.json
ADMIN_PASSWORD=管理画面用パスワード

SUPABASE_URL=
SUPABASE_SECRET_KEY=
SUPABASE_TABLE_PREFIX=debug_
```

`SUPABASE_SECRET_KEY` はbackend専用です。frontendへ渡したり、コミットしたりしないでください。通貨MVPはSupabaseのDatabaseだけを使うため、`SUPABASE_STORAGE_BUCKET` は不要です。

`ADMIN_PASSWORD` もbackend専用です。`VITE_ADMIN_PASSWORD` のようにfrontendの環境変数へ置かないでください。

## Supabase DB

Supabase DashboardのSQL Editorで `database/schema.sql` の全文を貼り付けて、1回だけ実行してください。

このSQLは `teams` / `currency_transactions` / `race_state` と、ローカル開発で使う `debug_` 付きの3テーブルを作成します。`if not exists` と `on conflict` を使っているため、既存データを削除しません。

現在のローカル設定は `SUPABASE_TABLE_PREFIX=debug_` のため、`make dev` は `debug_teams` / `debug_currency_transactions` / `debug_race_state` を使います。

テーブルは次の2つです。

- `teams`：チーム名、カラー、アイコン
- `currency_transactions`：`team_id` と `amount` の履歴。正数が配布、負数が使用

RLSを有効にし、アプリのbackendが使う `service_role` だけにアクセスを許可しています。frontendからSupabaseへ直接アクセスしません。

## API

- `GET /health`
- `GET /api/teams`
- `POST /api/teams/:teamId/currency` body: `{ "amount": 10 }`

負数の操作で残高が不足する場合は `409` を返し、履歴を追加しません。

## 確認

```sh
make check
```

個別に確認する場合は次を使います。

```sh
make -C frontend lint
make -C backend lint
make -C e2e test
```

スマホから確認する場合は、frontendをVite proxy経由で公開する既存の手順を使えます。

```sh
make dev tunnel
```
