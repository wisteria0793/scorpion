# reservations/urls.py
from django.urls import path
from . import views
from guest_forms import views as guest_forms_views

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
]