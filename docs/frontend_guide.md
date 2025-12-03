# フロントエンドガイド

このドキュメントは、フロントエンドアプリケーションのアーキテクチャと主要なコンポーネントについて説明し、新しい機能を追加する際の手引きとなることを目的としています。

## 主要なアーキテクチャ

### APIクライアント
API通信には`axios`を利用しています。CSRFトークンの自動付与など、アプリケーション全体で共通の設定を適用するため、`src/services/apiClient.js`で単一の`axios`インスタンスを作成し、それを各APIサービスがインポートして利用する設計になっています。

```javascript
// src/services/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,
  // ...
});

export default apiClient;
```
新しいAPIサービスを作成する際は、必ずこの共有クライアントをインポートしてください。

### 認証と状態管理
ユーザー認証の状態は`src/contexts/AuthContext.jsx`で管理されています。アプリケーション起動時に`/api/auth/csrf/`からCSRFトークンを取得し、共有`apiClient`のデフォルトヘッダーにセットする処理もここで行われます。

保護されたルートにアクセスするには、`RequireAuth`コンポーネントでラップします。

## ページとコンポーネント構成

### AnalyticsPage
`src/pages/AnalyticsPage.jsx`は、ログイン後のメインページとなるコンテナコンポーネントです。このページは、左側のサイドメニューと右側のコンテンツエリアという2カラムレイアウトを構成します。

### SideMenu
`AnalyticsPage`内に定義されているサイドメニューです。`useState`で管理されている`view`の状態を切り替えることで、表示するコンテンツを制御します。

新しいコンテンツビューを追加する手順は以下の通りです。
1. `SideMenu`コンポーネントに新しいビューを切り替えるための`<button>`を追加します。
2. `AnalyticsPage`の`renderContent`関数に、新しい`view`に対応する`case`と、表示するコンポーネントを追加します。

```jsx
// src/pages/AnalyticsPage.jsx

function AnalyticsPage() {
  const [view, setView] = useState('revenue'); 

  const renderContent = () => {
    switch (view) {
      case 'revenue':
        return <RevenueAnalysis />; 
      // ... 他のビュー
      case 'new_view': // 新しいビューのcaseを追加
        return <NewViewComponent />;
      default:
        return <div>コンテンツを選択してください</div>;
    }
  };
  // ...
}
```

### コンテンツコンポーネント
`src/components/`ディレクトリには、`AnalyticsPage`のコンテンツエリアに表示される主要なコンポーネントが格納されています。

- **RevenueAnalysis.jsx**: 売上分析に関連する3つのグラフ（月別売上、前年比、国籍比率）を表示します。内部でタブ切り替えを持ちます。
- **ReservationList.jsx**: 月別の予約データをテーブル形式で表示します。
- **PropertyManagement.jsx**: 施設のCRUD（作成・読み取り・更新・削除）機能を提供します。施設一覧の表示と、モーダルフォームによる編集・作成が可能です。画像管理モーダルもこのコンポーネントから呼び出されます。

新しいページや機能を追加する際は、これらのコンポーネントを参考に、`src/components/`内に新しいコンポーネントを作成し、`AnalyticsPage`から呼び出す構成にしてください。
