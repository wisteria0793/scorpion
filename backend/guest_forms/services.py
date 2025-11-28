import requests
import csv
import io
from datetime import datetime
from collections import defaultdict
from django.conf import settings
from .models import Property

def get_revenue_data(start_date, end_date):
    """
    Beds24 APIから指定された期間の予約データを取得し、施設ごとの売上を集計する
    """
    url = "https://www.beds24.com/api/csv/getbookingscsv"
    params = {
        'username': settings.BEDS24_USERNAME,
        'password': settings.BEDS24_PASSWORD,
        'datefrom': start_date.strftime("%Y-%m-%d"),
        'dateto': end_date.strftime("%Y-%m-%d"),
        'includeInvoiceItems': 'true',
    }

    try:
        response = requests.post(url, data=params)
        response.raise_for_status()  # HTTPエラーがあれば例外を発生させる
    except requests.exceptions.RequestException as e:
        # ここでエラーをログに記録するなど、適切なエラーハンドリングを行う
        print(f"Beds24 API request failed: {e}")
        return None

    csv_file = io.StringIO(response.text)
    reader = csv.reader(csv_file)
    
    try:
        header = next(reader)
    except StopIteration:
        # 空のCSVの場合
        return defaultdict(lambda: defaultdict(lambda: defaultdict(int)))

    # 列のインデックスを動的に取得
    try:
        property_index = header.index("Property")
        first_night_index = header.index("First Night")
        status_index = header.index("Status")
        price_index = header.index("Price")
    except ValueError as e:
        print(f"CSV header is missing a required column: {e}")
        return None

    # DBから施設名とIDのマッピングを取得
    # Beds24の施設名とDBの施設名を紐付ける必要がある
    # ここでは仮にBeds24のProperty名とDBのProperty.nameが一致すると仮定する
    properties_map = {prop.name: prop.id for prop in Property.objects.all()}

    # {facility_id: {year: {month: revenue}}}
    revenue_data = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))

    for row in reader:
        # ステータスが "Confirmed" または "New" の予約のみを対象
        if row[status_index] not in ["Confirmed", "New"]:
            continue

        beds24_property_name = row[property_index]
        facility_id = properties_map.get(beds24_property_name)

        # DBに存在しない施設はスキップ
        if not facility_id:
            continue
        
        try:
            # 日付形式 'dd mmm yyyy' (e.g., '27 Nov 2025')
            check_in_date = datetime.strptime(row[first_night_index], "%d %b %Y")
            year = check_in_date.year
            month = check_in_date.month
        except ValueError:
            # 日付のパースに失敗した場合はスキップ
            continue

        try:
            price = int(float(row[price_index]))
        except (ValueError, TypeError):
            price = 0
            
        revenue_data[facility_id][year][month] += price

    return revenue_data
