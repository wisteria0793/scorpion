**Render + Vercel Deployment Setup (手順と最小クレジット利用のガイド)**

概要: フロントエンドは Vercel、バックエンドは Render を想定した手順です。両サービスとも GitHub 連携でリポジトリを選び、環境変数を設定するだけでデプロイできます。学生向けクレジットは Postgres（作成時）や付加的なプランにのみ使う想定で、必要最小限に留めます。

前提:
- GitHub にこのリポジトリがある（`wisteria0793/scorpion` に push 済み）
- Render と Vercel のアカウントを用意

1) Vercel (フロント)
- ステップ:
  1. vercel.com にログイン → "New Project" → GitHub 連携。
  2. リポジトリ `scorpion` を選択し、`frontend` をビルド対象に設定。
  3. Build Command: `npm run build`
     Output Directory: `frontend/dist`
  4. Environment Variables: 追加する場合は `VITE_API_BASE_URL` にバックエンドの公開 URL を設定。
  5. デプロイを開始。完了後、フロントの公開 URL をメモ。

2) Render (バックエンド)
- ステップ (Render の Dashboard を使う簡単な方法):
  1. render.com にログイン → "New" → "Web Service" → "Connect a repository" を選択。
  2. リポジトリを選び、`main` ブランチを指定。Environment: `Docker` を選択し、Dockerfile パスは `backend/Dockerfile` にします。
  3. Start Command: `gunicorn api.wsgi:application --bind 0.0.0.0:$PORT --workers 3` を設定。
  4. Environment variables を設定（必須）:
     - `SECRET_KEY` = (ランダムな文字列)
     - `DEBUG` = `False`
     - `ALLOWED_HOSTS` = `your-backend.onrender.com`（カンマ区切りで追加可）
     - `CORS_ALLOWED_ORIGINS` = `https://your-frontend.vercel.app`
     - `CSRF_TRUSTED_ORIGINS` = `https://your-frontend.vercel.app`
     - `BEDS24_USERNAME`, `BEDS24_PASSWORD`（必要に応じて）
  5. Database: Render の Dashboard で "New" → "Postgres" を作成（Starter プランを選択すれば最小クレジット）。作成後、`DATABASE_URL` を Web Service の環境変数にコピー。
  6. デプロイを開始。Render は `entrypoint.sh` を実行してマイグレーションと collectstatic を行います。

3) 最小クレジット利用のコツ
- Postgres は最低限1つだけ作成する。必要なストレージ・プランは Starter で十分なことが多い。
- Render の無料プランで足りるか確認。もし無料で動くならクレジットは使わなくて良い。

4) 確認とトラブルシュート
- マイグレーション: Render のログで `Running migrations...` が走っているか確認。
- 静的ファイル: `collectstatic` のログを確認し、`staticfiles` が正しく配信されているか確認。
- CORS: ブラウザのコンソールで CORS エラーが出ないか確認。

5) 追加ファイルを我々が追加済み
- `render.yaml`: Render にインポートしてサービスとデータベースを素早く作成するためのテンプレートを追加。
- `vercel.json`: Vercel のビルド/ルーティング設定を追加。

次のアクション（私が代行可能）:
- Render にインポートする `render.yaml` の微調整と、必要なら Render の UI 上でのセットアップ作業をガイド（ただしアカウント認証はユーザ側）。
- Vercel の環境変数設定を一緒に行う（ユーザが画面操作する形で案内）。
