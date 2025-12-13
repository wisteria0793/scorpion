# backend/guest_forms/views.py
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.permissions import AllowAny
from datetime import date, timedelta

from reservations.services import Beds24SyncError, fetch_beds24_bookings, sync_bookings_to_db
from reservations.models import SyncStatus, Reservation
from guest_forms.google_sheets_service import GoogleSheetsService

from .models import Property, FacilityImage, GuestSubmission, FormTemplate, PricingRule
from .serializers import PropertySerializer, FacilityImageSerializer, FormTemplateSerializer, GuestSubmissionSerializer, PricingRuleSerializer

class PropertyViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows properties to be viewed or edited.
    """
    queryset = Property.objects.all().order_by('name')
    serializer_class = PropertySerializer
    permission_classes = [AllowAny]
    permission_classes = [AllowAny]

class FacilityImageViewSet(viewsets.ModelViewSet):
    """
    API endpoint for uploading, listing, and deleting facility images.
    """
    serializer_class = FacilityImageSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        """
        This view should only return images for the property
        specified in the URL.
        """
        return FacilityImage.objects.filter(property=self.kwargs['property_pk'])

    def perform_create(self, serializer):
        """
        Associate the uploaded image with the property from the URL.
        """
        serializer.save(property_id=self.kwargs['property_pk'])


class GuestFormDetailView(APIView):
    """
    GET /api/guest-forms/{token}/
    トークンを元に、表示すべきフォームの定義(JSON)と、既存の提出データを返す
    """
    def get(self, request, token):
        try:
            submission = GuestSubmission.objects.get(token=token)
            template = submission.reservation.property.form_template
            
            if not template:
                return Response({"error": "この施設にはフォームが設定されていません。"}, status=status.HTTP_404_NOT_FOUND)

            template_serializer = FormTemplateSerializer(template)
            submission_serializer = GuestSubmissionSerializer(submission)
            
            response_data = {
                'form_definition': template_serializer.data,
                'submitted_data': submission_serializer.data.get('submitted_data', {})
            }
            
            return Response(response_data, status=status.HTTP_200_OK)

        except GuestSubmission.DoesNotExist:
            return Response({"error": "無効なトークンです。"}, status=status.HTTP_404_NOT_FOUND)


class GuestFormSubmitView(APIView):
    """
    POST /api/guest-forms/{token}/submit/
    ゲストが入力したフォームの内容を保存する
    提出完了時に自動的に Google Sheets の提出状況を更新
    """
    parser_classes = [MultiPartParser, FormParser] # ファイルアップロードに対応

    def post(self, request, token):
        try:
            submission = GuestSubmission.objects.get(token=token)
            
            if submission.status == GuestSubmission.SubmissionStatus.COMPLETED:
                return Response({"error": "既に提出済みです。"}, status=status.HTTP_409_CONFLICT)

            # ファイル以外のデータを submitted_data (JSONField) に保存
            submission.submitted_data = request.data
            
            # ここにファイル処理のロジックを追記する
            # 例: request.FILES内のファイルをS3などにアップロードし、そのURLをsubmitted_dataに含める
            # for key, file in request.FILES.items():
            #     file_url = upload_to_s3(file) 
            #     submission.submitted_data[key] = file_url

            submission.status = GuestSubmission.SubmissionStatus.COMPLETED
            submission.save()
            
            # 予約自体のステータスも更新
            submission.reservation.guest_roster_status = Reservation.RosterStatus.SUBMITTED
            submission.reservation.save()
            
            # Google Sheets の提出状況を更新
            self._update_google_sheets_status(submission.reservation)

            return Response(status=status.HTTP_201_CREATED)

        except GuestSubmission.DoesNotExist:
            return Response({"error": "無効なトークンです。"}, status=status.HTTP_404_NOT_FOUND)

    def _update_google_sheets_status(self, reservation):
        """
        Google Sheets の対応する行の提出状況を更新
        施設ごとの google_sheets_url から Sheet ID を抽出して更新
        """
        try:
            property_obj = reservation.property
            
            # 施設ごとの Sheet URL をチェック
            if property_obj.google_sheets_url:
                sheet_id = GoogleSheetsService.extract_sheet_id_from_url(property_obj.google_sheets_url)
                if sheet_id:
                    service = GoogleSheetsService(spreadsheet_id=sheet_id)
                else:
                    return
            else:
                # グローバル設定を使用
                from guest_forms.google_sheets_service import google_sheets_service
                service = google_sheets_service
            
            if not service.is_configured():
                return
            
            # beds24_book_id をキーに Google Sheets の該当行を更新
            service.update_roster_status(
                reservation.beds24_book_id,
                'submitted'
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to update Google Sheets status: {e}")


class GuestFormUpdateView(APIView):
    """
    PUT /api/guest-forms/{token}/update/
    ゲストが入力したフォームの内容を更新する
    """
    def put(self, request, token):
        try:
            submission = GuestSubmission.objects.get(token=token)
            serializer = GuestSubmissionSerializer(submission, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except GuestSubmission.DoesNotExist:
            return Response({"error": "無効なトークンです。"}, status=status.HTTP_404_NOT_FOUND)


# ============================================================================
# 価格設定管理 API
# ============================================================================
from django.utils import timezone
from datetime import datetime, timedelta
from rest_framework.decorators import api_view
from rest_framework.viewsets import ViewSet

class PropertyPricingViewSet(viewsets.ModelViewSet):
    """
    施設の価格設定を取得・更新するAPI
    GET /api/properties/{property_pk}/pricing/
    """
    queryset = Property.objects.all()
    serializer_class = PropertySerializer

    def get_serializer(self, *args, **kwargs):
        """基本設定のシリアライザー"""
        return PropertySerializer(*args, **kwargs)

    def get_basic_settings(self, property_id):
        """基本設定を取得"""
        try:
            prop = Property.objects.get(id=property_id)
            return {
                'basePrice': prop.base_price,
                'baseGuests': prop.base_guests,
                'adultExtraPrice': prop.adult_extra_price,
                'childExtraPrice': prop.child_extra_price,
                'minNights': prop.min_nights,
                'checkInTime': prop.check_in_time.isoformat() if prop.check_in_time else '15:00',
                'checkOutTime': prop.check_out_time.isoformat() if prop.check_out_time else '10:00',
            }
        except Property.DoesNotExist:
            return None

    def update_basic_settings(self, property_id, settings_data):
        """基本設定を更新"""
        try:
            prop = Property.objects.get(id=property_id)
            prop.base_price = settings_data.get('basePrice', prop.base_price)
            prop.base_guests = settings_data.get('baseGuests', prop.base_guests)
            prop.adult_extra_price = settings_data.get('adultExtraPrice', prop.adult_extra_price)
            prop.child_extra_price = settings_data.get('childExtraPrice', prop.child_extra_price)
            prop.min_nights = settings_data.get('minNights', prop.min_nights)
            prop.save()
            return True
        except Property.DoesNotExist:
            return False


class PricingRuleViewSet(viewsets.ModelViewSet):
    """
    日別価格ルールの CRUD API
    GET /api/pricing-rules/?property={property_id}&start_date=2026-03-01&end_date=2026-05-31
    POST /api/pricing-rules/
    PUT /api/pricing-rules/{id}/
    DELETE /api/pricing-rules/{id}/
    """
    serializer_class = PricingRuleSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = PricingRule.objects.all()
        
        # フィルター: property_id
        property_id = self.request.query_params.get('property')
        if property_id:
            queryset = queryset.filter(property_id=property_id)
        
        # フィルター: 日付範囲
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset.order_by('date')


@api_view(['GET', 'POST'])
def pricing_month_view(request, property_id, year, month):
    """
    月別の価格データを取得・作成
    GET /api/pricing/{property_id}/{year}/{month}/
    POST /api/pricing/{property_id}/{year}/{month}/
    """
    from datetime import date, timedelta
    
    # 月の最初と最後の日を計算
    start_date = date(int(year), int(month), 1)
    if int(month) == 12:
        end_date = date(int(year) + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(int(year), int(month) + 1, 1) - timedelta(days=1)

    try:
        property_obj = Property.objects.get(id=property_id)
    except Property.DoesNotExist:
        return Response({'error': '施設が見つかりません'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        # 月のデータを取得
        rules = PricingRule.objects.filter(
            property=property_obj,
            date__range=(start_date, end_date)
        ).order_by('date')
        
        # 基本設定も取得
        basic_settings = {
            'basePrice': property_obj.base_price,
            'baseGuests': property_obj.base_guests,
            'adultExtraPrice': property_obj.adult_extra_price,
            'childExtraPrice': property_obj.child_extra_price,
            'minNights': property_obj.min_nights,
        }
        
        # 全日付分のデータを構築（存在しない日付は基本設定から計算）
        calendar_data = []
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            rule = rules.filter(date=current_date).first()
            
            calendar_data.append({
                'date': date_str,
                'price': rule.price if rule and rule.price else property_obj.base_price,
                'isBlackout': rule.is_blackout if rule else False,
                'blackoutReason': rule.blackout_reason if rule else '',
                'minNights': rule.min_nights if rule and rule.min_nights else property_obj.min_nights,
            })
            current_date += timedelta(days=1)
        
        return Response({
            'basicSettings': basic_settings,
            'calendarData': calendar_data,
        })

    elif request.method == 'POST':
        # 複数の日付のデータを一括更新
        data = request.data.get('updates', [])
        
        for update in data:
            date_obj = datetime.strptime(update['date'], '%Y-%m-%d').date()
            rule, _ = PricingRule.objects.get_or_create(
                property=property_obj,
                date=date_obj,
            )
            
            if update.get('isBlackout'):
                rule.is_blackout = True
                rule.blackout_reason = update.get('blackoutReason', '')
                rule.price = None
            else:
                rule.is_blackout = False
                rule.blackout_reason = ''
                rule.price = update.get('price')
            
            rule.min_nights = update.get('minNights')
            rule.save()
        
        return Response({'status': 'ok'}, status=status.HTTP_201_CREATED)


class Beds24SyncAPIView(APIView):
    """
    POST /api/pricing/{property_id}/sync-beds24/
    Beds24と価格設定を同期
    """
    def post(self, request, property_id):
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {'error': '施設が見つかりません'},
                status=status.HTTP_404_NOT_FOUND
            )

        sync_type = request.data.get('sync_type', 'basic')

        # 1) Beds24から次の365日分の予約を取得
        start_date = date.today()
        end_date = start_date + timedelta(days=365)

        try:
            bookings = fetch_beds24_bookings(start_date, end_date)
        except Beds24SyncError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        # 2) 対象施設に紐づく予約のみ同期
        counts = sync_bookings_to_db(bookings, start_date, end_date, property_filter_id=property_id)

        # 3) 最終同期時刻を返す
        try:
            sync_status = SyncStatus.objects.get(pk=1)
            last_sync = sync_status.last_sync_time
        except SyncStatus.DoesNotExist:
            last_sync = None

        response_data = {
            'status': 'synced',
            'sync_type': sync_type,
            'property_id': property_id,
            'property_name': property_obj.name,
            'created': counts['created'],
            'updated': counts['updated'],
            'cancelled': counts['cancelled'],
            'missing_property': counts['missing_property'],
            'last_sync_time': last_sync.isoformat() if last_sync else None,
        }

        return Response(response_data, status=status.HTTP_200_OK)

