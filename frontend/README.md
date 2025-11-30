# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## このプロジェクトでの認証ページ

このフロントエンドには簡易的な認証フローが実装されています（開発環境向け）。以下のページを確認して動作を試せます。

- /register — ユーザ登録画面（username, email, password, password2）
- /login — ログイン画面（username, password）

これらのページはバックエンドの `/api/auth/` エンドポイントを呼び出します。アプリケーション全体の認証状態は `src/contexts/AuthContext.jsx` で管理しており、`RequireAuth` コンポーネントでルート保護ができます。

ローカルで動かすには:
```bash
cd frontend
npm install
npm run dev
# ブラウザで http://localhost:5173/register と /login を開く
```

注意: フロントは development のため `axios` で `withCredentials: true` を使ってセッション cookie を受け取りに行きます。バックエンドをローカルで起動し、両方を動かして統合動作を確認してください.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
