# シーケンス図

このドキュメントは、システムの主要な機能（ユースケース）における、コンポーネント間のインタラクションを時系列で示します。

## 1. 宿泊者名簿 提出フロー (新)

ゲストが施設ごとの専用リンクからアクセスし、宿泊者名簿を提出するシナリオ。

```mermaid
sequenceDiagram
    actor Guest
    participant Frontend as React App
    participant Backend as Django API

    Guest->>Frontend: 施設ごとの専用URLにアクセス
    activate Frontend
    Frontend->>Guest: 予約検索ページを表示 (入力はチェックイン日のみ)

    Guest->>Frontend: チェックイン日を入力し、「次へ」をクリック
    Frontend->>Backend: POST /api/check-in/{facility_slug}/ <br> { check_in_date: "..." }
    activate Backend

    Backend->>Backend: DBで施設とチェックイン日に合う予約を検索
    alt 予約が存在する場合
        Backend->>Backend: GuestSubmissionレコードを作成し、<br>ユニークなトークンを発行
        Backend-->>Frontend: { token: "..." }
    else 予約が存在しない場合
        Backend-->>Frontend: 404 Not Found
    end
    deactivate Backend

    alt 予約成功
        Frontend->>Backend: GET /api/guest-forms/{token}/
        activate Backend
        Backend->>Backend: トークンを検証し、<br>施設に紐づくフォーム定義をDBから取得
        Backend-->>Frontend: フォーム定義 (JSON)
        deactivate Backend

        Frontend->>Frontend: JSONを元にフォームを動的に描画
        Frontend->>Guest: 宿泊者名簿フォームを表示

        Guest->>Frontend: フォームに情報を入力し、「提出」をクリック
        Frontend->>Backend: POST /api/guest-forms/{token}/ <br> (フォームデータ)
        activate Backend

        Backend->>Backend: DBに提出内容を保存し、<br>予約のステータスを「提出済」に更新
        Backend-->>Frontend: 201 Created
        deactivate Backend

        Frontend->>Guest: 「ご提出ありがとうございました」画面を表示
    else 予約失敗
        Frontend->>Guest: エラーメッセージを表示
    end
    deactivate Frontend
```

## 2. 予約情報 同期フロー

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

## 3. 宿泊税 支払いフロー

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

