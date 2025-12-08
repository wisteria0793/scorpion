# backend/guest_forms/models.py

import uuid
from django.db import models

class FormTemplate(models.Model):
    name = models.JSONField(verbose_name="テンプレート名 (多言語)", default=dict)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    class Meta:
        verbose_name = "フォームテンプレート"
        verbose_name_plural = "フォームテンプレート"

    def __str__(self):
        # 管理画面での表示用に、デフォルト言語（例: 日本語）を返す
        return self.name.get('ja', str(self.name))

class FormField(models.Model):
    class FieldType(models.TextChoices):
        TEXT = 'text', 'テキスト (一行)'
        TEXTAREA = 'textarea', 'テキスト (複数行)'
        EMAIL = 'email', 'メールアドレス'
        DATE = 'date', '日付'
        NUMBER = 'number', '数値'
        RADIO = 'radio', 'ラジオボタン'
        CHECKBOX = 'checkbox', 'チェックボックス'
        FILE = 'file', 'ファイル'

    form_template = models.ForeignKey(FormTemplate, on_delete=models.CASCADE, related_name='fields', verbose_name="フォームテンプレート")
    label = models.JSONField(verbose_name="質問文 (多言語)", default=dict)
    field_type = models.CharField(max_length=20, choices=FieldType.choices, verbose_name="入力形式")
    options = models.JSONField(null=True, blank=True, verbose_name="選択肢 (多言語)", help_text='例: {"ja": ["選択肢1", "選択肢2"], "en": ["Option1", "Option2"]}')
    is_required = models.BooleanField(default=True, verbose_name="必須項目")
    order = models.PositiveIntegerField(default=0, verbose_name="表示順")

    class Meta:
        verbose_name = "フォーム項目"
        verbose_name_plural = "フォーム項目"
        ordering = ['order']

    def __str__(self):
        return f"{self.form_template.get('ja', str(self.form_template))} - {self.label.get('ja', str(self.label))}"

class Amenity(models.Model):
    """
    アメニティ情報。
    """
    name = models.CharField(max_length=255, unique=True, verbose_name="アメニティ名")

    class Meta:
        verbose_name = "アメニティ"
        verbose_name_plural = "アメニティ"

    def __str__(self):
        return self.name

class Property(models.Model):
    name = models.CharField(max_length=255, verbose_name="施設名")
    slug = models.SlugField(unique=True, verbose_name="URL識別子", help_text="例: 'villa-sakura'")
    form_template = models.ForeignKey(FormTemplate, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="フォームテンプレート")
    beds24_property_key = models.CharField(max_length=255, unique=True, null=True, blank=True, verbose_name="Beds24プロパティキー")
    room_id = models.IntegerField(unique=True, null=True, blank=True, verbose_name="部屋ID")
    address = models.CharField(max_length=255, null=True, blank=True, verbose_name="住所")
    capacity = models.IntegerField(default=0, verbose_name="最大収容人数")
    num_parking = models.IntegerField(default=0, verbose_name="駐車台数")
    google_map_url = models.TextField(blank=True, verbose_name="Google Map URL")
    check_in_time = models.TimeField(null=True, blank=True, verbose_name="チェックイン時刻")
    check_out_time = models.TimeField(null=True, blank=True, verbose_name="チェックアウト時刻")
    description = models.TextField(blank=True, verbose_name="施設説明")
    management_type = models.CharField(max_length=50, null=True, blank=True, verbose_name="管理形態")
    amenities = models.ManyToManyField(Amenity, related_name='properties', blank=True, verbose_name="アメニティ")

    # 価格設定関連
    base_price = models.IntegerField(default=10000, verbose_name="基本料金（¥/泊）")
    base_guests = models.IntegerField(default=4, verbose_name="基本人数")
    adult_extra_price = models.IntegerField(default=3000, verbose_name="追加大人料金（¥/名）")
    child_extra_price = models.IntegerField(default=1500, verbose_name="追加子供料金（¥/名）")
    min_nights = models.IntegerField(default=1, verbose_name="最小宿泊日数")

    # Check-in information for guests
    wifi_info = models.TextField(blank=True, verbose_name="Wi-Fi情報")
    house_rules = models.TextField(blank=True, verbose_name="ハウスルール")
    faq = models.JSONField(null=True, blank=True, default=list, verbose_name="FAQ")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    class Meta:
        verbose_name = "施設"
        verbose_name_plural = "施設"

    def __str__(self):
        return self.name

class FacilityImage(models.Model):
    """
    施設画像情報。
    """
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='images', verbose_name="施設")
    image = models.ImageField(upload_to='facility_images/', verbose_name="画像ファイル")
    order = models.PositiveIntegerField(default=0, verbose_name="表示順")

    class Meta:
        verbose_name = "施設画像"
        verbose_name_plural = "施設画像"
        ordering = ['order']

    def __str__(self):
        return f"{self.property.name} - Image {self.order}"

class GuestSubmission(models.Model):
    class SubmissionStatus(models.TextChoices):
        PENDING = 'pending', '入力待'
        COMPLETED = 'completed', '提出完了'

    reservation = models.OneToOneField('reservations.Reservation', on_delete=models.CASCADE, verbose_name="予約")
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, verbose_name="フォームアクセス用トークン")
    status = models.CharField(max_length=20, choices=SubmissionStatus.choices, default=SubmissionStatus.PENDING, verbose_name="提出状況")
    submitted_data = models.JSONField(null=True, blank=True, verbose_name="提出データ")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

class PricingRule(models.Model):
    """
    施設ごとの日別価格・在庫管理ルール
    """
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='pricing_rules', verbose_name="施設")
    date = models.DateField(verbose_name="日付", db_index=True)
    
    # 価格設定
    price = models.IntegerField(null=True, blank=True, verbose_name="カスタム価格（¥/泊）")
    min_nights = models.IntegerField(null=True, blank=True, verbose_name="この日の最小宿泊日数")
    
    # 在庫管理
    is_blackout = models.BooleanField(default=False, verbose_name="ブラックアウト（予約不可）")
    blackout_reason = models.CharField(max_length=255, blank=True, verbose_name="ブラックアウト理由")
    
    # メタ情報
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")
    created_by = models.CharField(max_length=50, blank=True, verbose_name="作成者（'beds24'など）")
    
    class Meta:
        verbose_name = "価格ルール"
        verbose_name_plural = "価格ルール"
        unique_together = ('property', 'date')
        indexes = [
            models.Index(fields=['property', 'date']),
        ]
    
    def __str__(self):
        return f"{self.property.name} - {self.date}"

    class Meta:
        verbose_name = "名簿提出内容"
        verbose_name_plural = "名簿提出内容"

    def __str__(self):
        return f"Submission for {self.reservation}"    