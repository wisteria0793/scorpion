# reservations/management/commands/import_past_bookings.py
from datetime import datetime

from django.core.management.base import BaseCommand

from guest_forms.models import Property
from reservations.models import Reservation
from reservations.services import Beds24SyncError, fetch_beds24_bookings

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

        # --- 1. Beds24 API からデータを取得（キャンセル・ブラック・拒否は除外） ---
        try:
            bookings = fetch_beds24_bookings(
                start_date,
                end_date,
                include_cancelled=True,
                excluded_statuses={"Cancelled", "Black", "Declined"},
            )
        except Beds24SyncError as exc:
            self.stderr.write(self.style.ERROR(str(exc)))
            return

        # --- 2. DBのProperty情報を準備 ---
        room_map = {}
        property_key_map = {}
        for prop in Property.objects.all():
            if prop.room_id is not None:
                room_map[str(prop.room_id)] = prop
            if prop.beds24_property_key:
                property_key_map[str(prop.beds24_property_key)] = prop

        if not room_map and not property_key_map:
            self.stderr.write(self.style.ERROR("No properties with room_id or beds24_property_key found in the database."))
            return
            
        # --- 3. データをDBに保存 ---
        created_count = 0
        updated_count = 0
        skipped_count = 0

        for booking in bookings:
            property_obj = room_map.get(booking.get('room_id')) or property_key_map.get(booking.get('property_key'))
            if not property_obj:
                skipped_count += 1
                continue

            num_guests = (booking.get('adult_guests') or 0) + (booking.get('child_guests') or 0)
            defaults = {
                'property': property_obj,
                'status': booking['status'],
                'total_price': booking['total_price'],
                'check_in_date': booking['check_in_date'],
                'check_out_date': booking['check_out_date'],
                'num_guests': num_guests,
                'guest_name': booking.get('guest_name', ''),
                'guest_email': booking.get('guest_email', ''),
            }

            obj, created = Reservation.objects.update_or_create(
                beds24_book_id=booking['beds24_book_id'],
                defaults=defaults,
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        self.stdout.write(self.style.SUCCESS("--- Import complete! ---"))
        self.stdout.write(f"New past bookings: {created_count}")
        self.stdout.write(f"Updated past bookings: {updated_count}")
        self.stdout.write(f"Skipped rows (no property match): {skipped_count}")
