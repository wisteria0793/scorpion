from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TouristAttractionViewSet,
    EventViewSet,
    SeasonalRecommendationViewSet
)

router = DefaultRouter()
router.register(r'attractions', TouristAttractionViewSet, basename='attraction')
router.register(r'events', EventViewSet, basename='event')
router.register(r'seasonal', SeasonalRecommendationViewSet, basename='seasonal')

urlpatterns = [
    path('', include(router.urls)),
]
