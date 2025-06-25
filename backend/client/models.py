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

def service_request_image_path(instance, filename):
    return f"service_request_images/{instance.service_request.user.email}/{filename}"

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

class ServiceRequest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    location = models.CharField(max_length=255)
    services_needed = MultiSelectField(choices=SERVICES_CHOICES, blank=True, null=True)
    business_posted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class ServiceRequestImage(models.Model):
    service_request = models.ForeignKey('ServiceRequest', related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to=service_request_image_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.service_request.title}"
