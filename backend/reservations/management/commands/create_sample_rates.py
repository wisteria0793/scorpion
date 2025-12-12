# reservations/management/commands/create_sample_rates.py
from django.core.management.base import BaseCommand
from datetime import date, timedelta
from decimal import Decimal
from guest_forms.models import Property
from reservations.models_pricing import DailyRate


class Command(BaseCommand):
    help = 'Create sample daily rates for testing calendar display'

    def add_arguments(self, parser):
        parser.add_argument(
            '--property-id',
            type=int,
            help='Property ID to create rates for'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Number of days to create (default: 90)'
        )

    def handle(self, *args, **options):
        property_id = options.get('property_id')
        days = options['days']
        
        if property_id:
            properties = Property.objects.filter(id=property_id)
        else:
            properties = Property.objects.all()[:3]  # 最初の3施設
        
        if not properties.exists():
            self.stdout.write(self.style.ERROR('No properties found'))
            return
        
        start_date = date.today()
        created_total = 0
        
        for prop in properties:
            self.stdout.write(f"\nCreating rates for: {prop.name}")
            created_count = 0
            
            for i in range(days):
                current_date = start_date + timedelta(days=i)
                
                # 曜日に応じて料金を変える
                weekday = current_date.weekday()
                if weekday >= 4:  # 金・土
                    base_price = Decimal('15000')
                elif weekday == 6:  # 日
                    base_price = Decimal('12000')
                else:  # 平日
                    base_price = Decimal('8000')
                
                # 年末年始は高く
                if current_date.month == 12 and current_date.day >= 28:
                    base_price = Decimal('25000')
                elif current_date.month == 1 and current_date.day <= 3:
                    base_price = Decimal('25000')
                
                obj, created = DailyRate.objects.update_or_create(
                    property=prop,
                    date=current_date,
                    defaults={
                        'base_price': base_price,
                        'available': True,
                        'min_stay': 1 if weekday < 4 else 2,  # 週末は2泊以上
                    }
                )
                
                if created:
                    created_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(f'  Created {created_count} rates for {prop.name}')
            )
            created_total += created_count
        
        self.stdout.write(
            self.style.SUCCESS(f'\nTotal created: {created_total} rates')
        )
