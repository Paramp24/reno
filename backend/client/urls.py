from django.urls import path
from .views import RegisterView, VerifyCodeView, CustomLoginView, HelloView, ChoicesView, ServiceRequestView

urlpatterns = [
    path('hello/', HelloView.as_view()),
    path('register/', RegisterView.as_view()),
    path('verify/', VerifyCodeView.as_view()),
    path('login/', CustomLoginView.as_view()),
    path('api/choices/', ChoicesView.as_view(), name='choices'),
    path('choices/', ChoicesView.as_view(), name='choices'),
    path('service-request/', ServiceRequestView.as_view(), name='service-request'),
]