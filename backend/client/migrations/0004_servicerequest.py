# Generated by Django 5.2.3 on 2025-06-25 01:07

import django.db.models.deletion
import multiselectfield.db.fields
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('client', '0003_alter_userprofile_industry_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ServiceRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('price', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('location', models.CharField(max_length=255)),
                ('services_needed', multiselectfield.db.fields.MultiSelectField(blank=True, choices=[('Renovation', 'Renovation'), ('Repair', 'Repair'), ('Installation', 'Installation'), ('Consultation', 'Consultation'), ('Maintenance', 'Maintenance'), ('Inspection', 'Inspection'), ('Design', 'Design'), ('Other', 'Other')], max_length=79, null=True)),
                ('business_posted', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
