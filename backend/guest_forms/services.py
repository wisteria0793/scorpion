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

    print("--- 1. Beds24 APIにリクエストを送信します ---")
    print(f"URL: {url}")
    print(f"期間: {params['datefrom']} ~ {params['dateto']}")

    try:
        response = requests.post(url, data=params)
        response.raise_for_status()
        print(f"APIレスポンス ステータス: {response.status_code} (成功)")
        # レスポンスが長い可能性があるので、最初の500文字だけ表示
        print(f"APIレスポンス (先頭500文字):\n{response.text[:500]}\n")

    except requests.exceptions.RequestException as e:
        print(f"!!! Beds24 APIリクエスト失敗: {e}")
        return None

    # --- 2. データベースの施設名を確認 ---
    properties_map = {prop.name: prop.id for prop in Property.objects.all()}
    print("--- 2. データベースに登録されている施設 ---")
    if not properties_map:
        print("!!! データベースに施設が1件も登録されていません。")
    else:
        for name, prop_id in properties_map.items():
            print(f"- ID: {prop_id}, 名前: '{name}'")
    print("-" * 20)


    csv_file = io.StringIO(response.text)
    reader = csv.reader(csv_file)
    
    try:
        header = next(reader)
        print(f"--- 3. CSVヘッダーの解析 ---\n{header}\n")
    except StopIteration:
        print("!!! CSVデータが空です。")
        return defaultdict(lambda: defaultdict(lambda: defaultdict(int)))

    try:
        property_index = header.index("Property")
        first_night_index = header.index("First Night")
        status_index = header.index("Status")
        price_index = header.index("Price")
    except ValueError as e:
        print(f"!!! CSVヘッダーに必要な列が見つかりません: {e}")
        return None

    revenue_data = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    processed_count = 0
    skipped_status_count = 0
    skipped_property_count = 0
    
    print("--- 4. 予約データの処理を開始 ---")
    for i, row in enumerate(reader):
        log_prefix = f"[行 {i+2}]"
        
        status = row[status_index]
        if status not in ["Confirmed", "New"]:
            print(f"{log_prefix} スキップ (理由: ステータスが '{status}')")
            skipped_status_count += 1
            continue

        beds24_property_name = row[property_index]
        facility_id = properties_map.get(beds24_property_name)

        if not facility_id:
            print(f"{log_prefix} スキップ (理由: 施設名 '{beds24_property_name}' がDBに存在しません)")
            skipped_property_count += 1
            continue
        
        try:
            check_in_date = datetime.strptime(row[first_night_index], "%d %b %Y")
            year = check_in_date.year
            month = check_in_date.month
        except ValueError:
            print(f"{log_prefix} スキップ (理由: 日付形式 '{row[first_night_index]}' が不正)")
            continue

        try:
            price = int(float(row[price_index]))
        except (ValueError, TypeError):
            price = 0
        
        print(f"{log_prefix} ✅ 処理成功 (施設: '{beds24_property_name}', 日付: {check_in_date.strftime('%Y-%m-%d')}, 金額: {price})")
        revenue_data[facility_id][year][month] += price
        processed_count += 1

    print("\n--- 5. 処理結果サマリー ---")
    print(f"処理成功: {processed_count}件")
    print(f"スキップ (ステータス対象外): {skipped_status_count}件")
    print(f"スキップ (施設名不一致): {skipped_property_count}件")
    print("-" * 20)

    return revenue_data
