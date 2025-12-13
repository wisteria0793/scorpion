# reservations/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from guest_forms import views as guest_forms_views

router = DefaultRouter()
router.register(r'accommodation-taxes', views.AccommodationTaxViewSet, basename='accommodation-tax')
router.register(r'daily-rates', views.DailyRateViewSet, basename='daily-rate')

urlpatterns = [
    path('check-in/<slug:facility_slug>/', views.ReservationLookupView.as_view(), name='reservation-lookup'),
    path('guest-forms/<uuid:token>/', guest_forms_views.GuestFormDetailView.as_view(), name='guest-form-detail'),
    path('guest-forms/<uuid:token>/submit/', guest_forms_views.GuestFormSubmitView.as_view(), name='guest-form-submit'),
    path('guest-forms/<uuid:token>/update/', guest_forms_views.GuestFormUpdateView.as_view(), name='guest-form-update'),
    path('revenue/csv/', views.DownloadRevenueCSVView.as_view(), name='revenue-csv'),
    path('revenue/', views.RevenueAPIView.as_view(), name='revenue-api'),
    path('revenue/yoy/', views.YoYRevenueAPIView.as_view(), name='yoy-revenue-api'),
    path('analytics/nationality/', views.NationalityRatioAPIView.as_view(), name='nationality-ratio-api'),
    path('reservations/monthly/', views.MonthlyReservationListView.as_view(), name='monthly-reservations-api'),
    path('sync-status/', views.LastSyncTimeView.as_view(), name='sync-status'),
    path('debug/reservations/', views.DebugReservationListView.as_view(), name='debug-reservations-api'),
    # 宿泊者名簿提出状況API
    path('roster-status/', views.RosterSubmissionStatusView.as_view(), name='roster-status'),
    path('roster-stats/', views.RosterSubmissionStatsView.as_view(), name='roster-stats'),
    path('pending-rosters/', views.PendingRostersView.as_view(), name='pending-rosters'),
] + router.urls