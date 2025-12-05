# Deployment Guide (Frontend + Backend)

このガイドは、フロントエンドを Vercel/Netlify、バックエンドを Render/Railway などで無料枠を使って公開する手順の要約です。

1) GitHub リポジトリ
- リポジトリを作成してコードを push します（`main` ブランチ想定）。

2) フロントエンド (Vercel 推奨)
- GitHub と連携して `frontend` フォルダを指定します。
- ビルドコマンド: `npm run build`（`package.json` を確認）
- 出力ディレクトリ: `dist`
- 環境変数: バックエンドの公開 URL を必要に応じて設定（例: `VITE_API_BASE_URL`）

3) バックエンド (Render / Railway / Render with Docker)
- 推奨: Docker デプロイをサポートする Render または Railway を使用。
- 環境変数（最低限）:
  - `SECRET_KEY`
  - `DEBUG=False`
  - `DATABASE_URL`（Render/Railway の Postgres インスタンス接続文字列）
  - `ALLOWED_HOSTS`（カンマ区切り）
  - `CORS_ALLOWED_ORIGINS`（フロントの URL）
  - `BEDS24_USERNAME`, `BEDS24_PASSWORD`（必要な場合）

- Render の場合: GitHub リポジトリを接続して Dockerfile を使うか、Build Command と Start Command を設定します。
  - Start command 例: `gunicorn api.wsgi:application --bind 0.0.0.0:$PORT --workers 3`

4) マイグレーションと静的ファイル
- `entrypoint.sh` はマイグレーションと `collectstatic` を実行するようになっています。Render/Railway の場合、デプロイ時に自動で実行されます。

5) ドメインと TLS
- Render/Vercel/Netlify は自動で TLS を発行します。カスタムドメインを使用する場合は各サービスのドメイン設定を行ってください。

6) 確認手順
- フロントエンドがビルドされ、公開 URL で表示されること。
- API のヘルスチェック（`/api/` 等）にアクセスできること。
- CORS の問題がないこと（ブラウザでフロントを開いて API を呼ぶ）。

追加ヘルプが必要であれば、どのホスティングを使うか教えてください。実際の Render/Railway/Vercel の接続手順も代行できます。
