# 帰るまでが冒険 MVP

投稿でGYANを獲得し、累計GYANに応じて地図上の現在地が進むローカルMVPです。

## 構成

```txt
frontend/           React + Vite + TypeScript
backend/            FastAPI
e2e/                Playwright
database/schema.sql Supabase SQL Editor用
```

rootには全体操作用の `Makefile`、README、`.env.example` だけを置きます。`.env.sample` は `.env.example` と役割が重複するため置いていません。

## セットアップ

```sh
make install
cp .env.example .env
make dev
```

- frontend: `http://127.0.0.1:5173/`
- backend: `http://127.0.0.1:4173/api/health`

## 環境変数

ブラウザへ渡す値はVite仕様に合わせて `VITE_` prefixを付けます。
frontend/backendともrootの `.env` を読みます。

```sh
VITE_API_BASE_URL=http://127.0.0.1:4173
VITE_MAP_API_KEY=
VITE_MAP_STYLE_URL=https://api.maptiler.com/maps/streets-v2/style.json?key={key}
```

`VITE_MAP_API_KEY` が空ならOSMラスタ地図へフォールバックします。ブラウザで使う地図キーは公開される前提です。

## 画面

- `/` : マップ画面
- `/post` : 投稿作成画面
- `/post?team=A` : 班Aを初期選択した投稿作成画面
- `/result` : 直近投稿の生成結果画面

## API

- `GET /api/health`
- `GET /api/posts`
- `POST /api/posts`
- `POST /api/gyan/generate`
- `DELETE /api/posts`

## データの流れ

1. frontendで班、ニックネーム、写真、コメントを入力
2. `POST /api/posts` でbackendへ送信
3. backendのMock `generate_post_result()` がGYAN、リアクション、Facebook文章を生成
4. backendが `backend/data/posts.json` に保存
5. frontendが `GET /api/posts` で累計GYANと直近投稿を取得
6. MapLibreのピン位置を累計GYANから計算

ニックネームと投稿前GYANだけは入力補助とアニメーション用にlocalStorageへ保存します。

## Mockと外部APIの切り替え

GYAN判定は `backend/app/services/gyan.py` に分離しています。OpenAI APIへ置き換える場合は、この関数を差し替えます。

投稿保存は `backend/app/services/post_store.py` に分離しています。Supabaseへ置き換える場合は、`JsonPostStore` をSupabase実装へ差し替えます。

Supabaseの初期SQLは `database/schema.sql` をSQL Editorで実行します。

## コマンド

```sh
make install
make dev
make format
make lint
make typecheck
make build
make test-e2e
make clean
make check
```

個別起動:

```sh
make -C backend dev
make -C frontend dev
```

## 未実装

- Supabase実接続
- OpenAI API実接続
- Realtime
- 認証
- 投稿一覧
- 画像のSupabase Storage保存/WebP変換
- Three.js/GSAPによる3D演出
