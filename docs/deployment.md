**フロントエンド自動デプロイ (GitHub Actions → GitHub Pages)**

- 概要: リポジトリの `main` ブランチに push されると、`/frontend` をビルドして `frontend/dist` の成果物を GitHub Pages にデプロイします。
- 追加済みワークフロー: `.github/workflows/deploy-frontend.yml`

セットアップと確認手順
1. このリポジトリを GitHub に push してください（`main` ブランチ）。
2. Actions がトリガーされ、自動的にビルド→デプロイされます。
3. GitHub のリポジトリ設定 > Pages セクションで公開 URL を確認してください。通常は `https://<owner>.github.io/<repo>/` の形になります。

注意点（Vite / SPA に関する重要な注意）
- Vite のデフォルトビルドはアプリのアセット参照をルート(`/`)基準で生成します。GitHub Pages の「プロジェクトページ」(ユーザー/組織ページ ではない) にデプロイする場合、アプリが `https://<owner>.github.io/<repo>/` のサブパスに配置されるため、ビルド時に `base` を `/your-repo-name/` に設定する必要があります。

対策案:
- 1) 事前に `vite.config.js` に `base: '/scorpion/'`（このリポジトリ名に合わせる）を追加する。これが最も確実。
- 2) ルーティングを `HashRouter` に切り替えて相対パスで動作させる（React Router を使っているため改修が必要）。
- 3) リポジトリをユーザーページ（`<owner>.github.io`）として設定し、ルートで公開する（別のリポジトリ名/設定が必要）。

代替ホスティング（簡単なもの）
- Netlify / Vercel: リポジトリを連携させるだけで自動ビルド・デプロイが可能。プライベートなトークンやサイトIDの設定が必要ですが、静的 SPA のホスティングは最も簡単です。

問題が起きたときのチェックポイント
- Actions の実行ログ (`Actions` タブ) を確認。
- ビルド後に `frontend/dist` が生成されているかローカルで `npm run build` して確認。
- GitHub Pages の公開 URL で静的ファイルが参照できるか確認。

次のステップ
- 「このまま GitHub Pages にデプロイする（*注意: ルート/サブパスの問題は後で対応*）」か、
- Vite の `base` をリポジトリ名に合わせてビルドする（推奨）、または
- Netlify/Vercel に切り替える（トークン/サイト連携が必要）

どれを進めますか？ - 要望に合わせて `vite.config.js` を自動更新して `base` を設定するパッチを作成できます。
