# Beds24 同期実装ガイド

## 概要

Beds24からの予約情報同期が完全に実装されました。フロント・バック・CLIの3つのエントリーポイントで利用可能です。

## アーキテクチャ

```
Beds24 API
    ↓
[fetch_beds24_bookings] (services.py)
    ↓ (normalized booking dicts)
[sync_bookings_to_db] (services.py)
    ↓ (persists to DB, detects cancellations)
[Reservation, SyncStatus models]
```

## 実装ファイル一覧

### 1. `backend/reservations/services.py` (共有ヘルパー)

- **`fetch_beds24_bookings(start, end, include_cancelled, allowed_statuses, excluded_statuses)`**
  - Beds24 API へリクエストを送り、CSVデータを取得
  - ヘッダーゆらぎに対応（複数のカラム名変種を認識）
  - normalize済みの booking dict リストを返す
  
- **`parse_beds24_csv(csv_text, ...)`**
  - CSVテキストをパース
  - 必要なフィールド（beds24_book_id, status, check_in_date等）をチェック
  - 配列を返す

- **`sync_bookings_to_db(bookings, start_date, end_date, property_filter_id)`**
  - 取得した予約をDBに保存（create or update）
  - `room_id` と `beds24_property_key` 両方で施設をマッピング
  - キャンセル検知：DB内の対象期間の予約が API では消えていたら status='Cancelled' に更新
  - 最終同期時刻を SyncStatus.pk=1 に記録
  - counts dict を返す（created, updated, cancelled, missing_property）

**エラーハンドリ：**
- ネットワークエラー → `Beds24SyncError` 例外
- CSV ヘッダ不正 → `Beds24SyncError` 例外
- 施設未登録 → `missing_property_count` に加算（同期は続く）

### 2. `backend/reservations/management/commands/sync_bookings.py` (CLIコマンド)

```bash
python manage.py sync_bookings
```

**動作：**
1. 今日から365日後までをBeds24から取得
2. ヘルパー `fetch_beds24_bookings()` を呼び出し
3. ヘルパー `sync_bookings_to_db()` を呼び出し（property_filter_id なし = 全施設）
4. カウントを出力

### 3. `backend/guest_forms/views.py` → `Beds24SyncAPIView` (REST API)

```
POST /api/pricing/{property_id}/sync-beds24/
Content-Type: application/json

{
  "sync_type": "basic" | "calendar" | "all"
}
```

**レスポンス：**
```json
{
  "status": "synced",
  "sync_type": "basic",
  "property_id": 1,
  "property_name": "Villa Sakura",
  "created": 5,
  "updated": 3,
  "cancelled": 1,
  "missing_property": 0,
  "last_sync_time": "2025-12-12T10:30:00Z"
}
```

**動作：**
1. 指定 property_id の施設を取得
2. 今日から365日後をBeds24から取得
3. `sync_bookings_to_db()` を呼び出し（property_filter_id = property_id）
4. 該当施設の予約のみ同期
5. 最終同期時刻を返す

### 4. `backend/reservations/management/commands/import_past_bookings.py` (過去データインポート)

```bash
python manage.py import_past_bookings --start-date 2023-03-01 --end-date 2024-02-29
```

**動作：**
1. 指定期間のデータをBeds24から取得
2. Cancelled / Black / Declined を除外
3. ヘルパー経由でDB保存
4. 両キー（room_id, beds24_property_key）に対応

## 施設マッピング戦略

予約を施設に紐づけるため、2つのマッピング方式に対応：

| マッピング方式 | Field | 説明 |
|---|---|---|
| Room ID | Property.room_id | Beds24の room ID（数値） |
| Property Key | Property.beds24_property_key | Beds24の property key（文字列） |

**優先順位：** room_id を優先、なければ beds24_property_key を試行

## キャンセル検知

同期範囲内（start_date ～ end_date）の予約について：

```
DB内の Confirmed/New/Unknown の予約 - API取得した予約ID
= キャンセルされた予約
```

これらを status='Cancelled' に更新。

## テスト

### ユニットテスト

```bash
cd backend
python manage.py test reservations.tests -v 2
```

内容：
- CSV パース（ヘッダー正常化）
- ステータスフィルタ（excluded_statuses）

### インテグレーションテスト（手動）

1. **CLI 全施設同期：**
   ```bash
   python manage.py sync_bookings
   ```
   出力例：
   ```
   Processed 42 valid bookings from API.
   New: 15, Updated: 10, Cancelled: 3, Missing property: 2
   ```

2. **API 単一施設同期（curl）：**
   ```bash
   curl -X POST http://localhost:8000/api/pricing/1/sync-beds24/ \
     -H "Content-Type: application/json" \
     -d '{"sync_type":"basic"}'
   ```

3. **フロント（PricingManagement コンポーネント）：**
   - 「インポート・同期」タブ
   - 「Beds24との同期」セクション
   - 「同期開始」ボタン
   - レスポンスで最終同期時刻を表示

## トラブルシューティング

| 問題 | 原因 | 解決 |
|---|---|---|
| `Beds24SyncError: Missing required columns` | Beds24 API応答が想定ヘッダと異なる | カラム名エイリアスを追加 |
| `missing_property` が多い | room_id/beds24_property_key が設定されていない | 施設管理でこれらを入力 |
| `ImportError: django.utils.timezone` | Django インポート不正 | `from django.utils import timezone` を確認 |
| Beds24 API 403 | 認証情報不正 | .env の BEDS24_USERNAME / BEDS24_PASSWORD を確認 |

## 今後の拡張

- [ ] 価格設定の同期（sync_type="calendar"）
- [ ] リトライロジック（API rate limit 対応）
- [ ] スケジュール実行（celery ）
- [ ] 同期ログ記録（SyncLog モデル）
