# reservations/models.py
from django.db import models
from guest_forms.models import Property

class Reservation(models.Model):
    class RosterStatus(models.TextChoices):
        PENDING = 'pending', '未提出'
        SUBMITTED = 'submitted', '提出済'
        VERIFIED = 'verified', '確認済'

    # Beds24からの主要なデータ
    beds24_book_id = models.IntegerField(unique=True, null=True, verbose_name="Beds24予約ID", help_text="Beds24の'bookId'")
    status = models.CharField(max_length=50, verbose_name="予約ステータス", null=True, blank=True, help_text="Beds24の'Status'")
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="合計料金", help_text="Beds24の'Price'")
    
    # 予約に関する詳細情報
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='reservations', verbose_name="施設")
    check_in_date = models.DateField(verbose_name="チェックイン日", help_text="Beds24の'First Night'")
    check_out_date = models.DateField(null=True, verbose_name="チェックアウト日", help_text="Beds24の'Last Night'")
    num_guests = models.IntegerField(default=1, verbose_name="宿泊者数", help_text="Beds24の'Number of Guests'")

    # ゲスト情報
    guest_name = models.CharField(max_length=255, verbose_name="予約者名", null=True, blank=True, help_text="Beds24の'Guest Name'")
    guest_email = models.EmailField(verbose_name="予約者メールアドレス", null=True, blank=True)
    
    # システム内部のステータス
    guest_roster_status = models.CharField(
        max_length=20, choices=RosterStatus.choices, default=RosterStatus.PENDING, verbose_name="名簿提出状況"
    )
    
    # タイムスタンプ
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    class Meta:
        verbose_name = "予約"
        verbose_name_plural = "予約"
        ordering = ['-check_in_date']


    def __str__(self):
        return f"{self.property.name} - {self.check_in_date} (Beds24 ID: {self.beds24_book_id})"

class SyncStatus(models.Model):
    """
    Beds24との最終同期時刻を記録する。
    常に単一のレコードのみが存在するように運用する。
    """
    last_sync_time = models.DateTimeField(verbose_name="最終同期時刻")

    def __str__(self):
        return f"Last sync on {self.last_sync_time.strftime('%Y-%m-%d %H:%M:%S')}"

    class Meta:
        verbose_name = "同期ステータス"
        verbose_name_plural = "同期ステータス"


class AccommodationTax(models.Model):
    """
    宿泊税支払い状況の管理モデル
    2026年4月から北海道函館市で宿泊税が導入される
    """
    class PaymentStatus(models.TextChoices):
        PENDING = 'pending', '未払い'
        PAID = 'paid', '支払済'
        EXEMPTED = 'exempted', '免除'
        DEFERRED = 'deferred', '延期'

    class TaxType(models.TextChoices):
        ACCOMMODATION = 'accommodation', '宿泊税'
        PREFECTURAL = 'prefectural', '道税'

    # 予約情報との関連付け
    reservation = models.OneToOneField(
        Reservation,
        on_delete=models.CASCADE,
        related_name='accommodation_tax',
        verbose_name="予約"
    )
    
    # 宿泊税情報
    tax_type = models.CharField(
        max_length=20,
        choices=TaxType.choices,
        default=TaxType.ACCOMMODATION,
        verbose_name="税種"
    )
    
    # 税額計算（宿泊日数 × 税率）
    num_nights = models.IntegerField(default=1, verbose_name="宿泊日数")
    tax_rate = models.IntegerField(default=100, verbose_name="税率（¥/泊）")
    tax_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        verbose_name="納税額（¥）"
    )
    
    # 支払い状況
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        verbose_name="支払い状況"
    )
    
    # 支払い方法
    payment_method = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        choices=[
            ('cash', '現金'),
            ('card', 'クレジットカード'),
            ('stripe', 'Stripe'),
            ('bank_transfer', '銀行振込'),
            ('other', 'その他'),
        ],
        verbose_name="支払い方法"
    )
    
    # タイムスタンプ
    payment_date = models.DateField(null=True, blank=True, verbose_name="支払日")
    payment_reference = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name="支払い参照番号（Stripe Transaction ID等）"
    )
    notes = models.TextField(blank=True, verbose_name="備考")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    class Meta:
        verbose_name = "宿泊税"
        verbose_name_plural = "宿泊税"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reservation.property.name} - {self.reservation.check_in_date} ({self.tax_amount}¥)"

    def calculate_tax(self):
        """宿泊税を計算"""
        if self.reservation:
            nights = (self.reservation.check_out_date - self.reservation.check_in_date).days
            self.num_nights = max(1, nights)
            self.tax_amount = self.num_nights * self.tax_rate
        return self.tax_amount


# Import DailyRate model
from .models_pricing import DailyRate

__all__ = ['Reservation', 'SyncStatus', 'AccommodationTax', 'DailyRate']