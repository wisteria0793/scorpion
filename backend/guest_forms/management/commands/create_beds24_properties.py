# guest_forms/management/commands/create_beds24_properties.py
from django.core.management.base import BaseCommand
from guest_forms.models import Property


class Command(BaseCommand):
    help = 'Create Property records for known Beds24 facilities'

    def handle(self, *args, **options):
        properties_data = [
            {
                'name': '巴.com',
                'slug': 'tomoe-com',
                'room_id': 201018,
                'beds24_property_key': '巴.com',
                'management_type': 'owned',
            },
            {
                'name': 'ONE PIECE HOUSE',
                'slug': 'one-piece-house',
                'room_id': 272797,
                'beds24_property_key': 'ONE PIECE HOUSE',
                'management_type': 'owned',
            },
            {
                'name': '巴.com プレミアムステイ',
                'slug': 'tomoe-com-premium',
                'room_id': 482703,
                'beds24_property_key': '巴.com プレミアムステイ',
                'management_type': 'owned',
            },
            {
                'name': '巴.com 5 Cafe&Stay',
                'slug': 'tomoe-com-5-cafe-stay',
                'room_id': 500815,
                'beds24_property_key': '巴.com 5 Cafe&Stay',
                'management_type': 'owned',
            },
            {
                'name': '巴.com 3',
                'slug': 'tomoe-com-3',
                'room_id': 369866,
                'beds24_property_key': '巴.com 3',
                'management_type': 'owned',
            },
            {
                'name': 'Guest house 巴.com hakodate motomachi',
                'slug': 'guest-house-tomoe-motomachi',
                'room_id': 409489,
                'beds24_property_key': 'Guest house 巴.com hakodate motomachi',
                'management_type': 'owned',
            },
            {
                'name': 'mimosa',
                'slug': 'mimosa',
                'room_id': 507685,
                'beds24_property_key': 'mimosa',
                'management_type': 'owned',
            },
        ]

        created = 0
        updated = 0

        for data in properties_data:
            obj, is_created = Property.objects.update_or_create(
                room_id=data['room_id'],
                defaults={
                    'name': data['name'],
                    'slug': data['slug'],
                    'beds24_property_key': data['beds24_property_key'],
                    'management_type': data['management_type'],
                }
            )
            if is_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f'✓ 作成: {obj.name}'))
            else:
                updated += 1
                self.stdout.write(self.style.WARNING(f'⟳ 更新: {obj.name}'))

        self.stdout.write(self.style.SUCCESS(f'\n完了: {created}件作成, {updated}件更新'))
