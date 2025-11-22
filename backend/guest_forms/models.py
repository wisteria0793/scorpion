# backend/guest_forms/models.py

import uuid
from django.db import models

class FormTemplate(models.Model):
    name = models.CharField(max_length=255, verbose_name="テンプレート名")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    class Meta:
        verbose_name = "フォームテンプレート"
        verbose_name_plural = "フォームテンプレート"

    def __str__(self):
        return self.name

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
    label = models.CharField(max_length=255, verbose_name="質問文")
    field_type = models.CharField(max_length=20, choices=FieldType.choices, verbose_name="入力形式")
    options = models.JSONField(null=True, blank=True, verbose_name="選択肢", help_text="ラジオボタンやチェックボックスの場合、[\"選択肢1\", \"選択肢2\"] の形式で入力")
    is_required = models.BooleanField(default=True, verbose_name="必須項目")
    order = models.PositiveIntegerField(default=0, verbose_name="表示順")

    class Meta:
        verbose_name = "フォーム項目"
        verbose_name_plural = "フォーム項目"
        ordering = ['order']

    def __str__(self):
        return f"{self.form_template.name} - {self.label}"

class Property(models.Model):
    name = models.CharField(max_length=255, verbose_name="施設名")
    slug = models.SlugField(unique=True, verbose_name="URL識別子", help_text="例: 'villa-sakura'")
    form_template = models.ForeignKey(FormTemplate, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="フォームテンプレート")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    class Meta:
        verbose_name = "施設"
        verbose_name_plural = "施設"

    def __str__(self):
        return self.name

class Reservation(models.Model):
    class RosterStatus(models.TextChoices):
        PENDING = 'pending', '未提出'
        SUBMITTED = 'submitted', '提出済'
        VERIFIED = 'verified', '確認済'

    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='reservations', verbose_name="施設")
    check_in_date = models.DateField(verbose_name="チェックイン日")
    guest_email = models.EmailField(verbose_name="予約者メールアドレス")
    guest_name = models.CharField(max_length=255, verbose_name="予約者名")
    guest_roster_status = models.CharField(
        max_length=20, choices=RosterStatus.choices, default=RosterStatus.PENDING, verbose_name="名簿提出状況"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    class Meta:
        verbose_name = "予約"
        verbose_name_plural = "予約"
        unique_together = ('property', 'check_in_date') # 一棟貸しのため、施設とチェックイン日の組み合わせはユニーク

    def __str__(self):
        return f"{self.property.name} - {self.check_in_date}"

class GuestSubmission(models.Model):
    class SubmissionStatus(models.TextChoices):
        PENDING = 'pending', '入力待'
        COMPLETED = 'completed', '提出完了'

    reservation = models.OneToOneField(Reservation, on_delete=models.CASCADE, verbose_name="予約")
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, verbose_name="フォームアクセス用トークン")
    status = models.CharField(max_length=20, choices=SubmissionStatus.choices, default=SubmissionStatus.PENDING, verbose_name="提出状況")
    submitted_data = models.JSONField(null=True, blank=True, verbose_name="提出データ")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    class Meta:
        verbose_name = "名簿提出内容"
        verbose_name_plural = "名簿提出内容"

    def __str__(self):
        return f"Submission for {self.reservation}"
