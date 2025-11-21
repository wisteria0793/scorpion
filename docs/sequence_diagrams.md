# シーケンス図

このドキュメントは、システムの主要な機能（ユースケース）における、コンポーネント間のインタラクションを時系列で示します。

## 1. 予約情報 同期フロー

Beds24等の外部予約サイトから予約情報を取得し、ローカルのデータベースを更新するシナリオです。管理者が手動で実行、またはシステムが定期的に自動実行することを想定しています。

```mermaid
sequenceDiagram
    actor System/Admin
    participant Backend as Django API
    participant Beds24 as Beds24 API

    System/Admin->>Backend: POST /api/sync/reservations/
    activate Backend

    Backend->>Beds24: 予約情報を要求 (例: getBookings)
    activate Beds24
    Beds24-->>Backend: 予約データリスト (JSON)
    deactivate Beds24

    Backend->>Backend: 取得した予約データとDBを照合
    loop for each booking
        alt 新規予約
            Backend->>Backend: 新しいReservationレコードを作成
        else 既存予約の更新
            Backend->>Backend: 既存Reservationレコードを更新
        end
    end
    note right of Backend: この時、宿泊税の支払い状況<br>(accommodation_tax_status)は<br>デフォルトで "pending" に設定される。

    Backend-->>System/Admin: { "status": "success", "created": 10, "updated": 5 }
    deactivate Backend
```

## 2. 宿泊税 支払いフロー

ユーザーが特定の予約に対する宿泊税を支払うシナリオです。

```mermaid
sequenceDiagram
    actor User
    participant Frontend as React App
    participant Backend as Django API
    participant Stripe

    User->>Frontend: 予約詳細画面で「宿泊税を支払う」をクリック
    activate Frontend

    Frontend->>Backend: POST /api/reservations/{id}/pay-tax/
    activate Backend

    Backend->>Backend: 予約IDと金額（宿泊税）を検証
    Backend->>Stripe: 宿泊税用の決済セッションを作成
    activate Stripe
    Stripe-->>Backend: 決済セッションIDとURL
    deactivate Stripe

    Backend-->>Frontend: 決済ページのURL
    deactivate Backend

    Frontend->>User: Stripeの決済ページにリダイレクト
    deactivate Frontend

    User->>Stripe: 支払い情報を入力し、決済実行
    activate Stripe

    Stripe->>Backend: Webhookで決済完了イベントを通知
    deactivate Stripe
    activate Backend

    Backend->>Backend: データベース内の予約ステータスを<br>`accommodation_tax_status` = "paid" に更新
    Backend-->>Stripe: 200 OK (Webhook受領)
    deactivate Backend

    Stripe->>User: 決済完了を通知
    User->>Frontend: 支払い完了ページにリダイレクトされる
```

## 3. 宿泊者名簿の連携フロー

管理者が名簿の提出状況を確認し、Google スプレッドシートから情報を取得するシナリオです。

```mermaid
sequenceDiagram
    actor Admin
    participant Frontend as React App
    participant Backend as Django API
    participant Google as Google Sheets API

    Admin->>Frontend: 管理画面で「名簿情報更新」をクリック
    activate Frontend

    Frontend->>Backend: POST /api/guest-rosters/sync/
    activate Backend

    Backend->>Google: 認証 (OAuth 2.0)
    activate Google
    Google-->>Backend: アクセストークン
    deactivate Google

    Backend->>Google: スプレッドシートのデータを要求 (get_spreadsheet_data)
    activate Google
    Google-->>Backend: 名簿データ (JSON)
    deactivate Google

    Backend->>Backend: 取得した名簿データと<br>DBの予約情報を照合
    loop for each reservation
        Backend->>Backend: 予約の`guest_roster_status`を<br>「pending」から「submitted」に更新
    end

    Backend-->>Frontend: { "status": "success", "updated_count": 5 }
    deactivate Backend

    Frontend->>Admin: 「5件の名簿情報が更新されました」と表示
    deactivate Frontend
```
