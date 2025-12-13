# 料金カレンダー - 実装ガイド

## Beds24 API 連携（推奨）

### 概要
Beds24のAPI（JSON/CSV両対応）と連携し、日別料金を自動同期します。
- **JSON API**: `getDailyPriceSetup` - 構造化データ、詳細情報
- **CSV API**: `getroomdailycsv` - シンプル、高速（推奨）

### 前提条件
1. Beds24アカウントとAPIキーの取得
2. 各施設の `beds24_property_key` と `room_id` を設定

### 設定手順

#### 1. 環境変数の設定
`.env` ファイルに以下を追加：
```bash
BEDS24_API_KEY="your_api_key_here"
BEDS24_USERNAME="your_username"
BEDS24_PASSWORD="your_password"
# または
BEDS24_ACCOUNT_ID="your_account_id"
```

#### 2. 施設情報の登録
Django Adminで各施設に以下を設定：
- `beds24_property_key`: Beds24の施設識別子（propKey）
- `room_id`: Beds24の部屋ID（オプション）

#### 3. 料金データの同期
```bash
cd /workspaces/scorpion/backend

# CSV API使用（推奨）
python manage.py sync_rates_from_beds24 --use-csv --days 90

# JSON API使用
python manage.py sync_rates_from_beds24 --days 90

# 特定施設のみ同期（CSV）
python manage.py sync_rates_from_beds24 --use-csv --property-id 7 --days 30

# 日付範囲を指定（CSV）
python manage.py sync_rates_from_beds24 --use-csv --property-id 7 --start 2025-12-01 --end 2025-12-31

# roomIdを明示的に指定（CSV）
python manage.py sync_rates_from_beds24 --use-csv --property-id 7 --room-id 123456 --days 30
```

### 定期同期（推奨）
Cron または Render/Vercel のスケジュール機能で毎日実行：
```bash
0 3 * * * cd /path/to/backend && python manage.py sync_rates_from_beds24 --use-csv --days 90
```

### CSV vs JSON API 比較

| 項目 | CSV API | JSON API |
|------|---------|----------|
| エンドポイント | `getroomdailycsv` | `getDailyPriceSetup` |
| データ形式 | CSV（テキスト） | JSON（構造化） |
| 速度 | 高速 | 通常 |
| データ量 | 軽量 | 重い |
| パラメータ | GET（シンプル） | POST（複雑） |
| 推奨用途 | 大量データ・定期同期 | 詳細情報が必要な場合 |
| コマンド | `--use-csv` フラグ | デフォルト |

---

## 手動データ作成（テスト用）

### 問題
RateCalendar コンポーネントで `property_id: 7` のデータを読み込もうとしても、空配列が返される。

### 原因
`DailyRate` テーブルに該当する施設（property_id=7）のデータが存在していない。

### 解決方法

### 方法1: すべての施設にデータを一括作成（推奨）

```bash
cd /workspaces/scorpion/backend

python manage.py shell << 'EOF'
from datetime import date, timedelta
from decimal import Decimal
from guest_forms.models import Property
from reservations.models_pricing import DailyRate

print("=== Creating DailyRate data for all properties ===\n")

# すべての施設を取得
properties = Property.objects.all()

for prop in properties:
    print(f"Creating data for {prop.name} (ID: {prop.id})...")
    
    # 2025年全体のデータを作成
    start_date = date(2025, 1, 1)
    end_date = date(2025, 12, 31)
    
    current = start_date
    created_count = 0
    
    while current <= end_date:
        weekday = current.weekday()
        
        # 曜日に応じた基本料金
        if weekday >= 4:  # 金・土
            base_price = Decimal('15000')
            min_stay = 2
        elif weekday == 6:  # 日曜
            base_price = Decimal('12000')
            min_stay = 1
        else:  # 平日
            base_price = Decimal('8000')
            min_stay = 1
        
        # 年末年始は高く
        if (current.month == 12 and current.day >= 28) or (current.month == 1 and current.day <= 3):
            base_price = Decimal('25000')
        
        obj, created = DailyRate.objects.update_or_create(
            property=prop,
            date=current,
            defaults={
                'base_price': base_price,
                'available': True,
                'min_stay': min_stay,
            }
        )
        
        if created:
            created_count += 1
        
        current += timedelta(days=1)
    
    print(f"  ✅ Created {created_count} records\n")

# 結果確認
print("=== Verification ===")
for prop in Property.objects.all():
    count = DailyRate.objects.filter(property_id=prop.id).count()
    print(f"  {prop.name} (ID: {prop.id}): {count} rates")

print(f"\n✅ Total DailyRate records: {DailyRate.objects.count()}")
EOF
```

### 方法2: 管理コマンドを使用

特定の施設のみにデータを追加したい場合：

```bash
# property_id=7 に365日分のデータを作成
python manage.py create_sample_rates --property-id 7 --days 365

# すべての施設に90日分のデータを作成
python manage.py create_sample_rates --days 90
```

## 確認方法

### 1. Django Admin で確認
```
http://localhost:8000/admin/reservations/dailyrate/
```

