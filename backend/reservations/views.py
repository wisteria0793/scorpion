# reservations/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from datetime import datetime, date, timedelta
from collections import defaultdict
import calendar

from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth, Extract

from .models import Reservation, SyncStatus
from guest_forms.models import GuestSubmission, Property, FormTemplate
from .serializers import SyncStatusSerializer, ReservationSerializer, DebugReservationSerializer


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
            queryset = queryset.filter(property__management_type=property_name)

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
            m_type = item["property__management_type"] or '不明'
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

class YoYRevenueAPIView(APIView):
    """
    前年同月比の売上データを生成するAPIビュー。
    """
    def get(self, request, *args, **kwargs):
        try:
            today = date.today()
            default_year = today.year - 1 if today.month < 3 else today.year
            selected_year = int(request.query_params.get('year', default_year))
        except (ValueError, TypeError):
            selected_year = default_year

        property_name = request.query_params.get('property_name')

        # 対象年度と前年度のデータを取得
        current_year_data = self._get_revenue_data(selected_year, property_name)
        previous_year_data = self._get_revenue_data(selected_year - 1, property_name)

        # データをマージ
        response_data = []
        for i in range(12):
            month_label = f"{((i + 2) % 12) + 1}月" # 3月から始まるため
            response_data.append({
                "month": month_label,
                "current_year": current_year_data[i].get("total", 0),
                "previous_year": previous_year_data[i].get("total", 0),
            })
        
        return Response(response_data)

    def _get_revenue_data(self, year, property_name):
        start_date = date(year, 3, 1)
        end_date = (date(year + 1, 3, 1) - timedelta(days=1))

        queryset = Reservation.objects.filter(
            check_in_date__range=(start_date, end_date),
            status__in=['Confirmed', 'New']
        )
        if property_name:
            queryset = queryset.filter(property__management_type=property_name)
        
        monthly_totals = queryset.annotate(
            month=Extract('check_in_date', 'month')
        ).values('month').annotate(
            total=Sum('total_price')
        ).order_by('month')

        revenue_by_month = {item['month']: item['total'] or 0 for item in monthly_totals}

        result_list = []
        # Fiscal year months: Mar, Apr, ..., Dec, Jan, Feb
        fiscal_month_order = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2]
        
        for month in fiscal_month_order:
            result_list.append({"total": revenue_by_month.get(month, 0)})

        return result_list


class NationalityRatioAPIView(APIView):
    """
    国籍別比率データを生成するAPIビュー。
    """
    def get(self, request, *args, **kwargs):
        try:
            today = date.today()
            default_year = today.year - 1 if today.month < 3 else today.year
            selected_year = int(request.query_params.get('year', default_year))
        except (ValueError, TypeError):
            selected_year = default_year

        property_name = request.query_params.get('property_name')
        
        start_date = date(selected_year, 3, 1)
        end_date = (date(selected_year + 1, 3, 1) - timedelta(days=1))

        submissions = GuestSubmission.objects.filter(
            reservation__check_in_date__range=(start_date, end_date),
            status=GuestSubmission.SubmissionStatus.COMPLETED
        ).select_related('reservation__property')

        if property_name:
            submissions = submissions.filter(reservation__property__management_type=property_name)

        nationality_counts = defaultdict(int)
        for submission in submissions:
            if submission.submitted_data:
                # 'nationality' or 'country' key, case-insensitive
                nationality = submission.submitted_data.get('nationality') or submission.submitted_data.get('country')
                if nationality:
                    nationality_counts[nationality] += 1
                else:
                    nationality_counts['不明'] += 1
            else:
                nationality_counts['不明'] += 1

        response_data = [{"country": country, "count": count} for country, count in nationality_counts.items()]
        
        return Response(response_data)


from django.http import HttpResponse
import csv

