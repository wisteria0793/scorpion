# backend/guest_forms/admin.py

from django.contrib import admin
from .models import Property, Reservation, FormTemplate, FormField, GuestSubmission

class FormFieldInline(admin.TabularInline):
    model = FormField
    extra = 1 # 新規追加用に1つの空欄を表示

@admin.register(FormTemplate)
class FormTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    inlines = [FormFieldInline]

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'form_template')
    prepopulated_fields = {'slug': ('name',)} # nameからslugを自動生成

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('property', 'check_in_date', 'guest_name', 'guest_roster_status')
    list_filter = ('guest_roster_status', 'property')
    search_fields = ('guest_name', 'guest_email')

@admin.register(GuestSubmission)
class GuestSubmissionAdmin(admin.ModelAdmin):
    list_display = ('reservation', 'status', 'updated_at')
    list_filter = ('status',)
    readonly_fields = ('token', 'reservation', 'submitted_data', 'created_at', 'updated_at')

# FormFieldはFormTemplateのインラインで管理するため、単独での登録は不要
# admin.site.register(FormField)
