from django.db import models
from django.contrib.auth.models import User
from multiselectfield import MultiSelectField

INDUSTRY_CHOICES = [
    ('Construction', 'Construction'),
    ('Plumbing', 'Plumbing'),
    ('Electrical', 'Electrical'),
    ('Landscaping', 'Landscaping'),
    ('Painting', 'Painting'),
    ('Other', 'Other'),
]

SERVICES_CHOICES = [
    ('Renovation', 'Renovation'),
    ('Repair', 'Repair'),
    ('Installation', 'Installation'),
    ('Consultation', 'Consultation'),
    ('Maintenance', 'Maintenance'),
    ('Inspection', 'Inspection'),
    ('Design', 'Design'),
    ('Other', 'Other'),
]

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    is_verified = models.BooleanField(default=False)
    verification_code = models.CharField(max_length=20, blank=True, null=True)
    is_business_owner = models.BooleanField(default=False)
    business_name = models.CharField(max_length=255, blank=True, null=True)
    industry = MultiSelectField(choices=INDUSTRY_CHOICES, blank=True, null=True)
    services = MultiSelectField(choices=SERVICES_CHOICES, blank=True, null=True)

    def __str__(self):
        return self.user.username
