from rest_framework import serializers
from .models import SyncStatus, Reservation, AccommodationTax
from .models_pricing import DailyRate
from guest_forms.models import GuestSubmission

class SyncStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncStatus
        fields = ['last_sync_time']

class ReservationSerializer(serializers.ModelSerializer):

    property_name = serializers.CharField(source='property.name', read_only=True)

    accommodation_tax_status = serializers.SerializerMethodField()



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

            'property_name',

            'guest_roster_status',

            'accommodation_tax_status'

        ]



    def get_accommodation_tax_status(self, obj):

        try:

            submission = obj.guestsubmission

            if submission and submission.submitted_data:

                # 'accommodation_tax' in submitted_data means it's paid

                if submission.submitted_data.get('accommodation_tax'):

                    return '済'

        except AttributeError:

            pass

        return '未'

class DebugReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = '__all__'


class AccommodationTaxSerializer(serializers.ModelSerializer):
    reservation_guest_name = serializers.CharField(source='reservation.guest_name', read_only=True)
    property_name = serializers.CharField(source='reservation.property.name', read_only=True)
    check_in_date = serializers.DateField(source='reservation.check_in_date', read_only=True)
    check_out_date = serializers.DateField(source='reservation.check_out_date', read_only=True)

    class Meta:
        model = AccommodationTax
        fields = [
            'id',
            'reservation',
            'property_name',
            'reservation_guest_name',
            'check_in_date',
            'check_out_date',
            'tax_type',
            'num_nights',
            'tax_rate',
            'tax_amount',
            'payment_status',
            'payment_method',
            'payment_date',
            'payment_reference',
            'notes',
            'created_at',
            'updated_at',
        ]


class DailyRateSerializer(serializers.ModelSerializer):
    """日別料金のシリアライザー"""
    property_name = serializers.CharField(source='property.name', read_only=True)
    property_id = serializers.IntegerField(source='property.id', read_only=True)
    
    class Meta:
        model = DailyRate
        fields = [
            'id',
            'property',
            'property_id',
            'property_name',
            'date',
            'base_price',
            'available',
            'min_stay',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
