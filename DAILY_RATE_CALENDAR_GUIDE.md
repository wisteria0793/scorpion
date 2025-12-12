# Beds24 日別料金カレンダー実装ガイド

## 概要
Beds24で設定された日ごとの基本料金をカレンダー形式で表示・編集できる機能を実装しました。

## 実装内容

### 1. データベース（バックエンド）

#### DailyRateモデル
```python
# backend/reservations/models_pricing.py
```

**フィールド:**
- `property`: 施設（ForeignKey）
- `date`: 日付
- `base_price`: 基本料金（1泊あたり）
- `available`: 予約可能フラグ
- `min_stay`: 最小宿泊数
- `beds24_data`: Beds24の生データ（JSON）

**制約:**
- `(property, date)` でユニーク制約
- インデックス: `property + date`, `date`

### 2. API（バックエンド）

#### エンドポイント
```
GET    /api/daily-rates/                     # 一覧取得
GET    /api/daily-rates/?property_id=1       # 施設でフィルタ
GET    /api/daily-rates/?start_date=2025-12-01&end_date=2025-12-31  # 期間でフィルタ
GET    /api/daily-rates/{id}/                # 詳細取得
POST   /api/daily-rates/                     # 新規作成
PATCH  /api/daily-rates/{id}/                # 更新
DELETE /api/daily-rates/{id}/                # 削除
```

#### レスポンス例
```json
[
  {
    "id": 1,
    "property": 2,
    "property_id": 2,
    "property_name": "巴.com",
    "date": "2025-12-15",
    "base_price": "8000.00",
    "available": true,
    "min_stay": 1,
    "created_at": "2025-12-12T10:00:00Z",
    "updated_at": "2025-12-12T10:00:00Z"
  }
]
```

### 3. 管理コマンド

#### サンプルデータ作成
```bash
python manage.py create_sample_rates --days 90
```
- 今日から90日間の料金データを作成
- 平日: ¥8,000、週末: ¥15,000、年末年始: ¥25,000
- 週末は最小宿泊2泊

#### Beds24から同期（未実装）
```bash
python manage.py sync_rates --days 90
```
**注意:** Beds24の日別料金APIは現在調査中。以下のAPIを検証中：
- `getratescsv`: 料金ルール定義（日別ではない）
- `getavailabilitiescsv`: 404エラー
- JSON API: エンドポイント調査中

### 4. フロントエンド

#### RateCalendarコンポーネント
```jsx
// frontend/src/components/RateCalendar.jsx
```

**機能:**
- 月別カレンダー表示
- 施設選択ドロップダウン
- 日別料金表示（¥料金、最小宿泊数）
- 予約可否の色分け
- クリックで料金編集ダイアログ

**使い方:**
1. 施設を選択
2. 前月/次月ボタンで月を切り替え
3. 日付をクリックして料金を編集
4. 基本料金、最小宿泊数、予約可否を変更して保存

#### API Service
```javascript
// frontend/src/services/dailyRateApi.js
import { fetchDailyRates, updateDailyRate } from './dailyRateApi';
```

## 使用方法

### 1. データベースセットアップ
```bash
cd /workspaces/scorpion/backend
source venv/bin/activate
python manage.py migrate
```

### 2. サンプルデータ作成
```bash
# 全施設に90日分のサンプル料金を作成
python manage.py create_sample_rates --days 90

# 特定施設のみ
python manage.py create_sample_rates --property-id 2 --days 90
```

### 3. Django Admin で確認
```
http://localhost:8000/admin/reservations/dailyrate/
```

### 4. API で確認
```bash
# 巴.comの2025年12月の料金を取得
curl "http://localhost:8000/api/daily-rates/?property_id=2&start_date=2025-12-01&end_date=2025-12-31"
```

### 5. フロントエンドで表示
RateCalendarコンポーネントをルーティングに追加：

```jsx
// frontend/src/App.jsx または routes.js
import RateCalendar from './components/RateCalendar';

<Route path="/rates/calendar" element={<RateCalendar />} />
```

## データ統計（2025-12-12時点）

```bash
python manage.py shell
>>> from reservations.models_pricing import DailyRate
>>> DailyRate.objects.count()
270

>>> from django.db.models import Min, Max, Avg
>>> DailyRate.objects.aggregate(Min('base_price'), Max('base_price'), Avg('base_price'))
{'base_price__min': Decimal('8000.00'), 'base_price__max': Decimal('25000.00'), 'base_price__avg': Decimal('10644.44')}
```

- 総料金レコード: 270件
- 料金範囲: ¥8,000 ~ ¥25,000
- 平均料金: ¥10,644

## Beds24 API 統合（今後の課題）

### 調査中のエンドポイント

1. **getBookingsCSV** ✅ 動作確認済み
   - 予約データの取得に成功
   - URL: `https://www.beds24.com/api/csv/getbookingscsv`

2. **getRatesCSV** ⚠️ 異なる用途
   - 料金ルール定義を返す（日別カレンダーではない）
   - レート設定（期間、人数による料金変動ルール）

3. **getAvailabilitiesCSV** ❌ 404エラー
   - エンドポイントが存在しない可能性

### 次のステップ

1. **Beds24公式ドキュメント確認**
   - 日別料金カレンダーを取得するAPIを特定
   - API v2（JSON形式）の調査

2. **代替案の検討**
   - Channel Manager APIの使用
   - Beds24管理画面からエクスポート→インポート
   - iCalフォーマットでの料金取得

3. **手動入力機能の強化**
   - 一括料金設定（期間指定）
   - CSVインポート/エクスポート
   - 料金ルールテンプレート

## トラブルシューティング

### データが表示されない
```bash
# データベースを確認
python manage.py shell
>>> from reservations.models_pricing import DailyRate
>>> DailyRate.objects.count()
>>> DailyRate.objects.filter(property_id=2).count()
```

### 料金が更新されない
- Django admin で `updated_at` を確認
- API レスポンスをブラウザのネットワークタブで確認
- バックエンドログを確認: `python manage.py runserver` の出力

### Beds24同期エラー
```bash
# API認証を確認
python manage.py shell
>>> from django.conf import settings
>>> print(settings.BEDS24_USERNAME)
>>> print(settings.BEDS24_PASSWORD)
```

## まとめ

✅ **実装完了:**
- DailyRate モデル
- CRUD API
- カレンダー表示UI
- 料金編集機能
- サンプルデータ生成

⏳ **今後の実装:**
- Beds24 APIからの自動同期
- 一括料金設定
- 料金履歴管理
- 予約との連携（予約時の料金自動計算）
