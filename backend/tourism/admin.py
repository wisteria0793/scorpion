from django.contrib import admin
from .models import TouristAttraction, Event, SeasonalRecommendation


@admin.register(TouristAttraction)
class TouristAttractionAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'address', 'is_active', 'display_order', 'created_at']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['name', 'description', 'address']
    ordering = ['display_order', 'name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('基本情報', {
            'fields': ('id', 'name', 'category', 'description')
        }),
        ('場所情報', {
            'fields': ('address', 'latitude', 'longitude', 'access_info')
        }),
        ('連絡先・詳細', {
            'fields': ('phone_number', 'website_url', 'opening_hours', 'admission_fee')
        }),
        ('表示設定', {
            'fields': ('image', 'is_active', 'display_order')
        }),
        ('日時情報', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['name', 'event_type', 'start_date', 'end_date', 'venue', 'is_recurring', 'is_active', 'created_at']
    list_filter = ['event_type', 'is_active', 'is_recurring', 'start_date', 'created_at']
    search_fields = ['name', 'description', 'venue']
    ordering = ['start_date', 'display_order']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'start_date'
    
    fieldsets = (
        ('基本情報', {
            'fields': ('id', 'name', 'event_type', 'description')
        }),
        ('開催情報', {
            'fields': ('venue', 'address', 'start_date', 'end_date', 'start_time', 'end_time', 'is_recurring')
        }),
        ('連絡先・詳細', {
            'fields': ('contact_info', 'website_url', 'admission_fee')
        }),
        ('表示設定', {
            'fields': ('image', 'is_active', 'display_order')
        }),
        ('日時情報', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(SeasonalRecommendation)
class SeasonalRecommendationAdmin(admin.ModelAdmin):
    list_display = ['title', 'season', 'is_active', 'display_order', 'created_at']
    list_filter = ['season', 'is_active', 'created_at']
    search_fields = ['title', 'description']
    ordering = ['display_order', 'season']
    readonly_fields = ['id', 'created_at', 'updated_at']
    filter_horizontal = ['related_attractions', 'related_events']
    
    fieldsets = (
        ('基本情報', {
            'fields': ('id', 'season', 'title', 'description')
        }),
        ('関連情報', {
            'fields': ('related_attractions', 'related_events')
        }),
        ('表示設定', {
            'fields': ('image', 'is_active', 'display_order')
        }),
        ('日時情報', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

