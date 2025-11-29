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