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


    指定された年度と施設（任意）の月別売上データを集計して提供するAPIビュー


    """





    def get(self, request, *args, **kwargs):


        try:


            selected_year = int(request.query_params.get('year', date.today().year))


        except (ValueError, TypeError):


            selected_year = date.today().year





        property_name = request.query_params.get('property_name')





        start_date = date(selected_year, 1, 1)


        end_date = date(selected_year, 12, 31)





        raw_data = get_revenue_data(start_date, end_date)





        if raw_data is None:


            return Response({"error": "Beds24 APIからのデータ取得に失敗しました。"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





        if property_name:


            # 特定の施設が指定されている場合


            filtered_data = {p_name: year_data for p_name, year_data in raw_data.items() if p_name == property_name}


            response_data = self._format_for_single_property(filtered_data, selected_year)


        else:


            # 全施設の場合（積み上げグラフ用のデータ形式）


            response_data = self._format_for_stacked_chart(raw_data, selected_year)





        return Response(response_data)





    def _format_for_single_property(self, data, year):


        """単一施設（または全施設の合算）の月別データを整形"""


        monthly_revenue = defaultdict(int)


        for facility_name, year_data in data.items():


            if year in year_data:


                for month, revenue in year_data[year].items():


                    monthly_revenue[month] += revenue


        


        result = []


        for month_num in range(1, 13):


            result.append({


                "date": f"{year}-{str(month_num).zfill(2)}",


                "revenue": monthly_revenue.get(month_num, 0)


            })


        return result





    def _format_for_stacked_chart(self, data, year):


        """積み上げ棒グラフ用に、施設名をキーにした月別データを整形"""


        # { "YYYY-MM": { "施設A": 100, "施設B": 200 } } という形式の中間データを作成


        pivoted_data = defaultdict(lambda: defaultdict(int))


        for facility_name, year_data in data.items():


            if year in year_data:


                for month, revenue in year_data[year].items():


                    date_key = f"{year}-{str(month).zfill(2)}"


                    pivoted_data[date_key][facility_name] = revenue


        


        result = []


        for month_num in range(1, 13):


            date_key = f"{year}-{str(month_num).zfill(2)}"


            # 月ごとのオブジェクトを作成し、'date' キーを追加


            month_data = {"date": date_key}


            month_data.update(pivoted_data.get(date_key, {}))


            result.append(month_data)


            


        return result




