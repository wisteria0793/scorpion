# APIエンドポイント

### 認証 (`/api/auth/`)
- `POST /api/auth/register/`
  - **説明:** 新規ユーザー登録
  - **リクエストボディ:** `{ "username": "user", "email": "user@example.com", "password": "password", "password2": "password" }`
  - **レスポンス (成功):** `{ "id": 1, "username": "user", "email": "user@example.com" }`

- `POST /api/auth/login/`
  - **説明:** ログイン
  - **リクエストボディ:** `{ "username": "user", "password": "password" }`
  - **レスポンス (成功):** `{ "id": 1, "username": "user", ... }`

- `POST /api/auth/logout/`
  - **説明:** ログアウト
  - **レスポンス (成功):** `204 No Content`
  
- `GET /api/auth/csrf/`
  - **説明:** CSRFクッキーを取得するためのエンドポイント。
  - **レスポンス (成功):** `{ "detail": "CSRF cookie set" }`
  
- `GET /api/auth/me/`
  - **説明:** 現在ログインしているユーザーの情報を取得。
  - **レスポンス (成功):** `{ "id": 1, "username": "user", ... }`

### 売上・分析 (`/api/`)
- `GET /api/revenue/`
  - **説明:** 指定した会計年度の月別売上データを取得。
  - **クエリパラメータ:** `year` (int, 例: 2025), `property_name` (string, オプショナル)
  - **レスポンス (成功):** `[{ "date": "2025-03", "total": 500000, ... }]`

- `GET /api/revenue/yoy/`
  - **説明:** 売上の前年同月比データを取得。
  - **クエリパラメータ:** `year` (int, 例: 2025), `property_name` (string, オプショナル)
  - **レスポンス (成功):** `[{ "month": "3月", "current_year": 500000, "previous_year": 450000 }]`

- `GET /api/analytics/nationality/`
  - **説明:** 宿泊者の国籍比率データを取得。
  - **クエリパラメータ:** `year` (int, 例: 2025), `property_name` (string, オプショナル)
  - **レスポンス (成功):** `[{ "country": "Japan", "count": 120 }, { "country": "USA", "count": 30 }]`
  
- `GET /api/sync-status/`
  - **説明:** 外部サービスとの最終同期時刻を取得。
  - **レスポンス (成功):** `{ "last_sync_time": "2025-12-03T10:00:00Z" }`

### 施設 (Property)
- **エンドポイント:** `/api/properties/`
- **説明:** DRFの`ModelViewSet`を利用しており、以下の操作をサポートします。
  - `GET /api/properties/`: 全ての施設リストを取得。
  - `POST /api/properties/`: 新しい施設を作成。
  - `GET /api/properties/{id}/`: 特定の施設の詳細を取得。
  - `PUT /api/properties/{id}/`: 特定の施設情報を更新。
  - `DELETE /api/properties/{id}/`: 特定の施設を削除。

### 施設画像 (Property Images)
- `GET, POST /api/properties/{property_pk}/images/`
  - **GET:** 特定の施設に紐づく画像の一覧を取得。
  - **POST:** 特定の施設に新しい画像をアップロード。リクエストボディは`multipart/form-data`で、`image`フィールドにファイルを含める。
- `GET, PUT, PATCH, DELETE /api/properties/{property_pk}/images/{pk}/`
  - **説明:** 特定の画像の取得、更新、部分更新、削除。

### 予約 (Reservation)
- `GET /api/reservations/monthly/`
  - **説明:** 指定した年/月の予約リストを取得。
  - **クエリパラメータ:** `year` (int), `month` (int), `property_name` (string, オプショナル)
  - **レスポンス (成功):** `[{ "id": 1, "guest_name": "...", ... }]`

- `POST /api/check-in/{facility_slug}/`
  - **説明:** 施設ごとの名簿提出ページで、予約を検索・特定する。
  - **リクエストボディ:** `{ "check_in_date": "2026-05-10" }`
  - **レスポンス (成功):** `{ "token": "..." }`

### 宿泊者名簿 (`/api/guest-forms/`)
- `GET /api/guest-forms/{token}/`
  - **説明:** 予約特定後に、表示すべきフォームの定義(質問リスト)を取得する。

- `POST /api/guest-forms/{token}/submit/`
  - **説明:** ゲストが入力したフォームの情報を送信・保存する。