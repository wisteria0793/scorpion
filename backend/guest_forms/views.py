# backend/guest_forms/views.py
from rest_framework import viewsets
from .models import Property
from .serializers import PropertySerializer

class PropertyViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows properties to be viewed or edited.
    """
    queryset = Property.objects.all().order_by('name')
    serializer_class = PropertySerializer
