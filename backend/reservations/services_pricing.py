# reservations/services_pricing.py
"""
Beds24から日別料金データを取得し、データベースに同期するサービス。
"""
import requests
import csv
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from typing import List, Dict, Optional
from django.conf import settings
from django.utils import timezone

from guest_forms.models import Property
from .models_pricing import DailyRate
from django.conf import settings
import requests
from datetime import date, timedelta


def fetch_beds24_daily_price_setup(prop_key: str, start: date, end: date, room_id: int | None = None):
    """
    Beds24 JSON API `getDailyPriceSetup` を呼び出して、指定期間の料金設定を取得。

    必要な設定:
    - settings.BEDS24_ACCOUNT_ID
    - settings.BEDS24_API_KEY

    返却: APIのJSONをそのまま返す（後段で整形）
    """
    account_id = getattr(settings, 'BEDS24_ACCOUNT_ID', None)
    api_key = getattr(settings, 'BEDS24_API_KEY', None)
    username = os.environ.get('BEDS24_USERNAME')
    password = os.environ.get('BEDS24_PASSWORD')
    if not api_key or not (account_id or (username and password)):
        raise RuntimeError('Beds24 API認証情報が不足しています (APIKEY と ACCOUNT_ID もしくは USERNAME/PASSWORD)')

    url = 'https://www.beds24.com/api/json/getDailyPriceSetup'
    auth = {'apiKey': api_key}
    if account_id:
        auth['id'] = account_id
    elif username and password:
        auth['username'] = username
        auth['password'] = password

    dps = {
        'propKey': prop_key,
        'fromDate': start.strftime('%Y-%m-%d'),
        'toDate': end.strftime('%Y-%m-%d')
    }
    if room_id:
        dps['roomId'] = int(room_id)

    payload = {
        'authentication': auth,
        'dailyPriceSetup': dps
    }
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    # Beds24はエラー時に{"error":"..."}を返す場合がある
    if isinstance(data, dict) and data.get('error'):
        raise RuntimeError(f"Beds24 API error: {data.get('error')}")
    return data


def sync_daily_rates_from_beds24(property_obj, start: date, end: date):
    """
    Beds24の日別料金設定を`DailyRate`に反映。
    `getDailyPriceSetup`のレスポンスを日付ごとにマッピングして保存。

    注意: Beds24のレスポンス構造はアカウント設定により差異があり得るため、
    最低限のフィールド（price/minStay/available）を想定してパース。
    """
    if not property_obj.beds24_property_key:
        raise RuntimeError('Propertyにbeds24_property_keyが設定されていません')

    raw = fetch_beds24_daily_price_setup(
        property_obj.beds24_property_key,
        start,
        end,
        room_id=getattr(property_obj, 'room_id', None)
    )

    # 代表的なレスポンス構造に合わせてパース
    # 例: { "dailyPriceSetup": { "prices": [ {"date":"2025-12-01","price":8000,"minStay":1,"available":true}, ... ] } }
    try:
        items = (
            raw.get('dailyPriceSetup', {}).get('prices')
            or raw.get('prices')
            or []
        )
    except AttributeError:
        items = []

    saved = 0
    for it in items:
        d = it.get('date')
        price = it.get('price') or it.get('basePrice')
        min_stay = it.get('minStay') or it.get('minstay') or 1
        available = it.get('available')
        if available is None:
            available = True

        try:
            obj, _created = DailyRate.objects.update_or_create(
                property=property_obj,
                date=d,
                defaults={
                    'base_price': price,
                    'min_stay': int(min_stay) if min_stay else 1,
                    'available': bool(available),
                    'beds24_data': it,
                }
            )
            saved += 1
        except Exception:
            # 個別の不整合はスキップ（ログは不要: 管理コマンド側で概要表示）
            continue

    return {'count': saved, 'from': start.isoformat(), 'to': end.isoformat()}


class Beds24PricingError(Exception):
    """Raised when Beds24 pricing data cannot be fetched or parsed."""
    pass


