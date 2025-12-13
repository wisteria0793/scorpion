# backend/guest_forms/migrations/0011_property_google_sheets_url.py

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guest_forms', '0010_alter_guestsubmission_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='property',
            name='google_sheets_url',
            field=models.URLField(
                blank=True,
                null=True,
                verbose_name='Google Sheets URL',
                help_text='予約情報を管理するGoogle SheetsのURL（https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit）'
            ),
        ),
    ]
