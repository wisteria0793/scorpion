# Generated migration file
# This migration adds pricing-related fields and models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('guest_forms', '0008_property_faq_property_house_rules_property_wifi_info'),
    ]

    operations = [
        # Add pricing fields to Property model
        migrations.AddField(
            model_name='property',
            name='base_price',
            field=models.IntegerField(default=10000, verbose_name='基本料金（¥/泊）'),
        ),
        migrations.AddField(
            model_name='property',
            name='base_guests',
            field=models.IntegerField(default=4, verbose_name='基本人数'),
        ),
        migrations.AddField(
            model_name='property',
            name='adult_extra_price',
            field=models.IntegerField(default=3000, verbose_name='追加大人料金（¥/名）'),
        ),
        migrations.AddField(
            model_name='property',
            name='child_extra_price',
            field=models.IntegerField(default=1500, verbose_name='追加子供料金（¥/名）'),
        ),
        migrations.AddField(
            model_name='property',
            name='min_nights',
            field=models.IntegerField(default=1, verbose_name='最小宿泊日数'),
        ),
        # Create PricingRule model
        migrations.CreateModel(
            name='PricingRule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(db_index=True, verbose_name='日付')),
                ('price', models.IntegerField(blank=True, null=True, verbose_name='カスタム価格（¥/泊）')),
                ('min_nights', models.IntegerField(blank=True, null=True, verbose_name='この日の最小宿泊日数')),
                ('is_blackout', models.BooleanField(default=False, verbose_name='ブラックアウト（予約不可）')),
                ('blackout_reason', models.CharField(blank=True, max_length=255, verbose_name='ブラックアウト理由')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='作成日時')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新日時')),
                ('created_by', models.CharField(blank=True, max_length=50, verbose_name='作成者（\'beds24\'など）')),
                ('property', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pricing_rules', to='guest_forms.property', verbose_name='施設')),
            ],
            options={
                'verbose_name': '価格ルール',
                'verbose_name_plural': '価格ルール',
            },
        ),
        migrations.AddIndex(
            model_name='pricingrule',
            index=models.Index(fields=['property', 'date'], name='guest_forms_property_date_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='pricingrule',
            unique_together={('property', 'date')},
        ),
    ]
