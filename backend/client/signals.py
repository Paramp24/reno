from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile, BusinessProfile

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=UserProfile)
def create_business_profile(sender, instance, **kwargs):
    if instance.is_business_owner:
        BusinessProfile.objects.get_or_create(
            user_profile=instance,
            defaults={
                'business_name': instance.business_name or "",
                'industry': instance.industry,
                'services': instance.services,
            }
        )
    else:
        # Optionally, delete BusinessProfile if user is no longer a business owner
        BusinessProfile.objects.filter(user_profile=instance).delete()
