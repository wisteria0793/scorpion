# 実装検証チェックリスト

## ✅ 完了した実装

### フェーズ 1: ヘルパー層（services.py）

- [x] `Beds24SyncError` 例外クラス定義
- [x] `fetch_beds24_bookings()` - API 取得 + CSV パース
  - [x] ヘッダー正常化（小文字、スペース除去）
  - [x] 複数のカラム名変種に対応
  - [x] ステータスフィルタ（allowed_statuses, excluded_statuses）
  - [x] ネットワークエラーハンドリング
- [x] `parse_beds24_csv()` - CSV テキスト解析
  - [x] 必須フィールド検証
  - [x] 日付フォーマット解析（"%d %b %Y"）
  - [x] HTML エンティティデコード
  - [x] safe な型変換（int, Decimal, str）
- [x] `sync_bookings_to_db()` - DB 永続化
  - [x] room_id マッピング
  - [x] beds24_property_key マッピング
  - [x] create_or_update（Reservation）
  - [x] キャンセル検知（差分取得）
  - [x] SyncStatus 更新
  - [x] 統計カウント返却

### フェーズ 2: CLIコマンド（sync_bookings.py）

- [x] ヘルパー利用への切り替え
- [x] エラーメッセージ標準化
- [x] 出力ログの簡潔化
- [x] Django command 形式維持

### フェーズ 3: REST API（views.py Beds24SyncAPIView）

- [x] インポート追加
  - [x] `from datetime import date, timedelta`
  - [x] `from reservations.services import Beds24SyncError, fetch_beds24_bookings, sync_bookings_to_db`
  - [x] `from reservations.models import SyncStatus`
- [x] POST ハンドラ実装
  - [x] property_id バリデーション
  - [x] 365日範囲設定
  - [x] `fetch_beds24_bookings()` 呼び出し
  - [x] `sync_bookings_to_db()` 呼び出し（property_filter_id 指定）
  - [x] SyncStatus 取得と最終同期時刻返却
  - [x] JSON レスポンス生成
  - [x] エラーハンドリング（502 Bad Gateway）

### フェーズ 4: 過去データインポート（import_past_bookings.py）

- [x] ヘルパー利用への切り替え
- [x] excluded_statuses パラメータ（Cancelled, Black, Declined）
- [x] 両キーマッピング対応

---

## 🔗 データフロー検証

### フロント → API → DB

```
PricingManagement.jsx
  └─ handleBeds24Sync()
      └─ syncWithBeds24(propertyId, syncType)  // pricingApi.js
          └─ POST /api/pricing/{property_id}/sync-beds24/
              └─ Beds24SyncAPIView.post()
                  ├─ fetch_beds24_bookings(start, end)
                  │   └─ requests.post(Beds24 API)
                  │   └─ parse_beds24_csv()
                  │   └─ List[Dict]
                  ├─ sync_bookings_to_db(..., property_filter_id=property_id)
                  │   ├─ Property.objects.all() → room_map, property_key_map
                  │   ├─ Reservation.objects.update_or_create()
                  │   ├─ SyncStatus.objects.update_or_create()
                  │   └─ Dict[str, int]
                  └─ Response({created, updated, cancelled, last_sync_time})
```

### CLI フロー

```
$ python manage.py sync_bookings
  └─ Command.handle()
      ├─ fetch_beds24_bookings(start, end)
      ├─ sync_bookings_to_db(bookings, start, end, property_filter_id=None)
      └─ print() counts
```

### DB モデル関連

```
Reservation
  ├─ beds24_book_id (unique)
  ├─ property (FK to Property)
  ├─ status ['Confirmed', 'New', 'Cancelled', ...]
  ├─ check_in_date, check_out_date
  ├─ num_guests, guest_name, guest_email
  └─ total_price
  
Property
  ├─ room_id (unique, nullable)
  ├─ beds24_property_key (unique, nullable)
  └─ ...

SyncStatus
  └─ last_sync_time (pk=1 singleton)
```

---

## 📋 パス確認

| ファイル | 場所 | 用途 |
|---|---|---|
| services.py | `backend/reservations/` | ヘルパー関数 |
| sync_bookings.py | `backend/reservations/management/commands/` | CLI コマンド |
| import_past_bookings.py | `backend/reservations/management/commands/` | 過去データインポート |
| views.py | `backend/guest_forms/` | Beds24SyncAPIView |
| tests.py | `backend/reservations/` | ユニットテスト |
| pricingApi.js | `frontend/src/services/` | syncWithBeds24() 関数 |
| PricingManagement.jsx | `frontend/src/components/` | UI コンポーネント |

---

## ✅ 動作確認方法

### 1. パース機能（ユニットテスト）

```bash
cd backend
python manage.py test reservations.tests::Beds24ParsingTests -v 2
```

### 2. エンドツーエンド（CLI）

```bash
cd backend
python manage.py sync_bookings
# 出力: "New: X, Updated: Y, Cancelled: Z, Missing property: W"
```

### 3. API（curl）

```bash
curl -X POST http://localhost:8000/api/pricing/1/sync-beds24/ \
  -H "Content-Type: application/json" \
  -d '{"sync_type":"basic"}' \
  -H "Authorization: Bearer <token>" | jq .
```

### 4. フロント（PricingManagement）

1. http://localhost:5173/pricing-management
2. 「インポート・同期」タブ
3. 「Beds24との同期」セクション
4. 「同期開始」ボタン → レスポンス表示

---

## 🛠️ トレーニング実行

```bash
# 環境構築
cd /workspaces/scorpion/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# マイグレーション
python manage.py migrate

# テスト実行
python manage.py test reservations -v 2

# CLI 実行（ダミー Beds24 API を想定）
python manage.py sync_bookings
```

---

## 📝 完成度：100%

すべての要件が実装されました：
- ✅ CSV パース（ヘッダー柔軟対応）
- ✅ DB 同期（create/update/cancel）
- ✅ API エンドポイント
- ✅ CLI コマンド
- ✅ フロント連携
- ✅ エラーハンドリング
- ✅ テスト
