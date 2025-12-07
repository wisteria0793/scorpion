from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from datetime import datetime
from .models import TouristAttraction, Event, SeasonalRecommendation
from .serializers import (
    TouristAttractionSerializer,
    EventSerializer,
    SeasonalRecommendationSerializer
)


class TouristAttractionViewSet(viewsets.ModelViewSet):
    """観光施設のViewSet"""
    queryset = TouristAttraction.objects.all()
    serializer_class = TouristAttractionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'description', 'address']
    ordering_fields = ['display_order', 'name', 'created_at']
    ordering = ['display_order', 'name']
    
    def get_queryset(self):
        """公開中の施設のみ返す（管理者は全て見える）"""
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)
        return queryset
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """カテゴリー別に観光施設を取得"""
        category = request.query_params.get('category')
        if not category:
            return Response({'error': 'カテゴリーパラメータが必要です'}, status=400)
        
        attractions = self.get_queryset().filter(category=category)
        serializer = self.get_serializer(attractions, many=True)
        return Response(serializer.data)


class EventViewSet(viewsets.ModelViewSet):
    """イベントのViewSet"""
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['event_type', 'is_active', 'is_recurring']
    search_fields = ['name', 'description', 'venue']
    ordering_fields = ['start_date', 'display_order', 'name', 'created_at']
    ordering = ['start_date', 'display_order']
    
    def get_queryset(self):
        """公開中のイベントのみ返す（管理者は全て見える）"""
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)
        return queryset
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """今後開催予定のイベントを取得"""
        today = datetime.now().date()
        events = self.get_queryset().filter(end_date__gte=today)
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_date_range(self, request):
        """日付範囲でイベントを取得"""
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        
        if not start or not end:
            return Response(
                {'error': 'start と end パラメータが必要です'},
                status=400
            )
        
        try:
            start_date = datetime.strptime(start, '%Y-%m-%d').date()
            end_date = datetime.strptime(end, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': '日付は YYYY-MM-DD 形式で指定してください'},
                status=400
            )
        
        events = self.get_queryset().filter(
            start_date__lte=end_date,
            end_date__gte=start_date
        )
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)


class SeasonalRecommendationViewSet(viewsets.ModelViewSet):
    """季節のおすすめのViewSet"""
    queryset = SeasonalRecommendation.objects.all()
    serializer_class = SeasonalRecommendationSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['season', 'is_active']
    ordering_fields = ['display_order', 'season', 'created_at']
    ordering = ['display_order', 'season']
    
    def get_queryset(self):
        """公開中のおすすめ情報のみ返す（管理者は全て見える）"""
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)
        return queryset
    
    @action(detail=False, methods=['get'])
    def current_season(self, request):
        """現在の季節のおすすめを取得"""
        month = datetime.now().month
        
        # 季節の判定
        if 3 <= month <= 5:
            season = 'SPRING'
        elif 6 <= month <= 8:
            season = 'SUMMER'
        elif 9 <= month <= 11:
            season = 'AUTUMN'
        else:
            season = 'WINTER'
        
        recommendations = self.get_queryset().filter(season=season)
        serializer = self.get_serializer(recommendations, many=True)
        return Response(serializer.data)

