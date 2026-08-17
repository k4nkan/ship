# ship

投稿写真とコメントからGYANを判定し、GYANで船の速度を上げて地図上の進捗を更新するMVPです。

## システム概要

```text
React + Vite
  -> FastAPI
    -> Supabase Storage
    -> OpenAI / Mock
    -> Supabase Database
```

Supabase未設定時は、ローカル開発用に `backend/data/posts.json` へ保存します。

## アーキテクチャ

- frontend: React画面、画像リサイズ/WebP変換、FastAPI呼び出し
- backend: API、Supabase SDK、OpenAI/Mock GYAN判定、投稿保存
- journey: デフォルト速度で常に進み、累計GYANで速度が加算される
- database: Supabase SQL Editorで実行するschema
- e2e: Playwrightによる投稿フロー確認

## ディレクトリ構成

```text
frontend/           React + Vite + TypeScript
backend/            FastAPI
database/schema.sql Supabase Database schema
e2e/                Playwright
```

## 必要環境

- Node.js
- Python 3.13
- make
- Supabase project
- OpenAI API key optional

## セットアップ

```sh
make install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`.env` はbackend/frontendごとに置きます。rootの `.env` は旧構成用のフォールバックです。

## backend/.env

```env
PORT=8000
ALLOWED_ORIGIN=http://127.0.0.1:5173
DATA_FILE=backend/data/posts.json

OPENAI_API_KEY=
OPENAI_ENABLED=false
OPENAI_MODEL=gpt-4o-mini

SUPABASE_URL=
SUPABASE_SECRET_KEY=
SUPABASE_STORAGE_BUCKET=
```

`SUPABASE_SECRET_KEY` はbackend専用です。`VITE_` を付けたり、frontendへ渡したりしないでください。

## frontend/.env

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_MAP_API_KEY=
VITE_MAP_STYLE_URL=https://api.maptiler.com/maps/streets-v2/style.json?key={key}
```

## ローカル起動

```sh
make dev
```

- frontend: `http://127.0.0.1:5173/`
- backend: `http://127.0.0.1:8000/health`

## Makeコマンド

```sh
make install
make dev
make frontend
make backend
make test
make lint
make typecheck
make build
make check
make clean
```

## API

- `GET /health`
- `GET /api/health`
- `GET /api/posts`
- `GET /api/posts/{id}`
- `POST /api/posts`
- `DELETE /api/posts`
- `GET /api/journey`
- `POST /api/gyan/generate`

## Supabase設定

1. Supabaseでprojectを作成
2. SQL Editorで `database/schema.sql` を実行
3. Storage bucketを作成
4. `backend/.env` に以下を設定

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SECRET_KEY=<your-supabase-secret-key>
SUPABASE_STORAGE_BUCKET=<your-bucket-name>
```

Databaseは `posts` と `journey_state` を使います。RLSは有効で、`service_role` のみアクセス可能です。

`journey_state` は現在の進捗と速度を保持します。デフォルト速度は `20 GYAN/時` で、累計GYANに応じてbackend側で加速します。

Storage bucketはMVPではbackend経由でアップロードします。ResultPageで画像を表示するため、backendは署名付きURLを返します。

## OpenAI / Mock切り替え

デフォルトはMockです。

```env
OPENAI_ENABLED=false
```

実APIを使う場合:

```env
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_ENABLED=true
OPENAI_MODEL=gpt-4o-mini
```

AIは `small` / `medium` / `large` / `huge` のランクだけを返し、GYAN数値はbackendで固定変換します。

## テスト

```sh
make check
```

実行内容:

- frontend typecheck/build
- backend compile
- e2e Playwright

## 未実装

- Signed Upload URL方式
- Supabase Realtime
- 認証
- 生成結果画像
- Three.js / GSAP
- 投稿一覧

## デプロイ想定

- frontend: static hosting
- backend: FastAPIを常駐実行できる環境
- database/storage: Supabase

本番では `ALLOWED_ORIGIN` をfrontendの公開URLへ変更します。

## backend CI/CD

`main` に `backend/**` の変更がpushされると、GitHub ActionsでbackendをCloud Runへ再デプロイします。

GitHub repositoryの `Settings > Secrets and variables > Actions` に以下を設定します。

- `GCP_WORKLOAD_IDENTITY_PROVIDER`: `projects/774806497724/locations/global/workloadIdentityPools/github/providers/ship`
- `GCP_SERVICE_ACCOUNT`: `github-actions-deployer@ship-505808.iam.gserviceaccount.com`

`GCP_SERVICE_ACCOUNT` にはCloud Run source deployに必要な権限を付与します。

- `roles/run.sourceDeveloper`
- `roles/serviceusage.serviceUsageConsumer`
- `ship-api-runtime@ship-505808.iam.gserviceaccount.com` への `roles/iam.serviceAccountUser`

source buildを実行するCompute Engine default service accountには `roles/run.builder` を付与します。

deploy先:

- service: `ship-api`
- region: `asia-northeast1`
- source: `backend`
- scaling: `--min=1 --max=3`

OpenAI/Supabaseなどのruntime環境変数はCloud Run service側に設定します。

手動実行する場合は、GitHub Actionsの `Backend Deploy` から `Run workflow` を使います。
