# Generated by Django 5.2.3 on 2025-06-24 02:54

import multiselectfield.db.fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('client', '0002_userprofile_business_name_userprofile_industry_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='industry',
            field=multiselectfield.db.fields.MultiSelectField(blank=True, choices=[('Construction', 'Construction'), ('Plumbing', 'Plumbing'), ('Electrical', 'Electrical'), ('Landscaping', 'Landscaping'), ('Painting', 'Painting'), ('Other', 'Other')], max_length=59, null=True),
        ),
        migrations.AlterField(
            model_name='userprofile',
            name='services',
            field=multiselectfield.db.fields.MultiSelectField(blank=True, choices=[('Renovation', 'Renovation'), ('Repair', 'Repair'), ('Installation', 'Installation'), ('Consultation', 'Consultation'), ('Maintenance', 'Maintenance'), ('Inspection', 'Inspection'), ('Design', 'Design'), ('Other', 'Other')], max_length=79, null=True),
        ),
    ]
