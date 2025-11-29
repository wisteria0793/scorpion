# reservations/management/commands/import_past_bookings.py
import requests
import csv
import io
import html
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from guest_forms.models import Property
from reservations.models import Reservation

class Command(BaseCommand):
    help = 'One-time script to import past bookings from a specified date range.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--start-date',
            type=str,
            required=True,
            help='The start date for fetching bookings (YYYY-MM-DD).',
        )
        parser.add_argument(
            '--end-date',
            type=str,
            required=True,
            help='The end date for fetching bookings (YYYY-MM-DD).',
        )

    def handle(self, *args, **options):
        try:
            start_date_str = options['start_date']
            end_date_str = options['end_date']
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            self.stderr.write(self.style.ERROR("Invalid date format. Please use YYYY-MM-DD."))
            return

        self.stdout.write(f"Importing past bookings from {start_date_str} to {end_date_str}...")

        # --- 1. Beds24 API (getbookingscsv) からデータを取得 ---
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
        properties_map = {str(prop.room_id): prop for prop in Property.objects.filter(room_id__isnull=False)}
        if not properties_map:
            self.stderr.write(self.style.ERROR("No properties with room_id found in the database."))
            return
            
        # --- 3. CSVデータを解析し、DBに保存 ---
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

        for row in reader:
            try:
                # 過去データなので、キャンセル以外は基本的にすべて取り込む
                status_val = row[col_indices['status']]
                if status_val in ["Cancelled", "Black", "Declined"]:
                    continue

                beds24_book_id = int(row[col_indices['beds24_book_id']])
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
        
        self.stdout.write(self.style.SUCCESS(f"--- Import complete! ---"))
        self.stdout.write(f"New past bookings: {created_count}")
        self.stdout.write(f"Updated past bookings: {updated_count}")
        self.stdout.write(f"Skipped rows: {skipped_count}")
