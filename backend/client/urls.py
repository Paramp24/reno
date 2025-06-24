from django.urls import path
from .views import HelloView, RegisterView, VerifyCodeView, CustomLoginView

urlpatterns = [
    path('hello/', HelloView.as_view()),
    path('register/', RegisterView.as_view()),
    path('verify/', VerifyCodeView.as_view()),
    path('login/', CustomLoginView.as_view()),
]