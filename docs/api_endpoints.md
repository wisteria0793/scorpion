# APIエンドポイント

### 認証 (`/api/auth/`)
- `POST /api/auth/register/`
  - **説明:** 新規ユーザー登録
  - **リクエストボディ:** `{ "username": "user", "email": "user@example.com", "password": "password" }`
  - **レスポンス:** `{ "user": { "id": 1, "username": "user", "email": "user@example.com" } }`

- `POST /api/auth/login/`
  - **説明:** ログイン
  - **リクエストボディ:** `{ "email": "user@example.com", "password": "password" }`
  - **レスポンス:** `{ "access_token": "your_jwt_token_here" }`

- `POST /api/auth/logout/`
  - **説明:** ログアウト (トークンを無効化)
  - **レスポンス:** `204 No Content`

### 施設 (`/api/facilities/`)
- `GET /api/facilities/`
  - **説明:** 全ての施設リストを取得
- `POST /api/facilities/`
  - **説明:** 新しい施設を作成
  - **リクエストボディ例:** `{ "name": "新しい施設", "room_id": 101, "capacity": 4, "management_type": "company" }`
- `GET /api/facilities/{id}/`
  - **説明:** 特定の施設の詳細を取得
- `PUT /api/facilities/{id}/`
  - **説明:** 特定の施設情報を更新
- `DELETE /api/facilities/{id}/`
  - **説明:** 特定の施設を削除

- `POST /api/facilities/{id}/images/`
  - **説明:** 特定の施設に新しい画像をアップロードする
  - **リクエストボディ:** (画像データ) と `{ "order": 3 }`
- `PUT /api/facilities/{id}/images/`
  - **説明:** 特定の施設の画像リスト（特に表示順）をまとめて更新する
  - **リクエストボディ:** `[{ "id": 1, "order": 1 }, { "id": 2, "order": 2 }]`
- `DELETE /api/facilities/{id}/images/{image_id}/`
  - **説明:** 特定の画像を削除する

### 予約 (`/api/reservations/`)
- `GET /api/reservations/`
  - **説明:** 予約リストを取得 (日付、施設、支払い状況などでフィルタ可能)
  - **クエリパラメータ例:** `?facility_id=1&tax_status=pending`
- `GET /api/reservations/{id}/`
  - **説明:** 特定の予約の詳細を取得
- `PATCH /api/reservations/{id}/`
  - **説明:** 特定の予約情報を部分的に更新 (例: 管理者によるステータス変更)
- `POST /api/reservations/{id}/pay-tax/`
  - **説明:** 特定の予約の宿泊税支払いセッションを作成し、決済URLを返す
  - **レスポンス:** `{ "payment_url": "https://checkout.stripe.com/..." }`

### 同期 (`/api/sync/`)
- `POST /api/sync/reservations/`
  - **説明:** Beds24等の外部サービスから予約情報を強制的に同期する
  - **レスポンス:** `{ "status": "success", "created": 10, "updated": 5 }`

### ダッシュボード (`/api/dashboard/`)
- `GET /api/dashboard/sales/`
  - **説明:** 売上データを取得
  - **クエリパラメータ例:** `?year=2026` または `?year=2025&month=4`

### 空室在庫 (`/api/availability/`)
- `GET /api/availability/`
  - **説明:** 指定した期間と施設の空室状況を取得
  - **クエリパラメータ例:** `?facility_id=1&start_date=2026-05-01&end_date=2026-05-31`
- `POST /api/availability/block/`
  - **説明:** 特定の日付範囲の予約をブロックする
  - **リクエストボディ:** `{ "facility_id": 1, "start_date": "2026-06-10", "end_date": "2026-06-12", "reason": "Maintenance" }`
- `DELETE /api/availability/block/{block_id}/`
  - **説明:** 設定した予約ブロックを解除