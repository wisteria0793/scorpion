# backend/guest_forms/views.py
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from .models import Property, FacilityImage, GuestSubmission, FormTemplate
from .serializers import PropertySerializer, FacilityImageSerializer, FormTemplateSerializer, GuestSubmissionSerializer

@method_decorator(csrf_exempt, name='dispatch')
class PropertyViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows properties to be viewed or edited.
    """
    queryset = Property.objects.all().order_by('name')
    serializer_class = PropertySerializer

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
