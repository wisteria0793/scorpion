# backend/guest_forms/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PropertyViewSet, FacilityImageViewSet, PricingRuleViewSet, pricing_month_view, Beds24SyncAPIView

# Create a router and register our viewset with it.
router = DefaultRouter()
router.register(r'properties', PropertyViewSet, basename='property')
router.register(r'pricing-rules', PricingRuleViewSet, basename='pricing-rule')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
    path('properties/<int:property_pk>/images/', FacilityImageViewSet.as_view({'get': 'list', 'post': 'create'}), name='property-images-list'),
    path('properties/<int:property_pk>/images/<int:pk>/', FacilityImageViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='property-images-detail'),
    
    # 価格設定エンドポイント
    path('pricing/<int:property_id>/<int:year>/<int:month>/', pricing_month_view, name='pricing-month'),
    path('pricing/<int:property_id>/sync-beds24/', Beds24SyncAPIView.as_view(), name='pricing-sync-beds24'),
]
