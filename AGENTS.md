# AGENTS.md

このファイルは、Codex / coding agent が `k4nkan/ship` を変更するときの恒久的な作業ルールです。

## Project overview

`ship` は、キャンプ中の写真とコメントを投稿すると GYAN を獲得し、その累計によって船が「極北」から立命館へ進む、イベント向けWebアプリです。

主な体験フロー:

```text
Map
  -> Post
  -> FastAPI
  -> Supabase Storage / Database
  -> OpenAI or Mock GYAN判定
  -> Result
  -> Map progress update
```

GYAN は AI が直接自由な数値を決めるものではありません。AI はランク（例: small / medium / large / huge）を判定し、最終的な GYAN 数値は backend 側の固定ルールで決定します。

## Architecture

### Frontend

- React
- Vite
- TypeScript
- React Router
- MapLibre GL JS
- Production: Vercel
- Production URL: `https://ship.k4nkan.com`

Frontend の責務:

- UI / UX
- Map表示
- 写真選択・撮影
- 画像リサイズ / WebP変換
- FastAPI呼び出し
- Result表示

### Backend

- Python 3.13
- FastAPI
- Uvicorn
- Supabase Python SDK
- OpenAI API
- Docker
- Production: Google Cloud Run

Cloud Run:

- Project ID: `ship-505808`
- Region: `asia-northeast1`
- Service: `ship-api`
- Production API: `https://ship-api-774806497724.asia-northeast1.run.app`
- min instances: 1
- max instances: 3

Backend の責務:

- API
- GYAN判定
- OpenAI呼び出し
- Supabase Database操作
- Supabase Storage操作
- journey state / progress計算

### Data / Storage

- Supabase Database
- Supabase Storage

Frontend から Supabase Secret Key を使って直接操作しないでください。

## Directory responsibilities

```text
frontend/   React + Vite frontend
backend/    FastAPI backend
database/   Supabase schema / SQL
e2e/        Playwright E2E
.github/    CI/CD
```

既存の責務分離を維持してください。

特に以下を避けてください。

- UIロジックを `index.html` に置く
- `main.tsx` / `App.tsx` に機能ロジックを集中させる
- FastAPI router に全ビジネスロジックを書く
- frontend から Supabase Secret を使う
- frontend から OpenAI API を直接呼ぶ

## Environment variables

ローカル環境では frontend / backend を分離します。

