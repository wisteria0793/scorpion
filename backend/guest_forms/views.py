# backend/guest_forms/views.py
from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Property, FacilityImage
from .serializers import PropertySerializer, FacilityImageSerializer

class PropertyViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows properties to be viewed or edited.
    """
    queryset = Property.objects.all().order_by('name')
    serializer_class = PropertySerializer

class FacilityImageViewSet(viewsets.ModelViewSet):
    """
    API endpoint for uploading, listing, and deleting facility images.
    """
    serializer_class = FacilityImageSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        """
        This view should only return images for the property
        specified in the URL.
        """
        return FacilityImage.objects.filter(property=self.kwargs['property_pk'])

    def perform_create(self, serializer):
        """
        Associate the uploaded image with the property from the URL.
        """
        serializer.save(property_id=self.kwargs['property_pk'])
