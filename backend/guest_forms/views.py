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


        # クエリパラメータから年度と施設名を取得


        try:


            selected_year = int(request.query_params.get('year', date.today().year))


        except (ValueError, TypeError):


            selected_year = date.today().year





        property_name = request.query_params.get('property_name')





        # 選択された年度の開始日と終了日を決定


        start_date = date(selected_year, 1, 1)


        end_date = date(selected_year, 12, 31)





        # サービス関数を呼び出して全データを取得


        raw_data = get_revenue_data(start_date, end_date)





        if raw_data is None:


            return Response(


                {"error": "Beds24 APIからのデータ取得に失敗しました。"},


                status=status.HTTP_500_INTERNAL_SERVER_ERROR


            )


        


        # 指定された施設名でデータをフィルタリング


        if property_name:


            filtered_data = {


                p_name: year_data 


                for p_name, year_data in raw_data.items() 


                if p_name == property_name


            }


        else:


            # 施設名が指定されなければ、全施設のデータを対象とする


            filtered_data = raw_data





        # データを月別に整形


        response_data = self._format_data_monthly(filtered_data)





        return Response(response_data)





    def _format_data_monthly(self, data):


        """


        データを月別に集計・整形する


        """


        monthly_revenue = defaultdict(int)


        for facility_name, year_data in data.items():


            for year, month_data in year_data.items():


                for month, revenue in month_data.items():


                    # yearとmonthを組み合わせたキーで集計


                    monthly_revenue[f"{year}-{str(month).zfill(2)}"] += revenue


        


        # 1年分の月のデータが揃うように、0埋めしたデータを作成


        # dataのキーからyearを取得（複数年にまたがることはない想定）


        year = next(iter(next(iter(data.values()))), None) if data else date.today().year


        


        result = []


        for month_num in range(1, 13):


            date_key = f"{year}-{str(month_num).zfill(2)}"


            result.append({


                "date": date_key,


                "revenue": monthly_revenue.get(date_key, 0)


            })





        return result

