# 料金カレンダーが何も表示されない問題 - 修正ガイド

## 問題
RateCalendar コンポーネントで `property_id: 7` のデータを読み込もうとしても、空配列が返される。

## 原因
`DailyRate` テーブルに該当する施設（property_id=7）のデータが存在していない。

## 解決方法

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
