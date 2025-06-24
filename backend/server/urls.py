from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('o/', include('oauth2_provider.urls', namespace='oauth2_provider')),
    path('accounts/', include('allauth.urls')),
    path('api/', include('client.urls')),
    path('auth/registration/', include('dj_rest_auth.registration.urls')),  # signup
]
