# reservations/admin.py
from django.contrib import admin
from .models import Reservation, SyncStatus

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('property', 'check_in_date', 'guest_name', 'status', 'guest_roster_status')
    list_filter = ('status', 'guest_roster_status', 'property')
    search_fields = ('guest_name', 'guest_email', 'beds24_book_id')

@admin.register(SyncStatus)
class SyncStatusAdmin(admin.ModelAdmin):
    list_display = ('last_sync_time',)