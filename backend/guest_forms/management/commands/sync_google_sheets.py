# backend/guest_forms/management/commands/sync_google_sheets.py

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from guest_forms.models import Property, GuestSubmission
from guest_forms.google_sheets_service import google_sheets_service
from reservations.models import Reservation
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Google Sheets に予約情報と名簿提出状況を同期'

    def add_arguments(self, parser):
        parser.add_argument(
            '--property',
            type=int,
            help='特定の施設 ID を指定して同期'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='全施設を同期'
        )
        parser.add_argument(
            '--init-headers',
            action='store_true',
            help='ヘッダー行を初期化'
        )

    def handle(self, *args, **options):
        if not google_sheets_service.is_configured():
            raise CommandError(
                'Google Sheets API が設定されていません。'
                '.env ファイルで GOOGLE_SHEETS_API_CREDENTIALS_JSON と '
                'GOOGLE_SHEETS_SPREADSHEET_ID を設定してください。'
            )

        if options['init_headers']:
            self.init_headers()
            return

        if options['property']:
            self.sync_property(options['property'])
        elif options['all']:
            self.sync_all_properties()
        else:
            self.stdout.write(
                self.style.WARNING(
                    '--property <id> または --all オプションを指定してください'
                )
            )

    def init_headers(self):
        """ヘッダー行を初期化"""
        self.stdout.write('ヘッダー行を初期化中...')
        success = google_sheets_service.create_header_row()
        
        if success:
            self.stdout.write(
                self.style.SUCCESS('✓ ヘッダー行を初期化しました')
            )
        else:
            raise CommandError('ヘッダー行の初期化に失敗しました')

    def sync_property(self, property_id):
        """特定の施設の予約を同期"""
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            raise CommandError(f'施設 ID {property_id} が見つかりません')

        self.stdout.write(f'施設 "{property_obj.name}" を同期中...')
        
        # 施設ごとの Sheet URL から service インスタンスを作成
        if property_obj.google_sheets_url:
            from guest_forms.google_sheets_service import GoogleSheetsService
            sheet_id = GoogleSheetsService.extract_sheet_id_from_url(property_obj.google_sheets_url)
            if not sheet_id:
                raise CommandError(f'施設の Google Sheets URL から ID を抽出できません: {property_obj.google_sheets_url}')
            service = GoogleSheetsService(spreadsheet_id=sheet_id)
        else:
            service = google_sheets_service
        
        if not service.is_configured():
            raise CommandError(f'施設 {property_obj.name} の Google Sheets が設定されていません')
        
        # 確定済みの予約を取得
        reservations = Reservation.objects.filter(
            property=property_obj,
            status='Accepted'
        ).select_related('guestsubmission')

        count = 0
        for reservation in reservations:
            reservation_data = {
                'beds24_book_id': reservation.beds24_book_id,
                'property_name': property_obj.name,
                'guest_name': reservation.guest_name or '',
                'guest_email': reservation.guest_email or '',
                'check_in_date': reservation.check_in_date.isoformat(),
                'check_out_date': reservation.check_out_date.isoformat() if reservation.check_out_date else '',
                'num_guests': reservation.num_guests,
                'roster_status': reservation.get_guest_roster_status_display(),
                'total_price': float(reservation.total_price),
                'created_at': reservation.created_at.isoformat(),
            }
            
            if service.append_reservation(reservation_data):
                count += 1
                self.stdout.write(
                    f'  ✓ 予約 {reservation.beds24_book_id} を追加'
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'  ✗ 予約 {reservation.beds24_book_id} の追加に失敗'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'✓ {count}/{reservations.count()} 件の予約を同期しました'
            )
        )

    def sync_all_properties(self):
        """全施設の予約を同期"""
        properties = Property.objects.all()
        
        self.stdout.write(f'{properties.count()} 件の施設を同期中...\n')
        
        for property_obj in properties:
            try:
                self.sync_property(property_obj.id)
                self.stdout.write('')
            except CommandError as e:
                self.stdout.write(
                    self.style.ERROR(f'エラー: {e}')
                )

        self.stdout.write(
            self.style.SUCCESS('✓ 全施設の同期が完了しました')
        )
