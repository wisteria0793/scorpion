# Google Sheets API 連携ガイド

## 概要
このドキュメントは、Google Cloud Platform（GCP）の Sheets API を使用して、予約に対する宿泊者名簿の提出状況を管理する方法について説明しています。

## セットアップ手順

### 1. Google Cloud Platform（GCP）での設定

#### 1.1 GCP プロジェクトの作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（プロジェクト名: 「scorpion-gcp」など）
3. プロジェクトを選択

#### 1.2 Google Sheets API の有効化
1. 左側メニューから「API とサービス」 → 「ライブラリ」を選択
2. 「Google Sheets API」を検索して選択
3. 「有効にする」ボタンをクリック

#### 1.3 サービスアカウントの作成
1. 「API とサービス」 → 「認証情報」を選択
2. 「認証情報を作成」 → 「サービスアカウント」を選択
3. サービスアカウント名を入力（例: `scorpion-service`）
4. 「作成して続行」をクリック
5. 次のステップでロールを付与（推奨: `Editor` または `Sheets API ユーザー`）
6. サービスアカウントを作成

#### 1.4 サービスアカウントキーの生成
1. 作成したサービスアカウントの詳細ページを開く
2. 「キー」タブを選択
3. 「鍵を追加」 → 「新しい鍵を作成」
4. JSON 形式を選択して「作成」
5. JSON ファイルが自動ダウンロードされる

### 2. ローカル環境での設定

#### 2.1 環境変数の設定（`.env` ファイル）
```bash
# Google Cloud Platform - Sheets API
GOOGLE_SHEETS_CREDENTIALS_FILE="/path/to/service-account-credentials.json"
GOOGLE_SHEETS_SPREADSHEET_ID="your-spreadsheet-id-here"
```

**認証情報ファイルの準備:**
1. GCP コンソールでダウンロードした JSON ファイルを安全な場所に配置
2. 例: `backend/credentials/service-account-key.json`
3. `.env` でファイルパスを指定
4. **.gitignore に認証情報ファイルを追加**:
   ```
   credentials/
   **/service-account-*.json
   ```

