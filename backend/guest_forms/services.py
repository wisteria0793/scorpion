import requests
import csv
import io
import html
from datetime import datetime
from collections import defaultdict
from django.conf import settings
# from .models import Property # Propertyモデルは不要になる

def get_revenue_data(start_date, end_date):
    """
    Beds24 APIから指定された期間の予約データを取得し、施設ごとの売上を集計する。
    DBに施設が存在するかどうかに関わらず、Beds24のデータを正として集計する。
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
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"!!! Beds24 APIリクエスト失敗: {e}")
        return None

    csv_file = io.StringIO(response.text)
    reader = csv.reader(csv_file)
    
    try:
        header = next(reader)
    except StopIteration:
        return defaultdict(lambda: defaultdict(lambda: defaultdict(int)))

    try:
        property_index = header.index("Property")
        first_night_index = header.index("First Night")
        status_index = header.index("Status")
        price_index = header.index("Price")
    except ValueError as e:
        print(f"!!! CSVヘッダーに必要な列が見つかりません: {e}")
        return None

    # {facility_name: {year: {month: revenue}}}
    revenue_data = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))

    for row in reader:
        if row[status_index] not in ["Confirmed", "New"]:
            continue

        # HTMLエンティティをデコードして施設名を取得
        beds24_property_name = html.unescape(row[property_index])
        
        try:
            check_in_date = datetime.strptime(row[first_night_index], "%d %b %Y")
            year = check_in_date.year
            month = check_in_date.month
        except ValueError:
            continue

        try:
            price = int(float(row[price_index]))
        except (ValueError, TypeError):
            price = 0
            
        revenue_data[beds24_property_name][year][month] += price

    return revenue_data
