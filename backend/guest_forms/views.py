# backend/guest_forms/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from datetime import datetime, date
from collections import defaultdict

from .models import Reservation, GuestSubmission, Property
from .serializers import FormTemplateSerializer
from .services import get_revenue_data

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


import calendar
from datetime import date, timedelta

class RevenueAPIView(APIView):
    """
    指定された会計年度と施設（任意）の月別売上データを集計して提供するAPIビュー
    会計年度は3月から翌年2月までとする。
    """

    def get(self, request, *args, **kwargs):
        try:
            # フロントエンドから渡される「年度」は、会計年度の開始年とする (例: 2025年度は2025)
            selected_year = int(request.query_params.get('year', date.today().year))
        except (ValueError, TypeError):
            selected_year = date.today().year

        property_name = request.query_params.get('property_name')

        # 会計年度の開始日と終了日を決定 (例: 2025年度 -> 2025-03-01 ~ 2026-02-28/29)
        start_date = date(selected_year, 3, 1)
        end_of_feb_next_year = date(selected_year + 1, 3, 1) - timedelta(days=1)
        end_date = end_of_feb_next_year

        raw_data = get_revenue_data(start_date, end_date)

        if raw_data is None:
            return Response({"error": "Beds24 APIからのデータ取得に失敗しました。"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if property_name:
            # 特定の施設が指定されている場合
            filtered_data = {p_name: year_data for p_name, year_data in raw_data.items() if p_name == property_name}
            response_data = self._format_for_single_property(filtered_data, start_date, end_date)
        else:
            # 全施設の場合（積み上げグラフ用のデータ形式）
            response_data = self._format_for_stacked_chart(raw_data, start_date, end_date)

        return Response(response_data)

    def _format_for_single_property(self, data, start_date, end_date):
        """単一施設（または全施設の合算）の月別データを整形"""
        monthly_revenue = defaultdict(int)
        for facility_name, year_data in data.items():
            for year, month_data in year_data.items():
                for month, revenue in month_data.items():
                     # yearとmonthを組み合わせたキーで集計
                    monthly_revenue[f"{year}-{str(month).zfill(2)}"] += revenue
        
        result = []
        current_date = start_date
        while current_date <= end_date:
            date_key = current_date.strftime('%Y-%m')
            result.append({
                "date": date_key,
                "revenue": monthly_revenue.get(date_key, 0)
            })
            # 次の月へ
            next_month = current_date.month + 1
            next_year = current_date.year
            if next_month > 12:
                next_month = 1
                next_year += 1
            current_date = date(next_year, next_month, 1)
            
        return result

    def _format_for_stacked_chart(self, data, start_date, end_date):
        """積み上げ棒グラフ用に、施設名をキーにした月別データを整形し、合計も追加"""
        pivoted_data = defaultdict(lambda: defaultdict(int))
        for facility_name, year_data in data.items():
            for year, month_data in year_data.items():
                for month, revenue in year_data[year].items():
                    date_key = f"{year}-{str(month).zfill(2)}"
                    pivoted_data[date_key][facility_name] = revenue
        
        result = []
        current_date = start_date
        while current_date <= end_date:
            date_key = current_date.strftime('%Y-%m')
            month_data = {"date": date_key}
            
            # 月ごとの施設別売上と合計を計算
            details = pivoted_data.get(date_key, {})
            total = sum(details.values())
            month_data.update(details)
            month_data['total'] = total
            
            result.append(month_data)

            # 次の月へ
            next_month = current_date.month + 1
            next_year = current_date.year
            if next_month > 12:
                next_month = 1
                next_year += 1
            current_date = date(next_year, next_month, 1)
            
        return result




