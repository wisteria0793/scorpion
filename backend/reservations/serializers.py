from rest_framework import serializers
from .models import SyncStatus, Reservation
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


