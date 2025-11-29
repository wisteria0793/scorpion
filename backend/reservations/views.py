# reservations/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from datetime import datetime, date, timedelta
from collections import defaultdict
import calendar

from django.db.models import Sum
from django.db.models.functions import TruncMonth

from .models import Reservation, SyncStatus
from guest_forms.models import GuestSubmission, Property, FormTemplate
from guest_forms.serializers import FormTemplateSerializer
from .serializers import SyncStatusSerializer


class ReservationLookupView(APIView):
    """
    POST /api/check-in/{facility_slug}/
    施設スラグとチェックイン日から予約を検索し、フォーム提出用のトークンを返す
    """
    def post(self, request, facility_slug):
        check_in_date = request.data.get('check_in_date')
        if not check_in_date:
            return Response(
                {"error": "チェックイン日が必要です。"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # スラグと日付で予約を検索
            reservation = Reservation.objects.get(
                property__slug=facility_slug,
                check_in_date=check_in_date
            )
            
            # 予約に紐づく提出レコードを（なければ）作成
            submission, created = GuestSubmission.objects.get_or_create(reservation=reservation)
            
            # 既に提出完了済みの場合はエラーを返す
            if submission.status == GuestSubmission.SubmissionStatus.COMPLETED:
                return Response(
                    {"error": "この予約の宿泊者名簿は既に提出済みです。"},
                    status=status.HTTP_409_CONFLICT
                )

            return Response({"token": submission.token}, status=status.HTTP_200_OK)

        except Reservation.DoesNotExist:
            return Response(
                {"error": "該当する予約が見つかりませんでした。"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class GuestFormDetailView(APIView):
    """
    GET /api/guest-forms/{token}/
    トークンを元に、表示すべきフォームの定義(JSON)を返す
    """
    def get(self, request, token):
        try:
            submission = GuestSubmission.objects.get(token=token)
            template = submission.reservation.property.form_template
            
            if not template:
                return Response({"error": "この施設にはフォームが設定されていません。"}, status=status.HTTP_404_NOT_FOUND)

            serializer = FormTemplateSerializer(template)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except GuestSubmission.DoesNotExist:
            return Response({"error": "無効なトークンです。"}, status=status.HTTP_404_NOT_FOUND)


class GuestFormSubmitView(APIView):
    """
    POST /api/guest-forms/{token}/submit/
    ゲストが入力したフォームの内容を保存する
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

            return Response(status=status.HTTP_201_CREATED)

        except GuestSubmission.DoesNotExist:
            return Response({"error": "無効なトークンです。"}, status=status.HTTP_404_NOT_FOUND)


class RevenueAPIView(APIView):
    """
    ローカルDBに保存された予約データから、月別売上レポートを生成するAPIビュー。
    会計年度は3月から翌年2月までとする。
    """
    def get(self, request, *args, **kwargs):
        try:
            today = date.today()
            default_year = today.year - 1 if today.month < 3 else today.year
            selected_year = int(request.query_params.get('year', default_year))
        except (ValueError, TypeError):
            selected_year = default_year

        property_name = request.query_params.get('property_name')

        # 会計年度の開始日と終了日を決定
        start_date = date(selected_year, 3, 1)
        end_date = (date(selected_year + 1, 3, 1) - timedelta(days=1))

        # ベースとなるクエリセットを作成
        queryset = Reservation.objects.filter(
            check_in_date__range=(start_date, end_date),
            status__in=['Confirmed', 'New'] # 集計対象とするステータス
        )

        # 特定の施設が指定されていれば、それでフィルタリング
        if property_name:
            queryset = queryset.filter(property__name=property_name)

        # 全施設か単一施設かで返すデータ形式を変える
        if property_name:
            # 単一施設: 月ごとの合計売上を返す
            monthly_totals = queryset.annotate(
                month=TruncMonth('check_in_date')
            ).values('month').annotate(
                total=Sum('total_price')
            ).order_by('month')
            
            response_data = self._format_for_single_property(monthly_totals, start_date, end_date)
        else:
            # 全施設: 管理形態ごとの月別売上を返す (積み上げグラフ用)
            monthly_by_type = queryset.annotate(
                month=TruncMonth('check_in_date')
            ).values('month', 'property__management_type').annotate(
                total=Sum('total_price')
            ).order_by('month', 'property__management_type')

            response_data = self._format_for_stacked_chart(monthly_by_type, start_date, end_date)

        print(f"DEBUG: property_name='{property_name}', response_data={response_data}")
        return Response(response_data)

    def _format_for_single_property(self, monthly_totals, start_date, end_date):
        """月別合計のクエリセットを、12ヶ月分のデータに整形する"""
        revenue_map = {item['month'].strftime('%Y-%m'): item['total'] for item in monthly_totals}
        
        result = []
        current_date = start_date
        while current_date <= end_date:
            date_key = current_date.strftime('%Y-%m')
            result.append({
                "date": date_key,
                "revenue": revenue_map.get(date_key, 0) or 0
            })
            # 次の月へ
            next_month = current_date.month % 12 + 1
            next_year = current_date.year + (1 if current_date.month == 12 else 0)
            current_date = date(next_year, next_month, 1)
        return result

    def _format_for_stacked_chart(self, monthly_by_type, start_date, end_date):
        """管理形態ごとの月別クエリセットを、積み上げグラフ用の形式に整形する"""
        pivoted_data = defaultdict(lambda: defaultdict(int))
        for item in monthly_by_type:
            date_key = item['month'].strftime('%Y-%m')
            # management_type が None や空文字の場合は '不明' とする
            m_type = item['property__management_type'] or '不明'
            pivoted_data[date_key][m_type] = item['total'] or 0

        result = []
        current_date = start_date
        while current_date <= end_date:
            date_key = current_date.strftime('%Y-%m')
            month_data = {"date": date_key}
            details = pivoted_data.get(date_key, {})
            total = sum(details.values())
            month_data.update(details)
            month_data['total'] = total
            result.append(month_data)

            # 次の月へ
            next_month = current_date.month % 12 + 1
            next_year = current_date.year + (1 if current_date.month == 12 else 0)
            current_date = date(next_year, next_month, 1)
        return result


class LastSyncTimeView(APIView):
    """
    GET /api/sync-status/
    最終同期時刻を返す
    """
    def get(self, request, *args, **kwargs):
        try:
            # SyncStatusは常にpk=1の単一レコードとして扱う
            sync_status = SyncStatus.objects.get(pk=1)
            serializer = SyncStatusSerializer(sync_status)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except SyncStatus.DoesNotExist:
            # まだ一度も同期されていない場合
            return Response(
                {"error": "No sync has been performed yet."},
                status=status.HTTP_404_NOT_FOUND
            )