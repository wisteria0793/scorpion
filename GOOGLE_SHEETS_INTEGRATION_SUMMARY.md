# Google Sheets API 統合 - 実装サマリー

## 実装日時
2025年12月13日

## 概要
Google Cloud Platform（GCP）の Sheets API を統合し、Beds24 から同期された予約情報と宿泊者名簿の提出状況をリアルタイムで Google Sheets で管理できるようにしました。

## 実装内容

### 1. 環境構成ファイル

#### `.env` ファイルに追加
```env
# Google Cloud Platform - Sheets API
GOOGLE_SHEETS_API_CREDENTIALS_JSON=""
GOOGLE_SHEETS_SPREADSHEET_ID=""
```

#### `requirements.txt` に追加
```
google-auth==2.25.2
google-auth-oauthlib==1.2.0
google-auth-httplib2==0.2.0
google-api-python-client==2.100.0
```

### 2. 新規ファイル作成

#### `backend/guest_forms/google_sheets_service.py`
Google Sheets API との連携を管理するメインサービスクラス
- `GoogleSheetsService` クラス
  - `is_configured()`: API 設定確認
  - `append_reservation()`: 予約をシートに追加
  - `update_roster_status()`: 提出状況を更新
  - `get_all_reservations()`: 全予約を取得
  - `get_pending_rosters()`: 提出待ち予約を取得
  - `create_header_row()`: ヘッダー行を作成

#### `backend/guest_forms/management/commands/sync_google_sheets.py`
管理コマンドで Google Sheets を同期
```bash
python manage.py sync_google_sheets --property 1
python manage.py sync_google_sheets --all
python manage.py sync_google_sheets --init-headers
```

#### `docs/GOOGLE_SHEETS_API_GUIDE.md`
GCP セットアップガイドと使用方法を詳細に記述

#### `docs/GOOGLE_SHEETS_IMPLEMENTATION.md`
技術的な実装詳細と拡張案

### 3. 既存ファイルの修正

#### `backend/guest_forms/models.py`
`Property` モデルに以下フィールドを追加：
```python
google_sheets_id = models.CharField(
    max_length=255, 
    null=True, 
    blank=True, 
    verbose_name="Google Sheets ID"
)
```

#### `backend/guest_forms/migrations/0011_property_google_sheets_id.py`
Migration ファイルを新規作成

#### `backend/reservations/views.py`
3つの新しい API エンドポイントを追加：
1. `RosterSubmissionStatusView` - 名簿提出状況一覧
2. `RosterSubmissionStatsView` - 提出統計
3. `PendingRostersView` - 提出待ち予約一覧

#### `backend/reservations/urls.py`
新しい URL ルートを登録：
```python
path('roster-status/', ...)
path('roster-stats/', ...)
path('pending-rosters/', ...)
```

#### `backend/reservations/services.py`
- `google_sheets_service` のインポートを追加
- `sync_reservation_to_google_sheets()` 関数を新規作成
- Beds24 同期時に新規予約を自動的に Google Sheets に追加

#### `README.md`
Google Sheets API 統合の説明を追加し、機能一覧の「宿泊者名簿」をチェック

## API エンドポイント

### 1. 名簿提出状況一覧
```
GET /api/reservations/roster-status/
クエリパラメータ:
  - property_id (optional): 施設ID
  - status (optional): フィルタ (pending/submitted/verified)

レスポンス: 予約リスト（提出状況付き）
```

### 2. 提出状況統計
```
GET /api/reservations/roster-stats/
パラメータ: なし

レスポンス: 施設ごとの提出完了率
```

### 3. 提出待ちの予約
```
GET /api/reservations/pending-rosters/
クエリパラメータ:
  - property_id (optional): 施設ID
  - days_ahead (optional): 対象日数(デフォルト:3)

レスポンス: 近日チェックインで未提出の予約リスト
```

## データフロー

