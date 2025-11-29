from rest_framework import serializers
from .models import SyncStatus

class SyncStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncStatus
        fields = ['last_sync_time']