#### 2.2 Google Sheet の作成と初期化
1. [Google Sheets](https://sheets.google.com) で新しいスプレッドシートを作成
2. 最初のシート名を `予約情報` に変更
3. 以下のヘッダー行を A1 から J1 に入力:
   - `Beds24予約ID`
   - `施設名`
   - `ゲスト名`
   - `メールアドレス`
   - `チェックイン日`
   - `チェックアウト日`
   - `宿泊者数`
   - `名簿提出状況`
   - `合計料金`
   - `作成日時`

4. シートの URL から ID を取得
   - URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
   - `{SPREADSHEET_ID}` をコピーして `.env` ファイルに設定

### 3. 施設情報での Google Sheet URL 設定
1. 管理画面 (`/admin/`) にアクセス
2. 「施設」セクションで対象の施設を編集
3. 「Google Sheets URL」フィールドにシートの完全 URL を入力
   - 例: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
4. 保存

## API エンドポイント

### 1. 名簿提出状況の確認
**エンドポイント:** `GET /api/reservations/roster-status/`

**クエリパラメータ:**
- `property_id` (optional): 施設 ID
- `status` (optional): フィルタリング対象のステータス（`pending`, `submitted`, `verified`）

**レスポンス例:**
```json
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "beds24_book_id": 12345,
      "property": {
        "id": 1,
        "name": "Guest House Tomoe",
        "slug": "guest-house-tomoe"
      },
      "guest_name": "Taro Yamada",
      "guest_email": "taro@example.com",
      "check_in_date": "2025-12-20",
      "check_out_date": "2025-12-23",
      "num_guests": 2,
      "total_price": 45000.0,
      "roster_status": "pending",
      "submission": {
        "id": 1,
        "token": "550e8400-e29b-41d4-a716-446655440000",
        "status": "pending",
        "submitted_at": null
      },
      "created_at": "2025-12-10T15:30:00Z"
    }
  ]
}
```

### 2. 名簿提出状況の統計
**エンドポイント:** `GET /api/reservations/roster-stats/`

**レスポンス例:**
```json
{
  "guest-house-tomoe": {
    "property_id": 1,
    "property_name": "Guest House Tomoe",
    "total": 10,
    "pending": 3,
    "submitted": 4,
    "verified": 3,
    "completion_rate": 70.0
  }
}
```

### 3. 提出待ちの予約一覧
**エンドポイント:** `GET /api/reservations/pending-rosters/`

**クエリパラメータ:**
- `property_id` (optional): 施設 ID
- `days_ahead` (optional): 対象日数（デフォルト: 3日）

**レスポンス例:**
```json
{
  "count": 2,
  "date_range": {
    "from": "2025-12-13",
    "to": "2025-12-16"
  },
  "results": [
    {
      "id": 1,
      "beds24_book_id": 12345,
      "property": {
        "id": 1,
        "name": "Guest House Tomoe"
      },
      "guest_name": "Taro Yamada",
      "guest_email": "taro@example.com",
      "check_in_date": "2025-12-15",
      "num_guests": 2,
      "days_until_checkin": 2,
      "submission_form_url": "https://your-domain.com/submit-roster/550e8400-e29b-41d4-a716-446655440000/"
    }
  ]
}
```

## Python での使用例

### Google Sheets Service の利用

```python
from guest_forms.google_sheets_service import google_sheets_service

# サービスが設定されているか確認
if google_sheets_service.is_configured():
    # 新しい予約をシートに追加
    reservation_data = {
        'beds24_book_id': 12345,
        'property_name': 'Guest House Tomoe',
        'guest_name': 'Taro Yamada',
        'guest_email': 'taro@example.com',
        'check_in_date': '2025-12-20',
        'check_out_date': '2025-12-23',
        'num_guests': 2,
        'roster_status': 'pending',
        'total_price': 45000.00,
        'created_at': datetime.now().isoformat(),
    }
    
    success = google_sheets_service.append_reservation(reservation_data)
    
    # 名簿提出状況を更新
    google_sheets_service.update_roster_status(12345, 'submitted')
## 定期実行の設定

Google Sheets への同期は、既存の **Beds24 予約同期コマンド** と統合されています。

### 自動同期のフロー

```
┌──────────────────┐
│  Beds24 API      │
└────────┬─────────┘
         │ (予約データを取得)
         ▼
┌──────────────────────────────┐
│ sync_bookings コマンド実行     │
└────────┬─────────────────────┘
         │ 1. Beds24 → DB に同期
         ▼
┌──────────────────────────────┐
│ Django DB (Reservation)      │
└────────┬─────────────────────┘
         │ 2. 新規予約を検出
         ▼
┌──────────────────────────────┐
│ Google Sheets API            │
└────────┬─────────────────────┘
         │ 3. 自動的に追加
         ▼
┌──────────────────────────────┐
│ Google Sheets (各施設)       │
└──────────────────────────────┘
```

### コマンド実行

**手動実行:**
```bash
# 全予約を同期（今日から365日分）
python manage.py sync_bookings

# 同期期間をカスタマイズ
python manage.py sync_bookings --days 30
```

### 定期実行の設定

#### 方法1: cron + venv（単純・推奨）

1. **crontab エディタを開く**
   ```bash
   crontab -e
   ```

2. **30分ごとに実行するよう設定**
   ```bash
   */30 * * * * cd /srv/scorpion/backend && /path/to/venv/bin/python manage.py sync_bookings >> /var/log/scorpion/sync_bookings.log 2>&1
   ```

   - `/path/to/venv`: Python 仮想環境のパス
   - `/srv/scorpion/backend`: プロジェクトルート
   - `/var/log/scorpion/sync_bookings.log`: ログ出力先

3. **ログの確認**
   ```bash
   tail -f /var/log/scorpion/sync_bookings.log
   ```

#### 方法2: Docker Compose + host cron

1. **crontab エディタを開く**
   ```bash
   crontab -e
   ```

2. **30分ごとに実行**
   ```bash
   */30 * * * * cd /srv/scorpion && docker compose exec -T web python manage.py sync_bookings >> /var/log/scorpion/sync_bookings.log 2>&1
   ```

   - `docker compose` のディレクトリから実行
   - `-T` フラグで疑似 TTY を無効化（cron 環境では必須）

3. **ログの確認**
   ```bash
   tail -f /var/log/scorpion/sync_bookings.log
   ```

#### 方法3: systemd timer（より堅牢・推奨・本番向け）

1. **サービスファイルを作成**
   ```bash
   sudo nano /etc/systemd/system/scorpion-sync-bookings.service
   ```

   ```ini
   [Unit]
   Description=Scorpion Beds24 Sync and Google Sheets Integration
   After=network.target
   
   [Service]
   Type=oneshot
   ExecStart=/path/to/venv/bin/python /srv/scorpion/backend/manage.py sync_bookings
   WorkingDirectory=/srv/scorpion/backend
   StandardOutput=journal
   StandardError=journal
   User=www-data
   Group=www-data
   ```

2. **タイマーファイルを作成**
   ```bash
   sudo nano /etc/systemd/system/scorpion-sync-bookings.timer
   ```

   ```ini
   [Unit]
   Description=Scorpion Beds24 Sync Timer (30 min intervals)
   
   [Timer]
   OnBootSec=5min
   OnUnitActiveSec=30min
   Persistent=true
   
   [Install]
   WantedBy=timers.target
   ```

3. **有効化と確認**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable scorpion-sync-bookings.timer
   sudo systemctl start scorpion-sync-bookings.timer
   
   # ステータス確認
   sudo systemctl status scorpion-sync-bookings.timer
   sudo journalctl -u scorpion-sync-bookings -f
   ```

### トラブルシューティング

**ログが出力されない場合:**
```bash
# cron の実行ログを確認
grep CRON /var/log/syslog

# systemd の場合
journalctl -u scorpion-sync-bookings -n 50
```

**エラーが頻発する場合:**
- Django 設定 (`DEBUG=False` など) を確認
- 環境変数（`.env` など）が正しく読み込まれているか確認
- データベース接続を確認

## トラブルシューティング

### Google Sheets API が応答しない
- `.env` ファイルの認証情報が正しいか確認
- GCP コンソールで API が有効になっているか確認
- サービスアカウントに Sheets API の権限があるか確認

### シートに行が追加されない
- スプレッドシートが共有設定になっているか確認（サービスアカウントメールアドレス）
- シート名が `予約情報` であるか確認
- 列の数と順序が正しいか確認

### 認証エラー
- JSON 認証情報が正しくフォーマットされているか確認
- JSON ファイルに改行や特殊文字が含まれていないか確認

## セキュリティに関する注意

1. **認証情報の管理**
   - `.env` ファイルを `.gitignore` に追加
   - サービスアカウントキーを VCS に commit しない
   - サービスアカウントキーは安全に保管

2. **アクセス権限の設定**
   - サービスアカウントには最小限の権限を付与（Sheets API のみ）
   - スプレッドシートは必要な人のみアクセス可能に設定

3. **監査ログの確認**
   - GCP コンソールで API アクセスログを確認
   - 異常なアクティビティがないか定期的にチェック

## 今後の改善案

1. ✓ Beds24 同期時に自動的に Sheets を更新
2. チェックイン前のゲストへの自動リマインダー送信
3. Sheets の更新をトリガーとした通知機能（Slack など）
4. Google Forms との統合
5. データ分析ダッシュボード化（Google Data Studio など）

## 参考リンク

- [Google Sheets API ドキュメント](https://developers.google.com/sheets/api)
- [Google Cloud Platform Console](https://console.cloud.google.com/)
- [サービスアカウント認証](https://cloud.google.com/docs/authentication/application-default-credentials)
- [systemd timer リファレンス](https://www.freedesktop.org/software/systemd/man/systemd.timer.html)
