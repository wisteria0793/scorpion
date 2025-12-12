# reservations/admin.py
from django.contrib import admin
from .models import Reservation, SyncStatus, AccommodationTax
from .models_pricing import DailyRate

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('property', 'check_in_date', 'guest_name', 'status', 'guest_roster_status')
    list_filter = ('status', 'guest_roster_status', 'property')
    search_fields = ('guest_name', 'guest_email', 'beds24_book_id')

@admin.register(SyncStatus)
class SyncStatusAdmin(admin.ModelAdmin):
    list_display = ('last_sync_time',)

@admin.register(AccommodationTax)
class AccommodationTaxAdmin(admin.ModelAdmin):
    list_display = ('reservation', 'tax_type', 'tax_amount', 'payment_status', 'payment_date')
    list_filter = ('payment_status', 'tax_type', 'created_at')
    search_fields = ('reservation__guest_name', 'payment_reference')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('予約情報', {
            'fields': ('reservation',)
        }),
        ('税情報', {
            'fields': ('tax_type', 'num_nights', 'tax_rate', 'tax_amount')
        }),
        ('支払情報', {
            'fields': ('payment_status', 'payment_method', 'payment_date', 'payment_reference', 'notes')
        }),
        ('タイムスタンプ', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(DailyRate)
class DailyRateAdmin(admin.ModelAdmin):
    list_display = ('property', 'date', 'base_price', 'available', 'min_stay', 'updated_at')
    list_filter = ('property', 'available', 'date')
    search_fields = ('property__name',)
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'date'
    ordering = ['-date', 'property']
    
    fieldsets = (
        ('施設・日付', {
            'fields': ('property', 'date')
        }),
        ('料金情報', {
            'fields': ('base_price', 'available', 'min_stay')
        }),
        ('Beds24データ', {
            'fields': ('beds24_data',),
            'classes': ('collapse',)
        }),
        ('タイムスタンプ', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )