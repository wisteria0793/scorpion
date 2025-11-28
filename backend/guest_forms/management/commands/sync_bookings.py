# backend/guest_forms/management/commands/sync_bookings.py
import requests
import csv
import io
import html
from datetime import datetime, date, timedelta
from django.core.management.base import BaseCommand
from django.conf import settings
from guest_forms.models import Property, Reservation

class Command(BaseCommand):
    help = 'Sync bookings from Beds24 API and save them to the local database.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of past days to sync bookings for. Defaults to 7.',
        )

    def handle(self, *args, **options):
        days_to_sync = options['days']
        start_date = date.today() - timedelta(days=days_to_sync)
        end_date = date.today()

        self.stdout.write(f"Syncing bookings from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}...")

        # --- 1. Beds24 APIからデータを取得 ---
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
            self.stderr.write(self.style.ERROR(f"Failed to fetch data from Beds24 API: {e}"))
            return

        # --- 2. DBのProperty情報を準備 ---
        properties_map = {prop.room_id: prop for prop in Property.objects.filter(room_id__isnull=False)}
        if not properties_map:
            self.stderr.write(self.style.ERROR("No properties with room_id found in the database. Cannot map bookings."))
            return

        
        # --- 3. CSVデータを解析・保存 ---
        csv_file = io.StringIO(response.text)
        reader = csv.reader(csv_file)
        
        try:
            header = next(reader)
            self.stdout.write(f"Beds24 CSV Headers: {header}")

            # ヘッダーをクリーンアップ（前後のスペースと引用符を削除）
            cleaned_header = [h.strip().strip('"') for h in header]
            self.stdout.write(f"Cleaned CSV Headers: {cleaned_header}")

        except StopIteration:
            self.stdout.write(self.style.WARNING("CSV data is empty."))
            return

        # 必須の列をマッピング
        required_columns = {
            'Master ID': 'beds24_book_id',
            'Roomid': 'room_id',
            'Status': 'status',
            'Price': 'total_price',
            'First Night': 'check_in_date',
            'Last Night': 'check_out_date',
            'Adult': 'adult_guests', # Adultの数を取得
            'Child': 'child_guests', # Childの数を取得
            'Name': 'guest_name',
            'Email': 'guest_email',
        }
        
        col_indices = {}
        try:
            for csv_col, model_field in required_columns.items():
                col_indices[model_field] = cleaned_header.index(csv_col)
        except ValueError as e:
            self.stderr.write(self.style.ERROR(f"CSV header is missing a required column or its name is incorrect: {e}. Check cleaned_header vs required_columns."))
            return

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for row_num, row in enumerate(reader):
            try:
                room_id = int(row[col_indices['room_id']])
                property_obj = properties_map.get(room_id)

                if not property_obj:
                    self.stderr.write(self.style.WARNING(f"Skipping row {row_num + 2} due to missing property. Room ID: {room_id} not found in DB."))
                    skipped_count += 1
                    continue

                beds24_book_id = int(row[col_indices['beds24_book_id']])
                
                # num_guests を Adult と Child の合計として計算
                adults = int(row[col_indices['adult_guests']]) if row[col_indices['adult_guests']] else 0
                children = int(row[col_indices['child_guests']]) if row[col_indices['child_guests']] else 0
                total_guests = adults + children

                # Priceが小数点以下の値を持つ可能性を考慮し、DecimalFieldに合わせてDecimal型で保存
                total_price = float(row[col_indices['total_price']]) if row[col_indices['total_price']] else 0.00
                
                # Guest NameはHTMLエンティティをデコード
                guest_name_val = html.unescape(row[col_indices['guest_name']]) if row[col_indices['guest_name']] else ''

                self.stdout.write(f"DEBUG: Syncing for property name: '{property_obj.name}' with book ID {beds24_book_id}")

                defaults = {
                    'property': property_obj,
                    'status': row[col_indices['status']],
                    'total_price': total_price,
                    'check_in_date': datetime.strptime(row[col_indices['check_in_date']], "%d %b %Y").date(),
                    'check_out_date': datetime.strptime(row[col_indices['check_out_date']], "%d %b %Y").date(),
                    'num_guests': total_guests,
                    'guest_name': guest_name_val,
                    'guest_email': row[col_indices['guest_email']] if row[col_indices['guest_email']] else '',
                }

                obj, created = Reservation.objects.update_or_create(
                    beds24_book_id=beds24_book_id,
                    defaults=defaults
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

            except (ValueError, TypeError, IndexError) as e:
                self.stderr.write(self.style.WARNING(f"Skipping row {row_num + 2} due to parsing error: {e}. Row: {row}"))
                skipped_count += 1
                continue

        self.stdout.write(self.style.SUCCESS(f"--- Sync complete! ---"))
        self.stdout.write(f"New bookings created: {created_count}")
        self.stdout.write(f"Existing bookings updated: {updated_count}")
        self.stdout.write(f"Rows skipped: {skipped_count}")