### 2. API で確認

```bash
# property_id=7 の2025-11-30～2025-12-30のデータを確認
curl "http://localhost:8000/api/daily-rates/?property_id=7&start_date=2025-11-30&end_date=2025-12-30"

# すべての施設のデータを確認
curl "http://localhost:8000/api/properties/" | python -m json.tool
```

### 3. RateCalendar UI で確認
- ブラウザで http://localhost:5173 を開く
- 左メニューから「料金カレンダー」を選択
- 施設ドロップダウンで property_id=7 を選択
- 月を切り替えて料金が表示されることを確認

## トラブルシューティング

### 問題: データ作成後も空配列が返される

1. **キャッシュをクリア**
   ```bash
   # フロントエンドをリロード（Ctrl+Shift+R で強制リロード）
   # または開発ツール > ネットワーク > キャッシュを無視する を有効にする
   ```

2. **API が正常に動作しているか確認**
   ```bash
   curl "http://localhost:8000/api/daily-rates/?property_id=7&start_date=2025-12-01&end_date=2025-12-31" -v
   ```

3. **Django サーバーを再起動**
   ```bash
   # 既存のサーバーを停止
   pkill -f "python manage.py runserver"
   
   # サーバーを再起動
   cd /workspaces/scorpion/backend
   python manage.py runserver
   ```

### 問題: フロントエンド側でエラーが表示される

ブラウザの開発者ツール（F12）> コンソール タブで:
- `Loading rates with params:` のメッセージを確認
- API のレスポンスステータス（200 OK か、エラーコードか）を確認
- network タブで実際の API リクエスト/レスポンスを確認

## API 認証について

DailyRate API エンドポイント (`/api/daily-rates/`) は `AllowAny` に設定されているため、認証なしでアクセス可能です。

もし 401 Unauthorized が返される場合は、[backend/reservations/views.py](../backend/reservations/views.py) で以下を確認してください：

```python
class DailyRateViewSet(ModelViewSet):
    permission_classes = [permissions.AllowAny]  # ← この行が必須
```

---

## 実装詳細

### ファイル構成
- **API設定**: [backend/api/settings.py](backend/api/settings.py) - Beds24認証情報
- **サービス層**: [backend/reservations/services_pricing.py](backend/reservations/services_pricing.py)
    - `fetch_beds24_daily_price_setup()` - Beds24 JSON API呼び出し
    - `fetch_beds24_room_daily_csv()` - Beds24 CSV API呼び出し
    - `sync_daily_rates_from_beds24()` - JSON → DailyRateへ同期
    - `sync_daily_rates_from_beds24_csv()` - CSV → DailyRateへ同期
- **管理コマンド**: [backend/reservations/management/commands/sync_rates_from_beds24.py](backend/reservations/management/commands/sync_rates_from_beds24.py)
- **モデル**: [backend/reservations/models_pricing.py](backend/reservations/models_pricing.py) - DailyRateモデル定義

### Beds24 JSON APIペイロード構造
```json
{
  "authentication": {
    "apiKey": "...",
    "username": "...",
    "password": "..."
  },
  "dailyPriceSetup": {
    "propKey": "property_key",
    "roomId": 123456,
    "fromDate": "2025-12-01",
    "toDate": "2025-12-31"
  }
}
```

### Beds24 CSV APIパラメータ
```
GET https://www.beds24.com/api/csv/getroomdailycsv?
    apiKey=xxx&
    username=xxx&
    password=xxx&
    propKey=xxx&
    roomId=123&
    startDate=20251201&
    endDate=20251231
```

**CSVフォーマット例**:
```csv
date,price,minStay,available
2025-12-01,8000,1,1
2025-12-02,8000,1,1
2025-12-05,15000,2,1
...
```

### レスポンスマッピング
| Beds24フィールド | DailyRateフィールド | 備考 | 対応形式 |
|-----------------|-------------------|------|----|
| `date` / `day` | `date` | 日付 | JSON/CSV |
| `price` / `basePrice` | `base_price` | 1泊料金 | JSON/CSV |
| `minStay` / `minstay` | `min_stay` | 最小宿泊数 | JSON/CSV |
| `available` / `status` | `available` | 予約可否 | JSON/CSV |
| (全体) | `beds24_data` | 元データを保存 | JSON/CSV |

---

## 更新履歴

### 2025-12-13
- ✅ Beds24 CSV API (getroomdailycsv) 連携を追加
- ✅ --use-csv フラグでJSON/CSV切り替え可能に
- ✅ CSV柔軟パース（カラム名の差異を吸収）
- ✅ Beds24 getDailyPriceSetup API連携を追加
- ✅ propKey/roomId対応
- ✅ 認証方式の柔軟化（USERNAME/PASSWORD または ACCOUNT_ID）
- ✅ 管理コマンド `sync_rates_from_beds24` 実装
- ✅ DailyRateモデルへの自動同期機能

### 2025-12-12
- ✅ DailyRateViewSet に AllowAny permission 設定
- ✅ property_id=7 のテストデータ作成
- ✅ RateCalendar コンポーネントのデバッグログ追加
