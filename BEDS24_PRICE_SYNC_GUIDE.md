# Beds24料金同期ガイド

## 概要
Beds24から予約データ（料金を含む）を同期する方法を説明します。

## 現在の状況（2025-12-12時点）

### ✅ 完了事項
1. **Beds24施設の登録**: 7つの施設がデータベースに登録済み
   - 巴.com (room_id: 201018)
   - ONE PIECE HOUSE (room_id: 272797)
   - 巴.com プレミアムステイ (room_id: 482703)
   - 巴.com 5 Cafe&Stay (room_id: 500815)
   - 巴.com 3 (room_id: 369866)
   - Guest house 巴.com hakodate motomachi (room_id: 409489)
   - mimosa (room_id: 507685)

2. **予約データの同期**: 163件の予約が同期済み
   - 総売上: ¥6,803,445
   - 平均料金: ¥41,739
   - 料金が0の予約: 3件のみ

3. **2025年度の売上集計**: 
   - 期間: 2025年3月1日 ~ 2026年2月28日
   - 予約数: 98件
   - 総売上: ¥4,034,936

## 料金同期の仕組み

### 1. Beds24からのデータ取得
Beds24のCSV APIを使用して予約データを取得します。取得される料金情報：
- `total_price`: Beds24の'Price'フィールド（予約の合計金額）

### 2. データベースへの保存
`Reservation`モデルに以下のフィールドで保存されます：
- `total_price`: 予約の合計料金（DecimalField, 最大10桁、小数点以下2桁）

### 3. フロントエンドでの表示
以下のコンポーネントで料金が表示されます：
- **ReservationList.jsx**: 月別予約一覧（`¥{Number(res.total_price).toLocaleString()}`）
- **RevenueAnalysis.jsx**: 売上分析グラフ（月別集計、前年同月比）

## 同期コマンド

### 手動同期（CLI）
```bash
cd /workspaces/scorpion/backend
source venv/bin/activate
python manage.py sync_bookings
```

このコマンドは：
- 今日から365日間の予約データを取得
- 新規予約を作成、既存予約を更新
- キャンセルされた予約を検出

### 過去データのインポート
```bash
python manage.py import_past_bookings --start-date 2024-01-01 --end-date 2024-12-31
```

### API経由の同期
フロントエンドから施設ごとに同期可能：
```javascript
// frontend/src/services/pricingApi.js
await pricingApi.syncWithBeds24(propertyId, syncType);
```

## トラブルシューティング

### 料金が0と表示される場合

1. **Beds24データを確認**
   ```bash
   python manage.py shell
   >>> from reservations.services import fetch_beds24_bookings
   >>> from datetime import date, timedelta
   >>> bookings = fetch_beds24_bookings(date.today(), date.today() + timedelta(days=30))
   >>> print(bookings[0].get('total_price'))  # 料金が取得されているか確認
   ```

2. **データベースの料金を確認**
   ```bash
   python manage.py shell
   >>> from reservations.models import Reservation
   >>> r = Reservation.objects.first()
   >>> print(f"料金: {r.total_price}")
   ```

3. **料金が0の予約を調査**
   ```bash
   python manage.py shell
   >>> zero_price = Reservation.objects.filter(total_price=0)
   >>> for r in zero_price:
   >>>     print(f"ID: {r.id}, Beds24 ID: {r.beds24_book_id}, ゲスト: {r.guest_name}")
   ```

### 施設がマッピングされない場合

Beds24の`room_id`または`property_key`がデータベースの施設と一致しているか確認：

```bash
python manage.py shell
>>> from guest_forms.models import Property
>>> for p in Property.objects.all():
>>>     print(f"{p.name}: room_id={p.room_id}, key={p.beds24_property_key}")
```

必要に応じて、`create_beds24_properties`コマンドで施設を追加：

```bash
python manage.py create_beds24_properties
```

## APIエンドポイント

### 売上データ取得
```
GET /api/revenue/?year=2025&property_name=巴.com
```

レスポンス例：
```json
[
  {
    "date": "2025-12",
    "owned": 1000000,
    "managed": 500000,
    "total": 1500000
  }
]
```

### 月別予約リスト
```
GET /api/reservations/monthly/?year=2025&month=12
```

レスポンス例：
```json
[
  {
    "id": 1,
    "beds24_book_id": 65033730,
    "guest_name": "TSAI",
    "check_in_date": "2025-12-11",
    "total_price": "81600.00",
    "property_name": "巴.com"
  }
]
```

## データ検証

現在のデータベース状態を確認：

```bash
cd /workspaces/scorpion/backend
source venv/bin/activate
python manage.py shell << 'EOF'
from reservations.models import Reservation
from django.db.models import Sum, Count, Avg

stats = Reservation.objects.aggregate(
    total_reservations=Count('id'),
    total_revenue=Sum('total_price'),
    avg_price=Avg('total_price')
)

print(f"総予約数: {stats['total_reservations']}")
print(f"総売上: ¥{stats['total_revenue']:,.0f}")
print(f"平均料金: ¥{stats['avg_price']:,.0f}")
EOF
```

期待される出力（2025-12-12時点）:
```
総予約数: 163
総売上: ¥6,803,445
平均料金: ¥41,739
```

## 次のステップ

1. **定期同期の設定**: cronジョブまたはCeleryタスクで自動同期
2. **料金変更の履歴管理**: 料金が変更された場合の履歴追跡
3. **Slack通知**: 新規予約や料金変更時の通知
