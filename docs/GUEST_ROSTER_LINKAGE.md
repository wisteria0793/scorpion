# 予約と宿泊者名簿の紐づけ

## 概要

予約（Reservation）と宿泊者名簿提出（GuestSubmission）は以下のように紐づいています：

```
Beds24 API
   ↓
Reservation （beds24_book_id, check_in_date）
   ↓ (OneToOne)
GuestSubmission （トークン、提出状況）
   ↓
Google Sheets （施設ごとのシート）
```

## データ構造

### Reservation（予約）
| フィールド | 説明 |
|-----------|------|
| `beds24_book_id` | Beds24 の予約ID（**ユニーク**） |
| `check_in_date` | チェックイン日 |
| `check_out_date` | チェックアウト日 |
| `property` | 施設（ForeignKey） |
| `guest_name` | ゲスト名 |
| `guest_email` | ゲストメール |
| `guest_roster_status` | 名簿提出状況 |

### GuestSubmission（名簿提出）
| フィールド | 説明 |
|-----------|------|
| `reservation` | Reservation（OneToOneField） |
| `token` | フォームアクセス用トークン（ユニーク） |
| `status` | 提出ステータス（pending/completed） |
| `submitted_data` | ゲストの提出内容（JSON） |

### Google Sheets（施設ごと）
| 列 | フィールド | 説明 |
|----|-----------|------|
| A | Beds24予約ID | **beds24_book_id で検索** |
| B | 施設名 | property.name |
| C | ゲスト名 | guest_name |
| D | メールアドレス | guest_email |
| E | チェックイン日 | check_in_date |
| F | チェックアウト日 | check_out_date |
| G | 宿泊者数 | num_guests |
| **H** | **名簿提出状況** | **ここを更新** |
| I | 合計料金 | total_price |
| J | 作成日時 | created_at |

## フロー図

```
1. 予約同期 (Beds24 → DB)
   ┌─────────────────────────────────┐
   │ sync_bookings コマンド実行        │
   │ (30分ごとに自動実行)            │
   └──────────┬──────────────────────┘
              ↓
   ┌─────────────────────────────────┐
   │ Reservation 作成（新規のみ）     │
   │ ↓ 自動でリレーション作成
   │ GuestSubmission 作成             │
   └──────────┬──────────────────────┘
              ↓
   ┌─────────────────────────────────┐
   │ Google Sheets に行を追加         │
   │ （施設の google_sheets_url から） │
   └─────────────────────────────────┘


2. 名簿提出 (ゲスト → DB)
   ┌─────────────────────────────────┐
   │ POST /api/guest-forms/{token}   │
   │ /submit/                         │
   └──────────┬──────────────────────┘
              ↓
   ┌─────────────────────────────────┐
   │ GuestSubmission.status           │
   │ = COMPLETED に更新               │
   │                                  │
   │ Reservation.guest_roster_status  │
   │ = SUBMITTED に更新               │
   └──────────┬──────────────────────┘
              ↓
   ┌─────────────────────────────────┐
   │ Google Sheets の H列を更新       │
   │ 検索キー: beds24_book_id (A列)  │
   │ 更新値: "submitted"              │
   └─────────────────────────────────┘
```

## 紐づけの仕組み

### キー：Beds24 予約ID

**A列に記録:** `beds24_book_id`

例：
```
A1: "Beds24予約ID"  (ヘッダー)
A2: "12345"         ← これを検索キーとして使用
A3: "12346"
```

### 実装例

#### 1. 予約を Google Sheets に追加（sync_bookings.py）
```python
# 新規予約を自動的に Google Sheets に追加
reservation_data = {
    'beds24_book_id': 12345,      # ← キーとなる
    'guest_name': 'Taro Yamada',
    'check_in_date': '2025-12-20',
    ...
}
service.append_reservation(reservation_data)
```

#### 2. ゲストが名簿を提出（GuestFormSubmitView）
```python
# ゲストがフォームを submit
submission.status = GuestSubmission.SubmissionStatus.COMPLETED
submission.save()

# Google Sheets の H列を自動更新
service.update_roster_status(
    beds24_book_id=12345,  # A列で検索
    status='submitted'      # H列に書き込み
)
```

### 検索ロジック

[backend/guest_forms/google_sheets_service.py](../backend/guest_forms/google_sheets_service.py) の `update_roster_status()` メソッド：

```python
def update_roster_status(self, beds24_book_id: int, status: str) -> bool:
    # スプレッドシート全体から A列を取得
    values = self.service.spreadsheets().values().get(
        spreadsheetId=self.spreadsheet_id,
        range='予約情報!A:A'  # A列のみ
    ).execute().get('values', [])
    
    # A列から beds24_book_id を検索
    for idx, row in enumerate(values):
        if int(row[0]) == beds24_book_id:
            row_index = idx + 1
            break
    
    # H列 (row_index) を更新
    self.service.spreadsheets().values().update(
        range=f'予約情報!H{row_index}',
        body={'values': [[status]]}
    )
```

## 施設ごとのシート管理

### Property モデル

```python
class Property(models.Model):
    name = models.CharField(...)                    # 施設名
    google_sheets_url = models.URLField(...)       # 施設専用の Sheet URL
```

### 管理画面での設定

```
施設編集画面
↓
Google Sheets URL: https://docs.google.com/spreadsheets/d/1a2B3c4D5e6F7g8H9i0J1k2L3m4N5o6P7/edit
↓
URL から ID を抽出
1a2B3c4D5e6F7g8H9i0J1k2L3m4N5o6P7
↓
GoogleSheetsService(spreadsheet_id=<extracted_id>) で操作
```

## トラブルシューティング

### Google Sheets に行が追加されない

**原因1: シートの共有設定**
- サービスアカウントメールアドレスがシートに共有されているか確認
- GCP コンソール → サービスアカウント → メールアドレスをコピー
- Google Sheets で「共有」して、そのメールを追加

**原因2: シート名が違う**
- コード内で `'予約情報'` と指定されている
- Google Sheet の最初のシート名を `予約情報` に変更

**原因3: 列の配置が違う**
- ヘッダー行（A1:J1）が正しいか確認
  ```
  A1: Beds24予約ID
  B1: 施設名
  C1: ゲスト名
  ...
  H1: 名簿提出状況
  ```

### 名簿提出時に Google Sheets が更新されない

**チェックリスト:**
- ✓ GuestFormSubmitView が正しく実装されているか
- ✓ `update_roster_status()` が呼ばれているか（ログを確認）
- ✓ beds24_book_id が Google Sheets の A列に存在するか
- ✓ Google Sheets API の認証情報が有効か

```bash
# ログで確認
tail -f /var/log/django_errors.log | grep "Roster status"
```

## API エンドポイント

### 名簿提出フォーム取得
```
GET /api/guest-forms/{token}/
```

### 名簿を提出
```
POST /api/guest-forms/{token}/submit/
Content-Type: application/json

{
  "氏名": "山田太郎",
  "電話番号": "090-1234-5678",
  ...
}
```

**実行後:**
- ✓ DB の GuestSubmission.status = COMPLETED
- ✓ DB の Reservation.guest_roster_status = SUBMITTED
- ✓ Google Sheets の H列 = submitted

## 参考リンク

- [Google Sheets API セットアップガイド](./GOOGLE_SHEETS_API_GUIDE.md)
- [実装詳細](./GOOGLE_SHEETS_IMPLEMENTATION.md)
