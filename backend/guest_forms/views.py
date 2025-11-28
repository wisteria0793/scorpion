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


class RevenueAPIView(APIView):
    """
    施設ごとの売上データを集計して提供するAPIビュー
    """

    def get(self, request, *args, **kwargs):
        # クエリパラメータから日付とフィルター条件を取得
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        group_by = request.query_params.get('group_by', 'month') # デフォルトは月別
        property_name = request.query_params.get('property_name') # 追加: 施設名フィルター
        selected_year = request.query_params.get('year') # 追加: 年度フィルター

        # 日付パラメータがなければ、今年の1月1日から今日までをデフォルトとする
        today = date.today()
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else date(today.year, 1, 1)
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else today
        except ValueError:
            return Response(
                {"error": "日付の形式は 'YYYY-MM-DD' にしてください。"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # サービス関数を呼び出してデータを取得
        raw_data = get_revenue_data(start_date, end_date)

        if raw_data is None:
            return Response(
                {"error": "Beds24 APIからのデータ取得に失敗しました。"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # property_nameとyearでrawDataをフィルター
        filtered_data = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
        for p_name, year_data in raw_data.items():
            if property_name and p_name != property_name:
                continue # 指定された施設名と異なる場合はスキップ

            for year, month_data in year_data.items():
                if selected_year and int(year) != int(selected_year):
                    continue # 指定された年度と異なる場合はスキップ

                filtered_data[p_name][year] = month_data # フィルターを通ったデータを格納

        # group_by パラメータに応じてデータを整形
        response_data = self._format_data(filtered_data, group_by)

        return Response(response_data)

    def _format_data(self, raw_data, group_by):
        """
        取得した売上データを指定された粒度で集計・整形する
        raw_data format: {facility_name: {year: {month: revenue}}}
        """
        if group_by == 'facility':
            # 施設別の総売上
            # { "name": "施設A", "total_revenue": 12345 }
            result = []
            for facility_name, year_data in raw_data.items():
                total_revenue = sum(
                    revenue
                    for year, month_data in year_data.items()
                    for month, revenue in month_data.items()
                )
                result.append({
                    "name": facility_name,
                    "total_revenue": total_revenue
                })
            return result
        
        elif group_by == 'year':
            # 年度別の総売上
            # { "year": 2025, "revenue": 123456 }
            yearly_revenue = defaultdict(int)
            for facility_name, year_data in raw_data.items():
                for year, month_data in year_data.items():
                    yearly_revenue[year] += sum(month_data.values())
            
            return [{"year": year, "revenue": revenue} for year, revenue in sorted(yearly_revenue.items())]

        else: # default to 'month'
            # 月別の総売上
            # { "date": "2025-01", "revenue": 12345 }
            monthly_revenue = defaultdict(int)
            # raw_data はすでに property_name と year でフィルターされていることを想定
            for facility_name, year_data in raw_data.items():
                for year, month_data in year_data.items():
                    for month, revenue in month_data.items():
                         # yearとmonthを組み合わせたキーで集計
                        monthly_revenue[f"{year}-{str(month).zfill(2)}"] += revenue
            
            return [
                {"date": date_key, "revenue": revenue}
                for date_key, revenue in sorted(monthly_revenue.items())
            ]