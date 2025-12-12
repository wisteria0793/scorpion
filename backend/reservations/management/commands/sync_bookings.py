# backend/guest_forms/management/commands/sync_bookings.py
from datetime import date, timedelta

from django.core.management.base import BaseCommand

from reservations.services import Beds24SyncError, fetch_beds24_bookings, sync_bookings_to_db


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

        sync_counts = sync_bookings_to_db(bookings, start_date, end_date)

        self.stdout.write(f"Processed {len(bookings)} valid bookings from API.")
        self.stdout.write(
            f"New: {sync_counts['created']}, Updated: {sync_counts['updated']}, "
            f"Cancelled: {sync_counts['cancelled']}, Missing property: {sync_counts['missing_property']}"
        )

        self.stdout.write(self.style.SUCCESS("--- Sync complete! ---"))

