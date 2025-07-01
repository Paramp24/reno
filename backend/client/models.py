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
    # Debug print
    print("Uploading image for:", instance.service_request.user.email, filename)
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

class BusinessProfile(models.Model):
    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE, related_name='business_profile')
    business_name = models.CharField(max_length=255)
    industry = MultiSelectField(choices=INDUSTRY_CHOICES, blank=True, null=True)
    services = MultiSelectField(choices=SERVICES_CHOICES, blank=True, null=True)

    def __str__(self):
        return f"Business: {self.business_name} ({self.user_profile.user.username})"

class ServiceRequest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='related_requests')
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

class ChatRoom(models.Model):
    participants = models.ManyToManyField(User, related_name='chat_rooms')
    service_request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE, related_name='chat_rooms')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ChatRoom for {self.service_request.title} ({', '.join([u.username for u in self.participants.all()])})"

    class Meta:
        unique_together = ('service_request',)

class Message(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message from {self.sender.username} at {self.timestamp}"
