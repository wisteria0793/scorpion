from django.db import models
from django.core.validators import URLValidator
import uuid


class TouristAttraction(models.Model):
    """観光施設モデル"""
    
    CATEGORY_CHOICES = [
        ('HISTORIC', '歴史的建造物'),
        ('NATURE', '自然・景観'),
        ('MUSEUM', '博物館・美術館'),
        ('SHOPPING', 'ショッピング'),
        ('HOT_SPRING', '温泉'),
        ('FOOD', 'グルメ・市場'),
        ('OTHER', 'その他'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name='施設名')
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        verbose_name='カテゴリー'
    )
    description = models.TextField(verbose_name='説明')
    address = models.CharField(max_length=300, verbose_name='住所')
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name='緯度'
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name='経度'
    )
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='電話番号'
    )
    website_url = models.URLField(
        blank=True,
        validators=[URLValidator()],
        verbose_name='ウェブサイトURL'
    )
    opening_hours = models.TextField(
        blank=True,
        verbose_name='営業時間',
        help_text='例: 9:00-17:00 (休館日: 月曜日)'
    )
    admission_fee = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='入場料',
        help_text='例: 大人500円、子供300円'
    )
    access_info = models.TextField(
        blank=True,
        verbose_name='アクセス情報'
    )
    image = models.ImageField(
        upload_to='tourism/attractions/',
        null=True,
        blank=True,
        verbose_name='画像'
    )
    is_active = models.BooleanField(default=True, verbose_name='公開中')
    display_order = models.IntegerField(default=0, verbose_name='表示順')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='作成日時')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新日時')
    
    class Meta:
        ordering = ['display_order', 'name']
        verbose_name = '観光施設'
        verbose_name_plural = '観光施設'
    
    def __str__(self):
        return self.name


class Event(models.Model):
    """イベントモデル"""
    
    EVENT_TYPE_CHOICES = [
        ('FESTIVAL', '祭り'),
        ('SEASONAL', '季節イベント'),
        ('CULTURAL', '文化イベント'),
        ('SPORTS', 'スポーツイベント'),
        ('MARKET', '市場・マルシェ'),
        ('OTHER', 'その他'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name='イベント名')
    event_type = models.CharField(
        max_length=20,
        choices=EVENT_TYPE_CHOICES,
        verbose_name='イベント種別'
    )
    description = models.TextField(verbose_name='説明')
    venue = models.CharField(max_length=300, verbose_name='開催場所')
    address = models.CharField(max_length=300, blank=True, verbose_name='住所')
    start_date = models.DateField(verbose_name='開始日')
    end_date = models.DateField(verbose_name='終了日')
    start_time = models.TimeField(null=True, blank=True, verbose_name='開始時刻')
    end_time = models.TimeField(null=True, blank=True, verbose_name='終了時刻')
    is_recurring = models.BooleanField(
        default=False,
        verbose_name='毎年開催',
        help_text='毎年同じ時期に開催されるイベント'
    )
    contact_info = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='問い合わせ先'
    )
    website_url = models.URLField(
        blank=True,
        validators=[URLValidator()],
        verbose_name='公式サイトURL'
    )
    admission_fee = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='参加費',
        help_text='例: 無料、1000円など'
    )
    image = models.ImageField(
        upload_to='tourism/events/',
        null=True,
        blank=True,
        verbose_name='画像'
    )
    is_active = models.BooleanField(default=True, verbose_name='公開中')
    display_order = models.IntegerField(default=0, verbose_name='表示順')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='作成日時')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新日時')
    
    class Meta:
        ordering = ['start_date', 'display_order', 'name']
        verbose_name = 'イベント'
        verbose_name_plural = 'イベント'
    
    def __str__(self):
        return f"{self.name} ({self.start_date})"


class SeasonalRecommendation(models.Model):
    """季節のおすすめ情報モデル"""
    
    SEASON_CHOICES = [
        ('SPRING', '春 (3-5月)'),
        ('SUMMER', '夏 (6-8月)'),
        ('AUTUMN', '秋 (9-11月)'),
        ('WINTER', '冬 (12-2月)'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    season = models.CharField(
        max_length=10,
        choices=SEASON_CHOICES,
        verbose_name='季節'
    )
    title = models.CharField(max_length=200, verbose_name='タイトル')
    description = models.TextField(verbose_name='説明')
    related_attractions = models.ManyToManyField(
        TouristAttraction,
        blank=True,
        related_name='seasonal_recommendations',
        verbose_name='関連する観光施設'
    )
    related_events = models.ManyToManyField(
        Event,
        blank=True,
        related_name='seasonal_recommendations',
        verbose_name='関連するイベント'
    )
    image = models.ImageField(
        upload_to='tourism/seasonal/',
        null=True,
        blank=True,
        verbose_name='画像'
    )
    is_active = models.BooleanField(default=True, verbose_name='公開中')
    display_order = models.IntegerField(default=0, verbose_name='表示順')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='作成日時')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新日時')
    
    class Meta:
        ordering = ['display_order', 'season']
        verbose_name = '季節のおすすめ'
        verbose_name_plural = '季節のおすすめ'
    
    def __str__(self):
        return f"{self.get_season_display()} - {self.title}"
