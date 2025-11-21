# シーケンス図

このドキュメントは、システムの主要な機能（ユースケース）における、コンポーネント間のインタラクションを時系列で示します。

## 1. 新規予約フロー (成功時)

ユーザーが施設を予約し、Stripeによる決済を成功させるまでのハッピーパス・シナリオです。

```mermaid
sequenceDiagram
    actor User
    participant Frontend as React App
    participant Backend as Django API
    participant Stripe

    User->>Frontend: 予約内容を入力し、「予約する」をクリック
    activate Frontend

    Frontend->>Backend: POST /api/reservations/ (予約情報)
    activate Backend

    Backend->>Backend: 予約情報（価格、在庫）を検証
    Backend->>Stripe: 決済セッションを作成 (create_checkout_session)
    activate Stripe
    Stripe-->>Backend: 決済セッションIDとURL
    deactivate Stripe

    Backend-->>Frontend: 決済ページのURL
    deactivate Backend

    Frontend->>User: Stripeの決済ページにリダイレクト
    deactivate Frontend

    User->>Stripe: 支払い情報を入力し、決済実行
    activate Stripe

    Stripe->>Backend: Webhookで決済完了イベントを通知 (checkout.session.completed)
    deactivate Stripe
    activate Backend

    Backend->>Backend: データベース内の予約ステータスを<br>「PendingPayment」から「Confirmed」に更新
    Backend->>Backend: 予約確定通知をSlackに送信
    note right of Backend: (Slack API Call)
    Backend-->>Stripe: 200 OK (Webhook受領)
    deactivate Backend

    Stripe->>User: 決済完了を通知
    User->>Frontend: 予約完了ページにリダイレクトされる
```

## 2. 宿泊者名簿の連携フロー

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
