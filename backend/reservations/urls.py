# reservations/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('check-in/<slug:facility_slug>/', views.ReservationLookupView.as_view(), name='reservation-lookup'),
    path('guest-forms/<uuid:token>/', views.GuestFormDetailView.as_view(), name='guest-form-detail'),
    path('guest-forms/<uuid:token>/submit/', views.GuestFormSubmitView.as_view(), name='guest-form-submit'),
    path('revenue/', views.RevenueAPIView.as_view(), name='revenue-api'),
    path('revenue/yoy/', views.YoYRevenueAPIView.as_view(), name='yoy-revenue-api'),
    path('analytics/nationality/', views.NationalityRatioAPIView.as_view(), name='nationality-ratio-api'),
    path('reservations/monthly/', views.MonthlyReservationListView.as_view(), name='monthly-reservations-api'),
    path('sync-status/', views.LastSyncTimeView.as_view(), name='sync-status'),
]