### `frontend/.env`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_MAP_API_KEY=
VITE_MAP_STYLE_URL=https://api.maptiler.com/maps/streets-v2/style.json?key={key}
```

`VITE_` 付きの値はブラウザへ公開される前提です。

### `backend/.env`

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

Production の secret は Cloud Run 側で管理します。

絶対に frontend / Git 管理対象へ出してはいけない値:

- `OPENAI_API_KEY`
- `SUPABASE_SECRET_KEY`

`.env` の実値をREADME・ログ・コミットへ出さないでください。

## Deployment

### Frontend

GitHub -> Vercel の自動デプロイです。

`main` への frontend 変更が Production に反映されます。

Production frontend:

```text
https://ship.k4nkan.com
```

### Backend

`main` の `backend/**` 変更は GitHub Actions から Cloud Run へ自動デプロイされます。

Workflow:

```text
.github/workflows/backend-deploy.yml
```

認証は Workload Identity Federation を使用します。

Service Account JSON key方式へ変更しないでください。

Cloud Run の runtime env / secret は CI で毎回上書きせず、Service 側に保持します。

Production CORS:

```text
ALLOWED_ORIGIN=https://ship.k4nkan.com
```

## Working rules

変更を始める前に、対象機能と関連ファイルを確認してください。

基本方針:

1. 現象を再現 / コードから原因を特定する
2. 必要最小限の修正をする
3. 関連テストを実行する
4. `make check` を通す
5. 変更内容と確認内容を簡潔にまとめる

バグ修正では、依頼されていないリファクタリングを同時に行わないでください。

既存設計が明確に破綻していない限り、「綺麗にするため」だけの大規模変更は禁止です。

## Do not change without explicit request

以下は明示的な依頼なしに変更しないでください。

- Next.js への移行
- Vite の廃止
- FastAPI の別frameworkへの移行
- Supabase から別DBへの移行
- PostgreSQLへの直接接続 / ORM導入
- Vercel / Cloud Run 構成の変更
- Cloud Run Serviceの削除・作り直し
- Supabase Projectの作り直し
- Database reset
- Storage削除
- 認証方式の全面変更
- CI/CD認証の Service Account JSON key 化
- 新しい大規模依存ライブラリの追加

## Safety rules

絶対に実行しないこと:

- `git reset --hard`
- `git clean -fd`
- force push
- Production DB reset
- Production data 全削除
- Storage bucket 全削除
- secret / API key のcommit

破壊的操作が必要に見える場合は、実行せず理由と候補コマンドを提示してください。

## Tests

最終確認の基本コマンド:

```sh
make check
```

現在の `make check` には以下が含まれます。

- frontend lint / typecheck
- frontend production build
- backend compile check
- e2e Playwright

変更範囲が小さい場合は関連テストを先に実行して構いませんが、完了前には可能な限り `make check` を実行してください。

## Product / UX direction

このプロダクトの中心は「投稿」ではなく、キャンプ中の活動が GYAN になり、みんなの航海が進む体験です。

画面の役割:

```text
Map
= 今どこまで帰ってきたかを見る

Post
= 今日の出来事・開発・挑戦を航海記録として残す

Result
= 投稿がGYANへ変換されたことを確認し、共有する
```

デザイン方向:

- 極地探検
- 航海記録
- 古い調査資料 / expedition log
- 実在地図ベース
- 少しだけゲームUI
- 使いやすさを優先

目安:

```text
80% usable product UI
20% worldbuilding / adventure decoration
```

避けたいデザイン:

- 装飾過多
- 全画面を古紙にする
- 古臭いナビゲーション
- generic AI dashboard風
- AIコメントを主役にする
- GYANだけが大きすぎて投稿内容が埋もれる

Resultでは以下の優先順位を意識してください。

1. 投稿写真
2. 投稿者情報 / 班 / ニックネーム
3. コメント本文
4. GYAN
5. AIコメント

AIコメントは補助要素です。

## Map direction

MapLibre を使用します。

現在はAPI Keyなしの場合 OpenStreetMap raster tileへfallbackできます。

MapTiler等のstyle APIは必須ではありません。必要な場合は地図のデザイン改善目的で導入してください。

航路は経路探索APIを使う必要はありません。

このアプリでは「実際の道路ナビ」ではなく、「極北から立命館へ帰る航路」を演出することが目的なので、自前の座標列 / GeoJSON で管理する方針を優先してください。

## Development vs Production

ローカル開発:

```text
localhost:5173
  -> localhost:8000
```

Production:

```text
https://ship.k4nkan.com
  -> Cloud Run
  -> Supabase / OpenAI
```

Production の設定をローカルコードへハードコードしないでください。

現在は開発とProductionで同じSupabaseを使う可能性があります。テストデータが本番データへ混ざる変更を行う場合は注意してください。将来的な開発用Supabase分離を妨げない構成にしてください。

## When fixing bugs

バグ修正の依頼を受けた場合、まず以下を簡潔に整理してください。

```text
再現条件
原因候補
変更対象
```

原因がコードから明確なら、そのまま最小修正へ進んで構いません。

修正後は、何を変えたか・何を確認したかを短く報告してください。

## Current priority

デプロイ基盤はすでに完成しています。

現時点では、インフラ再構築よりも以下を優先してください。

1. 細かいバグ修正
2. Production上の動作安定
3. スマホ操作性
4. 投稿体験
5. Result / Facebook共有体験
6. Map UI改善
7. デザインブラッシュアップ

新しいタスクでは、まず既存実装を尊重して対象範囲だけ修正してください。
