from django.core.management.base import BaseCommand
from datetime import date, timedelta
from guest_forms.models import Property
from reservations.services_pricing import (
    sync_daily_rates_from_beds24,
    sync_daily_rates_from_beds24_csv,
)


class Command(BaseCommand):
    help = 'Beds24から日別料金を取得しDailyRateへ同期（JSON/CSV両対応）'

    def add_arguments(self, parser):
        parser.add_argument('--property-id', type=int, help='対象施設ID（未指定なら全施設）')
        parser.add_argument('--days', type=int, default=90, help='今日から何日分を取得するか')
        parser.add_argument('--start', type=str, help='開始日 YYYY-MM-DD（指定時は--daysより優先）')
        parser.add_argument('--end', type=str, help='終了日 YYYY-MM-DD（指定時は--daysより優先）')
        parser.add_argument('--room-id', type=int, help='Beds24のroomId（未指定ならProperty.room_idを使用）')
        parser.add_argument('--use-csv', action='store_true', help='CSV API (getroomdailycsv) を使用（デフォルトはJSON API）')

    def handle(self, *args, **options):
        prop_id = options.get('property_id')
        days = options.get('days')
        start_str = options.get('start')
        end_str = options.get('end')

        if start_str and end_str:
            start = date.fromisoformat(start_str)
            end = date.fromisoformat(end_str)
        else:
            start = date.today()
            end = start + timedelta(days=days)

        if prop_id:
            qs = Property.objects.filter(id=prop_id)
        else:
            qs = Property.objects.all()

        if not qs.exists():
            self.stdout.write(self.style.ERROR('対象施設が見つかりません'))
            return

        total_saved = 0
        for prop in qs:
            try:
                api_type = 'CSV' if options.get('use_csv') else 'JSON'
                self.stdout.write(f"Syncing {prop.name} (ID:{prop.id}, roomId:{prop.room_id}) via {api_type} from {start} to {end}...")
                # room-id引数がある場合は一時的に上書き
                if options.get('room_id'):
                    setattr(prop, 'room_id', options['room_id'])
                
                if options.get('use_csv'):
                    result = sync_daily_rates_from_beds24_csv(prop, start, end)
                else:
                    result = sync_daily_rates_from_beds24(prop, start, end)
                
                total_saved += result['count']
                self.stdout.write(self.style.SUCCESS(f"  saved: {result['count']}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  failed: {e}"))

        self.stdout.write(self.style.SUCCESS(f"Done. total saved: {total_saved}"))