def fetch_beds24_rates(
    property_room_id: int,
    start_date: date,
    end_date: date
) -> List[Dict]:
    """
    Beds24 API から指定施設の日別料金データを取得。
    
    Beds24の getRatesCSV API を使用して、指定期間の料金情報を取得します。
    
    Args:
        property_room_id: Beds24のroom_id
        start_date: 取得開始日
        end_date: 取得終了日
        
    Returns:
        日別料金のリスト [{'date': date, 'price': Decimal, 'available': bool, ...}]
        
    Raises:
        Beds24PricingError: API呼び出しまたはパースに失敗した場合
    """
    url = "https://www.beds24.com/api/csv/getratescsv"
    
    payload = {
        'username': settings.BEDS24_USERNAME,
        'password': settings.BEDS24_PASSWORD,
        'roomid': property_room_id,
        'startdate': start_date.strftime('%Y%m%d'),
        'enddate': end_date.strftime('%Y%m%d'),
    }
    
    try:
        response = requests.post(url, data=payload, timeout=30)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise Beds24PricingError(f"Failed to fetch Beds24 rates: {exc}") from exc
    
    return _parse_rates_csv(response.text, start_date, end_date)


def _parse_rates_csv(csv_text: str, start_date: date, end_date: date) -> List[Dict]:
    """
    Beds24のgetRatesCSVレスポンスをパースして日別料金リストに変換。
    
    CSVフォーマット例:
    Date,Price,MinStay,Available
    2025-12-01,10000,1,1
    2025-12-02,12000,2,1
    2025-12-03,0,1,0
    
    Args:
        csv_text: CSV形式の文字列
        start_date: 期待される開始日
        end_date: 期待される終了日
        
    Returns:
        パースされた料金データのリスト
    """
    rates = []
    
    reader = csv.DictReader(csv_text.strip().split('\n'))
    
    for row in reader:
        try:
            # 日付のパース
            date_str = row.get('Date') or row.get('date') or row.get('DATE')
            if not date_str:
                continue
                
            # YYYY-MM-DD または YYYYMMDD 形式に対応
            if '-' in date_str:
                rate_date = date.fromisoformat(date_str)
            else:
                rate_date = date(
                    int(date_str[:4]),
                    int(date_str[4:6]),
                    int(date_str[6:8])
                )
            
            # 料金のパース
            price_str = row.get('Price') or row.get('price') or row.get('PRICE') or '0'
            try:
                price = Decimal(price_str.replace(',', ''))
            except (InvalidOperation, ValueError):
                price = None
            
            # 空室状況
            available_str = row.get('Available') or row.get('available') or '1'
            available = available_str.strip() in ('1', 'true', 'True', 'yes', 'Yes')
            
            # 最小宿泊数
            min_stay_str = row.get('MinStay') or row.get('minstay') or row.get('MINSTAY') or '1'
            try:
                min_stay = int(min_stay_str)
            except (ValueError, TypeError):
                min_stay = 1
            
            rates.append({
                'date': rate_date,
                'price': price,
                'available': available,
                'min_stay': min_stay,
                'raw_data': dict(row)
            })
            
        except (ValueError, KeyError) as e:
            # 不正な行はスキップ
            continue
    
    return rates


def sync_rates_to_db(
    property_obj: Property,
    rates: List[Dict],
) -> Dict[str, int]:
    """
    取得した料金データをデータベースに同期。
    
    Args:
        property_obj: 施設オブジェクト
        rates: fetch_beds24_rates()で取得した料金リスト
        
    Returns:
        {'created': int, 'updated': int} - 作成・更新件数
    """
    created_count = 0
    updated_count = 0
    
    for rate_data in rates:
        defaults = {
            'base_price': rate_data.get('price'),
            'available': rate_data.get('available', True),
            'min_stay': rate_data.get('min_stay', 1),
            'beds24_data': rate_data.get('raw_data'),
        }
        
        obj, created = DailyRate.objects.update_or_create(
            property=property_obj,
            date=rate_data['date'],
            defaults=defaults
        )
        
        if created:
            created_count += 1
        else:
            updated_count += 1
    
    return {
        'created': created_count,
        'updated': updated_count,
    }


def fetch_and_sync_all_properties_rates(
    start_date: date,
    end_date: date,
) -> Dict[str, any]:
    """
    全施設の料金データを一括で取得・同期。
    
    Args:
        start_date: 取得開始日
        end_date: 取得終了日
        
    Returns:
        施設ごとの同期結果 {'property_name': {'created': int, 'updated': int, 'error': str}}
    """
    results = {}
    
    properties = Property.objects.exclude(room_id__isnull=True)
    
    for prop in properties:
        try:
            rates = fetch_beds24_rates(prop.room_id, start_date, end_date)
            sync_result = sync_rates_to_db(prop, rates)
            results[prop.name] = sync_result
        except Beds24PricingError as e:
            results[prop.name] = {'error': str(e)}
    
    return results
