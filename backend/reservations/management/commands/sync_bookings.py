# backend/guest_forms/management/commands/sync_bookings.py
import requests
import csv
import io
import html
import time
from datetime import date, timedelta, datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from guest_forms.models import Property
from reservations.models import Reservation, SyncStatus


class Command(BaseCommand):
    help = 'Sync bookings from Beds24 using getbookingscsv API and detect cancellations.'

    def handle(self, *args, **options):
        self.stdout.write("Starting to sync bookings with Beds24 using getbookingscsv API...")

        # --- 1. 取得期間を設定（今日から365日後まで） ---
        start_date = date.today()
        end_date = start_date + timedelta(days=365)
        self.stdout.write(f"Syncing bookings from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}...")

        # --- 2. Beds24 API (getbookingscsv) からデータを取得 ---
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

        # --- 3. DBのProperty情報を準備 ---
        properties_map = {str(prop.room_id): prop for prop in Property.objects.filter(room_id__isnull=False)}
        if not properties_map:
            self.stderr.write(self.style.ERROR("No properties with room_id found in the database. Cannot map bookings."))
            return
            
        # --- 4. CSVデータを解析し、DBを更新 ---
        csv_file = io.StringIO(response.text)
        reader = csv.reader(csv_file)
        
        try:
            header = next(reader)
            cleaned_header = [h.strip().strip('"') for h in header]
        except StopIteration:
            self.stdout.write(self.style.WARNING("CSV data is empty."))
            return

        required_columns = {
            'Master ID': 'beds24_book_id', 'Roomid': 'room_id', 'Status': 'status',
            'Price': 'total_price', 'First Night': 'check_in_date', 'Last Night': 'check_out_date',
            'Adult': 'adult_guests', 'Child': 'child_guests', 'Name': 'guest_name', 'Email': 'guest_email',
        }
        
        try:
            col_indices = {field: cleaned_header.index(col) for col, field in required_columns.items()}
        except ValueError as e:
            self.stderr.write(self.style.ERROR(f"CSV header is missing a required column: {e}"))
            return

        created_count = 0
        updated_count = 0
        skipped_count = 0
        api_booking_ids = set()

        for row in reader:
            try:
                # 有効な予約のみを処理対象とする
                status_val = row[col_indices['status']]
                if status_val not in ["Confirmed", "New"]:
                    continue

                beds24_book_id = int(row[col_indices['beds24_book_id']])
                api_booking_ids.add(beds24_book_id)

                room_id = str(row[col_indices['room_id']])
                property_obj = properties_map.get(room_id)

                if not property_obj:
                    skipped_count += 1
                    continue

                adults = int(row[col_indices['adult_guests']]) if row[col_indices['adult_guests']] else 0
                children = int(row[col_indices['child_guests']]) if row[col_indices['child_guests']] else 0
                
                defaults = {
                    'property': property_obj,
                    'status': status_val,
                    'total_price': float(row[col_indices['total_price']]) if row[col_indices['total_price']] else 0.00,
                    'check_in_date': datetime.strptime(row[col_indices['check_in_date']], "%d %b %Y").date(),
                    'check_out_date': datetime.strptime(row[col_indices['check_out_date']], "%d %b %Y").date(),
                    'num_guests': adults + children,
                    'guest_name': html.unescape(row[col_indices['guest_name']]) if row[col_indices['guest_name']] else '',
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
                self.stderr.write(self.style.WARNING(f"Skipping row due to parsing error: {e}. Row: {row}"))
                skipped_count += 1
                continue
        
        self.stdout.write(f"Processed {len(api_booking_ids)} valid bookings from API.")
        self.stdout.write(f"New: {created_count}, Updated: {updated_count}, Skipped: {skipped_count}")

        # --- 5. キャンセルされた予約を特定して更新 ---
        cancelled_count = 0
        
        # DBにある、取得期間内の、未キャンセルの予約を取得
        db_reservations = Reservation.objects.filter(
            check_in_date__range=(start_date, end_date),
            status__in=["Confirmed", "New", "Unknown"] # 'Unknown'など他のステータスも考慮
        )
        
        db_booking_ids = set(db_reservations.values_list('beds24_book_id', flat=True))
        
        cancelled_ids = db_booking_ids - api_booking_ids
        
        if cancelled_ids:
            cancelled_reservations = db_reservations.filter(beds24_book_id__in=cancelled_ids)
            # バルクアップデートで効率的に更新
            cancelled_count = cancelled_reservations.update(status='Cancelled')
            self.stdout.write(f"Marked {cancelled_count} bookings as 'Cancelled'.")

        # --- 6. 最終同期時刻を更新 ---
        sync_time = timezone.now()
        SyncStatus.objects.update_or_create(
            pk=1,
            defaults={'last_sync_time': sync_time}
        )
        self.stdout.write(f"Updated last sync time to: {sync_time.strftime('%Y-%m-%d %H:%M:%S')}")

        self.stdout.write(self.style.SUCCESS(f"--- Sync complete! ---"))
        self.stdout.write(f"Total created: {created_count}, updated: {updated_count}, cancelled: {cancelled_count}, skipped: {skipped_count}")

