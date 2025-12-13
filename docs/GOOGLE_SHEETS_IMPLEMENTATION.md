# Google Sheets API 統合実装概要

## 実装完了内容

Google Cloud Platform（GCP）の Sheets API を統合し、予約情報と宿泊者名簿の提出状況を管理できるようにしました。

### 1. 環境設定

**ファイル: `.env`**
- `GOOGLE_SHEETS_API_CREDENTIALS_JSON`: GCP サービスアカウント認証情報（JSON 形式）
- `GOOGLE_SHEETS_SPREADSHEET_ID`: 管理用 Google Sheets の ID

**ファイル: `requirements.txt`**
- Google Sheets API 関連ライブラリを追加
  - google-auth==2.25.2
  - google-auth-oauthlib==1.2.0
  - google-auth-httplib2==0.2.0
  - google-api-python-client==2.100.0

### 2. データモデル

**ファイル: `guest_forms/models.py`**
- `Property` モデルに `google_sheets_id` フィールドを追加
  - 施設ごとに別の Google Sheet を管理する場合に使用
  - Migration: `0011_property_google_sheets_id.py`

### 3. Google Sheets サービス

**ファイル: `guest_forms/google_sheets_service.py`**
- `GoogleSheetsService` クラスを実装
- 主な機能:
  - `append_reservation()`: 新しい予約をシートに追加
  - `update_roster_status()`: 名簿提出状況を更新
  - `get_all_reservations()`: 全予約を取得
  - `get_pending_rosters()`: 提出待ちの予約を取得
  - `create_header_row()`: ヘッダー行を初期化

### 4. API エンドポイント

**ファイル: `reservations/views.py`**

#### 4.1 名簿提出状況一覧
```
GET /api/reservations/roster-status/?property_id=1&status=pending
```
- 予約情報と名簿提出状況を一覧表示
- フィルタリング: 施設、ステータス

#### 4.2 提出状況の統計
```
GET /api/reservations/roster-stats/
```
- 施設ごとの提出完了率を表示
- パラメータ: なし

#### 4.3 提出待ちの予約
```
GET /api/reservations/pending-rosters/?property_id=1&days_ahead=3
```
- 近日のチェックインで名簿未提出の予約を表示
- パラメータ:
  - `property_id`: 施設 ID（optional）
  - `days_ahead`: 対象日数（デフォルト: 3日）

### 5. 管理コマンド

**ファイル: `guest_forms/management/commands/sync_google_sheets.py`**

#### 5.1 ヘッダー行の初期化
```bash
python manage.py sync_google_sheets --init-headers
```

#### 5.2 特定施設の同期
```bash
python manage.py sync_google_sheets --property 1
```

#### 5.3 全施設の同期
```bash
python manage.py sync_google_sheets --all
```

### 6. Beds24 との自動同期

**ファイル: `reservations/services.py`**
- `sync_reservation_to_google_sheets()` 関数を追加
- Beds24 同期時に新規予約が自動的に Google Sheets に追加される

### 7. URL ルーティング

**ファイル: `reservations/urls.py`**
```python
path('roster-status/', views.RosterSubmissionStatusView.as_view(), name='roster-status'),
path('roster-stats/', views.RosterSubmissionStatsView.as_view(), name='roster-stats'),
path('pending-rosters/', views.PendingRostersView.as_view(), name='pending-rosters'),
```

## セットアップガイド

詳細は [docs/GOOGLE_SHEETS_API_GUIDE.md](../GOOGLE_SHEETS_API_GUIDE.md) を参照してください。

## 機能概要

### 予約管理の自動化
1. Beds24 から予約データを取得
2. データベースに保存
3. **自動的に Google Sheets に追加**
4. スタッフが名簿提出状況を確認
5. 提出完了時に自動更新

### スタッフ向けダッシュボード
- 施設ごとの提出状況を可視化
- 提出待ちの予約を一覧表示
- ゲストへの通知リンク（フォーム URL）を提供

### データの一元管理
- データベース: 運用データの管理
- Google Sheets: ステークホルダー向けレポーティング
- API: アプリケーション間のデータ連携

## 実装上の注意点

### パフォーマンス
- Google Sheets API には Rate Limit があります
- 大量の予約を一度に同期する場合は管理コマンドを使用
- リアルタイム更新が必要な場合は非同期タスク（Celery）の実装を検討

### セキュリティ
- サービスアカウントキーは .gitignore に記載
- 環境変数で認証情報を管理
- スプレッドシートへのアクセス権は限定

### トラブルシューティング
- 認証エラー: .env ファイルの設定を確認
- API 呼び出し失敗: GCP コンソールで API が有効か確認
- ログ: Django ログで詳細を確認

## 今後の拡張案

1. **自動リマインダー**
   - チェックイン前日に未提出のゲストに自動メール送信

2. **Google Forms との統合**
   - Google Forms を名簿提出フォームとして使用
   - 回答が自動的に Sheets に記録される

3. **スケジュール同期**
   - Celery Task を使用した定期同期
   - 毎日特定の時間に自動実行

4. **通知システム**
   - Sheets の更新をトリガーに Webhook 発火
   - Slack への通知連携

5. **分析レポート**
   - Google Data Studio との連携
   - 提出率、遅延率などの分析

## テスト方法

### ローカル開発での検証

```python
# Django Shell で確認
python manage.py shell

# Google Sheets API 接続確認
from guest_forms.google_sheets_service import google_sheets_service
print(google_sheets_service.is_configured())

# テストデータを追加
reservation_data = {
    'beds24_book_id': 99999,
    'property_name': 'Test Property',
    'guest_name': 'Test Guest',
    'guest_email': 'test@example.com',
    'check_in_date': '2025-12-20',
    'check_out_date': '2025-12-23',
    'num_guests': 2,
    'roster_status': 'pending',
    'total_price': 45000.00,
    'created_at': '2025-12-13T00:00:00Z',
}

success = google_sheets_service.append_reservation(reservation_data)
print(f"Added: {success}")
```

## 参考リソース

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Service Account Authentication](https://cloud.google.com/docs/authentication/service-accounts)
- [Django REST Framework](https://www.django-rest-framework.org/)
