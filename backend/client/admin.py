from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'is_verified',
        'is_business_owner',
        'business_name',
        'display_industry',
        'display_services',
    )
    fieldsets = (
        (None, {'fields': ('user', 'is_verified')}),
        ('Business Info', {'fields': ('is_business_owner', 'business_name', 'industry', 'services')}),
    )

    def display_industry(self, obj):
        return ", ".join(obj.industry) if obj.industry else ""
    display_industry.short_description = 'Industry'

    def display_services(self, obj):
        return ", ".join(obj.services) if obj.services else ""
    display_services.short_description = 'Services Provided'

# Inline for User admin
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    fields = ('is_verified', 'verification_code', 'is_business_owner', 'business_name', 'industry', 'services')

class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    def is_verified(self, obj):
        return obj.userprofile.is_verified
    is_verified.boolean = True
    is_verified.short_description = 'Email Verified'
    def is_business_owner(self, obj):
        return obj.userprofile.is_business_owner
    is_business_owner.boolean = True
    is_business_owner.short_description = 'Business Owner'
    list_display = BaseUserAdmin.list_display + ('is_verified', 'is_business_owner')

admin.site.unregister(User)
admin.site.register(User, UserAdmin)

