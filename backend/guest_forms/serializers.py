# backend/guest_forms/serializers.py

from rest_framework import serializers
from .models import FormField, FormTemplate, Property, FacilityImage, GuestSubmission

class FacilityImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacilityImage
        fields = ['id', 'image', 'property', 'order']
        read_only_fields = ['property']

class PropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = '__all__'

class FormFieldSerializer(serializers.ModelSerializer):
    """
    フォームの各項目をJSON化するためのシリアライザー
    """
    class Meta:
        model = FormField
        # フロントエンドに必要なフィールドのみを定義
        fields = ['label', 'field_type', 'options', 'is_required']

class FormTemplateSerializer(serializers.ModelSerializer):
    """
    フォームテンプレート全体をJSON化するためのシリアライザー
    ネストしたFormFieldも一緒にJSON化する
    """
    # related_name='fields' を利用して、紐づくFormFieldをネストして含める
    fields = FormFieldSerializer(many=True, read_only=True)
    
    class Meta:
        model = FormTemplate
        fields = ['name', 'fields']

class GuestSubmissionSerializer(serializers.ModelSerializer):
    """
    ゲストからの提出データをJSON化するためのシリアライザー
    """
    class Meta:
        model = GuestSubmission
        fields = ['submitted_data']
