# backend/guest_forms/admin.py

from django.contrib import admin
from .models import Property, FormTemplate, FormField, GuestSubmission, Amenity, FacilityImage, PricingRule

class FormFieldInline(admin.TabularInline):
    model = FormField
    extra = 1 # 新規追加用に1つの空欄を表示
    # 多言語対応のJSONFieldを管理画面で編集しやすくするためのウィジェットを後で追加する可能性あり

@admin.register(FormTemplate)
class FormTemplateAdmin(admin.ModelAdmin):
    list_display = ('name_ja', 'created_at') # 多言語対応後の表示
    inlines = [FormFieldInline]

    def name_ja(self, obj):
        return obj.name.get('ja', str(obj.name))
    name_ja.short_description = "テンプレート名 (日本語)"


class FacilityImageInline(admin.TabularInline):
    model = FacilityImage
    extra = 1 # 新規追加用に1つの空欄を表示

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'form_template')
    prepopulated_fields = {'slug': ('name',)} # nameからslugを自動生成
    inlines = [FacilityImageInline] # FacilityImageをインラインで追加



@admin.register(GuestSubmission)
class GuestSubmissionAdmin(admin.ModelAdmin):
    list_display = ('reservation', 'status', 'updated_at')
    list_filter = ('status',)
    readonly_fields = ('token', 'reservation', 'submitted_data', 'created_at', 'updated_at')

@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(PricingRule)
class PricingRuleAdmin(admin.ModelAdmin):
    list_display = ('property', 'date', 'price', 'min_nights', 'is_blackout')
    list_filter = ('property', 'is_blackout', 'date')
    search_fields = ('property__name', 'blackout_reason')
    date_hierarchy = 'date'
    ordering = ('-date',)

# FormFieldはFormTemplateのインラインで管理するため、単独での登録は不要
# admin.site.register(FormField)