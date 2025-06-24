from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_verified')

# Inline for User admin
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'

class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    def is_verified(self, obj):
        return obj.userprofile.is_verified
    is_verified.boolean = True
    is_verified.short_description = 'Email Verified'
    list_display = BaseUserAdmin.list_display + ('is_verified',)

admin.site.unregister(User)
admin.site.register(User, UserAdmin)

