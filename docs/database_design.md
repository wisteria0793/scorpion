# データベース設計

## テーブル定義
### users
- `id` (PK, int) - 主キー
- `username` (varchar) - ユーザー名
- `password` (varchar) - ハッシュ化して保存
- `email` (varchar, unique) - メールアドレス
- `created_at` (datetime) - 登録日時
- `updated_at` (datetime) - 更新日時

### facilities
- `id` (PK, int) - 主キー
- `name` (varchar) - 施設名
- `beds24_property_key` (int, unique) - Beds24のプロパティキー
- `room_id` (int, unique) - 部屋ID
- `address` (varchar) - 住所
- `capacity` (int) - 最大収容人数
- `num_parking` (int) - 駐車台数
- `google_map_url` (text) - Google MapのURL
- `check_in_time` (time) - チェックイン時刻
- `check_out_time` (time) - チェックアウト時刻
- `description` (text) - 施設説明
- `management_type` (varchar) - 管理形態 (例: "company", "consigned")
- `created_at` (datetime) - 登録日時
- `updated_at` (datetime) - 更新日時

### amenities
- `id` (PK, int) - 主キー
- `name` (varchar, unique) - 設備・アメニティ名

### facility_amenities (中間テーブル)
- `id` (PK, int) - 主キー
- `facility_id` (FK, int) -> `facilities.id`
- `amenity_id` (FK, int) -> `amenities.id`

### facility_images
- `id` (PK, int) - 主キー
- `facility_id` (FK, int) -> `facilities.id`
- `image_url` (text) - 画像のURL
- `order` (int) - 画像の表示順

### reservations
- `id` (PK, int) - 主キー
- `facility_id` (FK, int) -> `facilities.id`
- `guest_name` (varchar) - 宿泊代表者名
- `guest_email` (varchar) - 宿泊代表者メールアドレス
- `check_in_date` (date) - チェックイン日
- `check_out_date` (date) - チェックアウト日
- `num_guests` (int) - 宿泊人数
- `total_price` (decimal) - 合計料金
- `payment_status` (varchar) - 支払い状況 (例: "pending", "paid", "failed")
- `guest_roster_status` (varchar) - 宿泊者名簿の提出状況 (例: "pending", "submitted", "verified")
- `accommodation_tax_status` (varchar) - 宿泊税の支払い状況 (例: "not_applicable", "pending", "paid")
- `created_at` (datetime) - 登録日時
- `updated_at` (datetime) - 更新日時

## ER図 (Mermaid)
```mermaid
erDiagram
    users {
        int id PK
        varchar username
        varchar password
        varchar email
        datetime created_at
        datetime updated_at
    }
    facilities {
        int id PK
        varchar name
        int beds24_property_key
        int room_id
        varchar address
        int capacity
        int num_parking
        text google_map_url
        time check_in_time
        time check_out_time
        text description
        varchar management_type
        datetime created_at
        datetime updated_at
    }
    reservations {
        int id PK
        int facility_id FK
        varchar guest_name
        varchar guest_email
        date check_in_date
        date check_out_date
        int num_guests
        decimal total_price
        varchar payment_status
        varchar guest_roster_status
        varchar accommodation_tax_status
        datetime created_at
        datetime updated_at
    }
    amenities {
        int id PK
        varchar name
    }
    facility_images {
        int id PK
        int facility_id FK
        text image_url
        int order
    }
    facility_amenities {
        int id PK
        int facility_id FK
        int amenity_id FK
    }

    facilities ||--o{ reservations : "has"
    facilities ||--o{ facility_images : "has"
    facilities }o--o{ facility_amenities : "links to"
    amenities }o--o{ facility_amenities : "links to"
```