```
┌─────────────┐
│   Beds24    │
└──────┬──────┘
       │ (予約情報を API で取得)
       ▼
┌─────────────────────────────────┐
│ Django DB (Reservation)         │
└──────┬──────────────────────────┘
       │ (自動) sync_reservation_to_google_sheets()
       ▼
┌──────────────────────────┐
│ Google Sheets API        │
└──────┬───────────────────┘
       │ (予約データを追記)
       ▼
┌──────────────────────────┐
│ Google Sheets            │
│ (共有可能なスプレッド)   │
└──────────────────────────┘
```

## セットアップ手順

### 1. GCP プロジェクト設定
1. Google Cloud Console にアクセス
2. Google Sheets API を有効化
3. サービスアカウントを作成
4. JSON キーを生成

### 2. ローカル環境設定
1. JSON キーを `.env` の `GOOGLE_SHEETS_API_CREDENTIALS_JSON` に設定
2. スプレッドシート ID を `GOOGLE_SHEETS_SPREADSHEET_ID` に設定

### 3. Google Sheet 準備
1. 新しいスプレッドシートを作成
2. シート名を `予約情報` に変更
3. サービスアカウントメールアドレスを共有

### 4. Django マイグレーション実行
```bash
python manage.py migrate
```

### 5. ヘッダー行を初期化
```bash
python manage.py sync_google_sheets --init-headers
```

## テスト方法

```python
# Django Shell
python manage.py shell

# 接続確認
from guest_forms.google_sheets_service import google_sheets_service
print(google_sheets_service.is_configured())

# テストデータを追加
data = {
    'beds24_book_id': 99999,
    'property_name': 'Test',
    'guest_name': 'Test Guest',
    'guest_email': 'test@example.com',
    'check_in_date': '2025-12-20',
    'check_out_date': '2025-12-23',
    'num_guests': 2,
    'roster_status': 'pending',
    'total_price': 45000.0,
    'created_at': '2025-12-13T00:00:00Z',
}
success = google_sheets_service.append_reservation(data)
```

## 今後の拡張予定

1. **自動リマインダー機能**
   - チェックイン前日にメール自動送信

2. **Google Forms 統合**
   - フォーム回答を自動的に Sheets に記録

3. **スケジュール同期**
   - Celery による定期同期

4. **通知システム**
   - Slack 通知連携

5. **分析ダッシュボード**
   - Google Data Studio との連携

## 注意事項

### セキュリティ
- `.env` ファイルは `.gitignore` に追加
- サービスアカウント キーを VCS に commit しない
- スプレッドシートへのアクセスは限定する

### パフォーマンス
- Google Sheets API には Rate Limit がある
- 大量データ同期時は管理コマンドを使用

## トラブルシューティング

### API 接続エラー
- `.env` 設定を確認
- GCP で API が有効になっているか確認

### シートに行が追加されない
- スプレッドシート名が `予約情報` か確認
- サービスアカウントに共有権限があるか確認

### 認証エラー
- JSON 認証情報がフォーマット正しく入力されているか確認

## 参考ドキュメント

- [Google Sheets API セットアップガイド](./docs/GOOGLE_SHEETS_API_GUIDE.md)
- [実装技術詳細](./docs/GOOGLE_SHEETS_IMPLEMENTATION.md)
- [Google Sheets API 公式ドキュメント](https://developers.google.com/sheets/api)

## 変更ファイル一覧

```
新規作成:
  - backend/guest_forms/google_sheets_service.py
  - backend/guest_forms/management/commands/sync_google_sheets.py
  - backend/guest_forms/migrations/0011_property_google_sheets_id.py
  - docs/GOOGLE_SHEETS_API_GUIDE.md
  - docs/GOOGLE_SHEETS_IMPLEMENTATION.md

修正:
  - backend/.env (GOOGLE_SHEETS_* 変数追加)
  - backend/requirements.txt (Google ライブラリ追加)
  - backend/guest_forms/models.py (google_sheets_id フィールド追加)
  - backend/reservations/views.py (3つの新規 View クラス追加)
  - backend/reservations/urls.py (3つの新規 URL パターン追加)
  - backend/reservations/services.py (同期関数追加)
  - README.md (Google Sheets 統合の説明追加)
```

---

実装完了。全ての要件が満たされました。