class DownloadRevenueCSVView(APIView):
    """
    選択された会計年度の売上データをCSV形式でダウンロードするAPIビュー。
    """
    def get(self, request, *args, **kwargs):
        try:
            today = date.today()
            default_year = today.year - 1 if today.month < 3 else today.year
            selected_year = int(request.query_params.get('year', default_year))
        except (ValueError, TypeError):
            selected_year = default_year

        # 会計年度の開始日と終了日を決定
        start_date = date(selected_year, 3, 1)
        end_date = date(selected_year + 1, 3, 1) - timedelta(days=1)

        # データ取得
        queryset = Reservation.objects.filter(
            check_in_date__range=(start_date, end_date),
            status__in=['Confirmed', 'New']
        ).select_related('property')

        # 施設ごと、および管理タイプごとの月別売上を計算
        facility_monthly_sales = defaultdict(lambda: defaultdict(int))
        subtotals = defaultdict(lambda: defaultdict(int))
        facilities_by_type = defaultdict(list)
        
        for res in queryset:
            month_key = res.check_in_date.strftime('%Y-%m')
            prop = res.property
            
            facility_monthly_sales[prop.name][month_key] += res.total_price
            
            management_type = prop.management_type or '不明'
            subtotals[management_type][month_key] += res.total_price
            
            if prop.name not in facilities_by_type[management_type]:
                facilities_by_type[management_type].append(prop.name)

        # CSVファイルを作成
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="revenue_{selected_year}_{today.strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)

        # 生成日を記入
        writer.writerow([f"生成日: {today.strftime('%Y-%m-%d')}"])
        writer.writerow([]) # 空行

        # ヘッダー行の作成
        months = []
        current_date = start_date
        while current_date <= end_date:
            months.append(current_date.strftime('%Y-%m'))
            if current_date.month == 12:
                current_date = date(current_date.year + 1, 1, 1)
            else:
                current_date = date(current_date.year, current_date.month + 1, 1)

        header = ["施設名"] + months + ["年間売上"]
        writer.writerow(header)

        # データ行の作成 (管理タイプごとにグループ化し、その後に小計)
        all_monthly_totals = defaultdict(int)
        
        # '自社' を先に、次に '受託'、その後に他のタイプをソートして表示
        management_order = ['自社', '受託']
        sorted_types = sorted(facilities_by_type.keys(), key=lambda x: (management_order.index(x) if x in management_order else len(management_order), x))

        for m_type in sorted_types:
            # 管理タイプごとのセクションヘッダー (任意)
            writer.writerow([f"--- {m_type} ---"])
            
            for facility in sorted(facilities_by_type[m_type]):
                monthly_sales = facility_monthly_sales[facility]
                yearly_sales = sum(monthly_sales.values())
                row = [facility]
                for month in months:
                    sales = monthly_sales.get(month, 0)
                    row.append(sales)
                    all_monthly_totals[month] += sales # 合計行のために集計
                row.append(yearly_sales)
                writer.writerow(row)
            
            # 管理タイプごとの小計
            if m_type in subtotals:
                monthly_sales = subtotals[m_type]
                yearly_total = sum(monthly_sales.values())
                row = [f"小計({m_type})"]
                for month in months:
                    row.append(monthly_sales.get(month, 0))
                row.append(yearly_total)
                writer.writerow(row)
            writer.writerow([]) # セクション間の空行
            
        # 合計行の作成
        grand_total = sum(all_monthly_totals.values())
        total_row = ["合計"]
        for month in months:
            total_row.append(all_monthly_totals[month])
        total_row.append(grand_total)
        writer.writerow(total_row)

        return response
class MonthlyReservationListView(APIView):
    """
    指定された年/月の予約リストを返すAPIビュー。
    """
    def get(self, request, *args, **kwargs):
        try:
            year = int(request.query_params.get('year'))
            month = int(request.query_params.get('month'))
        except (ValueError, TypeError, KeyError):
            return Response(
                {"error": "year and month query parameters are required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        property_name = request.query_params.get('property_name')

        queryset = Reservation.objects.filter(
            check_in_date__year=year,
            check_in_date__month=month
        ).exclude(status='Cancelled').select_related('property').prefetch_related('guestsubmission').order_by('check_in_date')

        if property_name:
            queryset = queryset.filter(property__management_type=property_name)

        serializer = ReservationSerializer(queryset, many=True)
        return Response(serializer.data)

class DebugReservationListView(APIView):
    """
    デバッグ用：すべての予約データを返す（最新100件）
    """
    def get(self, request, *args, **kwargs):
        queryset = Reservation.objects.order_by('-updated_at')[:100]
        serializer = DebugReservationSerializer(queryset, many=True)
        return Response(serializer.data)
