from rest_framework import serializers
from .models import TouristAttraction, Event, SeasonalRecommendation


class TouristAttractionSerializer(serializers.ModelSerializer):
    """観光施設のシリアライザー"""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = TouristAttraction
        fields = [
            'id',
            'name',
            'category',
            'category_display',
            'description',
            'address',
            'latitude',
            'longitude',
            'phone_number',
            'website_url',
            'opening_hours',
            'admission_fee',
            'access_info',
            'image',
            'is_active',
            'display_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EventSerializer(serializers.ModelSerializer):
    """イベントのシリアライザー"""
    
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id',
            'name',
            'event_type',
            'event_type_display',
            'description',
            'venue',
            'address',
            'start_date',
            'end_date',
            'start_time',
            'end_time',
            'is_recurring',
            'contact_info',
            'website_url',
            'admission_fee',
            'image',
            'is_active',
            'display_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """開始日と終了日の検証"""
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] > data['end_date']:
                raise serializers.ValidationError(
                    "終了日は開始日以降である必要があります。"
                )
        return data


class SeasonalRecommendationSerializer(serializers.ModelSerializer):
    """季節のおすすめのシリアライザー"""
    
    season_display = serializers.CharField(source='get_season_display', read_only=True)
    related_attractions = TouristAttractionSerializer(many=True, read_only=True)
    related_events = EventSerializer(many=True, read_only=True)
    related_attraction_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        queryset=TouristAttraction.objects.all(),
        source='related_attractions',
        required=False
    )
    related_event_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        queryset=Event.objects.all(),
        source='related_events',
        required=False
    )
    
    class Meta:
        model = SeasonalRecommendation
        fields = [
            'id',
            'season',
            'season_display',
            'title',
            'description',
            'related_attractions',
            'related_attraction_ids',
            'related_events',
            'related_event_ids',
            'image',
            'is_active',
            'display_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
