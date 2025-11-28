# backend/guest_forms/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('check-in/<slug:facility_slug>/', views.ReservationLookupView.as_view(), name='reservation-lookup'),
    path('guest-forms/<uuid:token>/', views.GuestFormDetailView.as_view(), name='guest-form-detail'),
    path('guest-forms/<uuid:token>/submit/', views.GuestFormSubmitView.as_view(), name='guest-form-submit'),
    path('revenue/', views.RevenueAPIView.as_view(), name='revenue-api'),
]
