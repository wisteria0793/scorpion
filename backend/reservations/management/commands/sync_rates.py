# reservations/management/commands/sync_rates.py
from django.core.management.base import BaseCommand
from datetime import date, timedelta
from reservations.services_pricing import fetch_and_sync_all_properties_rates, Beds24PricingError


class Command(BaseCommand):
    help = 'Sync daily rates from Beds24 for all properties'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Number of days to fetch from today (default: 90)'
        )

    def handle(self, *args, **options):
        days = options['days']
        start_date = date.today()
        end_date = start_date + timedelta(days=days)
        
        self.stdout.write(f"Syncing daily rates from Beds24...")
        self.stdout.write(f"Period: {start_date} to {end_date}")
        
        try:
            results = fetch_and_sync_all_properties_rates(start_date, end_date)
            
            self.stdout.write("\n=== Sync Results ===")
            for property_name, result in results.items():
                if 'error' in result:
                    self.stdout.write(
                        self.style.ERROR(f"✗ {property_name}: {result['error']}")
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ {property_name}: Created {result['created']}, Updated {result['updated']}"
                        )
                    )
            
            self.stdout.write(self.style.SUCCESS("\n--- Sync complete! ---"))
            
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Sync failed: {e}"))
            raise
