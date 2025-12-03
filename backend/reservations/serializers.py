from rest_framework import serializers
from .models import SyncStatus, Reservation

class SyncStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncStatus
        fields = ['last_sync_time']

class ReservationSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source='property.name', read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id', 
            'beds24_book_id', 
            'guest_name', 
            'check_in_date', 
            'check_out_date', 
            'num_guests', 
            'total_price', 
            'status', 
            'property_name'
        ]
