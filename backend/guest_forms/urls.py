# backend/guest_forms/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PropertyViewSet

# Create a router and register our viewset with it.
router = DefaultRouter()
router.register(r'properties', PropertyViewSet)

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
]
