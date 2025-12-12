# backend/guest_forms/management/commands/sync_bookings.py
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from guest_forms.models import Property
from reservations.models import Reservation, SyncStatus
from reservations.services import Beds24SyncError, fetch_beds24_bookings


class Command(BaseCommand):
    help = 'Sync bookings from Beds24 using getbookingscsv API and detect cancellations.'

    def handle(self, *args, **options):
        self.stdout.write("Starting to sync bookings with Beds24 using getbookingscsv API...")

        # 1) 取得期間を設定（今日から365日後まで）
        start_date = date.today()
        end_date = start_date + timedelta(days=365)
        self.stdout.write(f"Syncing bookings from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}...")

        # 2) Beds24から予約データを取得
        try:
            bookings = fetch_beds24_bookings(start_date, end_date)
        except Beds24SyncError as exc:
            self.stderr.write(self.style.ERROR(str(exc)))
            return

        # 3) 施設のマッピングを準備（room_id / beds24_property_key 両対応）
        room_map = {}
        property_key_map = {}
        for prop in Property.objects.all():
            if prop.room_id is not None:
                room_map[str(prop.room_id)] = prop
            if prop.beds24_property_key:
                property_key_map[str(prop.beds24_property_key)] = prop

        if not room_map and not property_key_map:
            self.stderr.write(self.style.ERROR("No properties with room_id or beds24_property_key found. Cannot map bookings."))
            return

        # 4) DBを更新
        created_count = 0
        updated_count = 0
        missing_property_count = 0
        api_booking_ids = set()

        for booking in bookings:
            api_booking_ids.add(booking['beds24_book_id'])

            property_obj = room_map.get(booking.get('room_id')) or property_key_map.get(booking.get('property_key'))
            if not property_obj:
                missing_property_count += 1
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

        self.stdout.write(f"Processed {len(api_booking_ids)} valid bookings from API.")
        self.stdout.write(f"New: {created_count}, Updated: {updated_count}, Missing property: {missing_property_count}")

        # 5) キャンセルされた予約を特定して更新
        cancelled_count = 0
        db_reservations = Reservation.objects.filter(
            check_in_date__range=(start_date, end_date),
            status__in=["Confirmed", "New", "Unknown"]
        )
        db_booking_ids = set(db_reservations.values_list('beds24_book_id', flat=True))
        cancelled_ids = db_booking_ids - api_booking_ids

        if cancelled_ids:
            cancelled_count = db_reservations.filter(beds24_book_id__in=cancelled_ids).update(status='Cancelled')
            self.stdout.write(f"Marked {cancelled_count} bookings as 'Cancelled'.")

        # 6) 最終同期時刻を更新
        sync_time = timezone.now()
        SyncStatus.objects.update_or_create(
            pk=1,
            defaults={'last_sync_time': sync_time},
        )
        self.stdout.write(f"Updated last sync time to: {sync_time.strftime('%Y-%m-%d %H:%M:%S')}")

        self.stdout.write(self.style.SUCCESS("--- Sync complete! ---"))
        self.stdout.write(f"Total created: {created_count}, updated: {updated_count}, cancelled: {cancelled_count}, missing_property: {missing_property_count}")

