# バックエンド自動デプロイ（Docker → GHCR / オプションで SSH デプロイ）

概要:
- `main` ブランチへ push されると、`/backend` をコンテキストに Docker イメージをビルドして GitHub Container Registry (GHCR) にプッシュします。
- オプションで、サーバへ SSH して `docker compose pull` / `docker compose up -d` を実行できます。
- ワークフロー: `.github/workflows/deploy-backend.yml`

前提:
- サーバに Docker と Docker Compose（または Docker Compose プラグイン）がインストールされていること。
- サーバ側でプロジェクト用ディレクトリ（例: `/srv/scorpion`）を作り、公開用 `docker-compose.yml` を配置しておくと自動デプロイが容易です。

GHCR にイメージをプッシュするしくみ:
- ワークフローが `ghcr.io/${{ github.repository_owner }}/scorpion-backend:latest` と `...:${{ github.sha }}` を push します。
- サーバ側ではこれらを pull してコンテナを再起動します（`docker-compose` を利用している場合は `docker compose pull && docker compose up -d`）。

SSH 自動デプロイの有効化:
- ワークフローは `secrets.SSH_HOST` / `secrets.SSH_USER` / `secrets.SSH_PRIVATE_KEY`（必要に応じて `SSH_PORT`）が設定されている場合に自動実行されます。リポジトリの `Settings > Secrets and variables > Actions` に以下を追加してください:
  - `SSH_HOST` : デプロイ先サーバのホスト名または IP
  - `SSH_USER` : SSH ユーザー名
  - `SSH_PRIVATE_KEY` : 秘密鍵（パスフレーズなしを推奨）
  - `SSH_PORT` : （オプション）ポート番号（デフォルト 22）

サーバ側の `docker-compose.yml` の簡単な例:

```yaml
version: '3.8'
services:
  web:
    image: ghcr.io/<OWNER>/scorpion-backend:latest
    restart: always
    environment:
      - DJANGO_SETTINGS_MODULE=backend.settings.production
      - DATABASE_URL=postgres://user:pass@db:5432/scorpion
    ports:
      - '8000:8000'
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=scorpion
      - POSTGRES_USER=scorpion
      - POSTGRES_PASSWORD=changeme
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
```

サーバセットアップ（最小）:
1. Docker と Docker Compose をインストール
2. `/srv/scorpion` を作成し、上記 `docker-compose.yml` を配置
3. 必要に応じて環境変数やシークレットを設定
4. 初回は手動で `docker compose pull && docker compose up -d` を実行して動作を確認

セキュリティ/運用の注意:
- SSH 自動デプロイに使う秘密鍵は厳重に管理してください。パスフレーズが付いた鍵を使う場合は GitHub Actions 側での取り扱いに注意が必要です。
- 本番データベースのパスワードや外部 API キーは GitHub Secrets に保存し、ワークフローや `docker-compose.yml` で参照するようにしてください。

トラブルシューティング:
- Actions のログを確認してビルド失敗・プッシュ失敗を切り分けます。
- サーバで `docker compose logs` を確認してコンテナ起動エラーを診断します。

次の手順:
- 私に `docker-compose.yml` のテンプレートを実際の環境変数に合わせて作成させることができます。
- あるいは、SSH 秘密鍵をリポジトリの Secrets に登録して実際に自動デプロイを試すことができます。

## GHCR イメージを public にする方法

イメージを public にすると、デプロイ先サーバで `docker login` を行わなくても `docker pull ghcr.io/<OWNER>/scorpion-backend:latest` で取得できます。以下の方法があります。

1) GitHub の Web UI（簡単）
  - リポジトリのページを開き、右上の `Packages` タブへ移動します（または `https://github.com/<OWNER>/<REPO>/packages`）。
  - 対象パッケージ（`scorpion-backend`）を選択し、`Package settings` を開きます。
  - `Change visibility`（または類似のボタン）から `Public` に変更します。

2) gh CLI / API（スクリプト化したい場合）
  - ローカルで `gh` を使う場合:
```bash
gh auth login
gh api --method PATCH /user/packages/container/scorpion-backend/visibility -f visibility=public
```
  - organization 所有の場合はパスを `/orgs/<ORG>/packages/container/scorpion-backend/visibility` に置き換えてください。

3) curl を使う場合（Personal Access Token を環境変数に格納して実行）:
```bash
export GH_TOKEN=ghp_xxx # PAT with appropriate scopes (packages:write or repo)
curl -X PATCH \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GH_TOKEN" \
  https://api.github.com/user/packages/container/scorpion-backend/visibility \
  -d '{"visibility":"public"}'
```
  - オーガニゼーション所有の場合は `https://api.github.com/orgs/<ORG>/packages/container/scorpion-backend/visibility` を使います。

注意:
- API のエンドポイントはユーザー所有かオーガニゼーション所有かで変わります。Web UI が最も確実で簡単です。
- PAT のスコープは状況により `packages:write` / `repo` などが必要になる場合があります。Web UI 操作ならこれらのトークンは不要です。

### gh CLI スクリプト
リポジトリに `gh` を使う小さなスクリプトを追加しました。サーバや自分の環境で `gh auth login` している場合は以下を実行するだけでパッケージを public に切り替えられます。

```bash
# 例: ユーザー所有パッケージ
./scripts/make-ghcr-public.sh wisteria0793 scorpion-backend

# 例: 組織所有パッケージ
./scripts/make-ghcr-public.sh my-org scorpion-backend --org
```

スクリプトは `gh` の認証状態を確認し、適切な API エンドポイントに対して PATCH リクエストを投げます。

