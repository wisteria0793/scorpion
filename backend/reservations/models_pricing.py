# reservations/models_pricing.py
from django.db import models
from guest_forms.models import Property


class DailyRate(models.Model):
    """
    Beds24から取得した日別料金設定を保存するモデル。
    各施設の日ごとの基本料金、最小宿泊数、空室状況などを管理。
    """
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='daily_rates',
        verbose_name="施設"
    )
    date = models.DateField(verbose_name="日付")
    
    # 料金情報
    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="基本料金",
        help_text="1泊あたりの基本料金"
    )
    
    # 空室・制約情報
    available = models.BooleanField(
        default=True,
        verbose_name="予約可能",
        help_text="この日が予約可能かどうか"
    )
    min_stay = models.IntegerField(
        default=1,
        verbose_name="最小宿泊数",
        help_text="この日からの最小宿泊数"
    )
    
    # Beds24生データ（デバッグ用）
    beds24_data = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Beds24生データ",
        help_text="Beds24 APIから取得した元データ"
    )
    
    # タイムスタンプ
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    class Meta:
        verbose_name = "日別料金"
        verbose_name_plural = "日別料金"
        unique_together = [['property', 'date']]
        ordering = ['property', 'date']
        indexes = [
            models.Index(fields=['property', 'date']),
            models.Index(fields=['date']),
        ]

    def __str__(self):
        return f"{self.property.name} - {self.date}: ¥{self.base_price or 0}"
