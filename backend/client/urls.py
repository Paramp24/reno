from django.urls import path
from .views import (
    RegisterView, VerifyCodeView, CustomLoginView, 
    HelloView, ChoicesView, ServiceRequestView, 
    BusinessProfileListView, ServiceRequestListView,
    ChatRoomView, ChatMessageView, CreateChatRoomView,
    GoogleLoginView
)

urlpatterns = [
    path('hello/', HelloView.as_view()),
    path('register/', RegisterView.as_view()),
    path('verify/', VerifyCodeView.as_view()),
    path('login/', CustomLoginView.as_view()),
    path('google-login/', GoogleLoginView.as_view()),
    path('api/choices/', ChoicesView.as_view(), name='choices'),
    path('choices/', ChoicesView.as_view(), name='choices'),
    path('service-request/', ServiceRequestView.as_view(), name='service-request'),
    path('business-profiles/', BusinessProfileListView.as_view(), name='business-profiles'),
    path('service-requests/', ServiceRequestListView.as_view(), name='service-requests'),
    
    # Chat endpoints
    path('chat-rooms/', ChatRoomView.as_view(), name='chat-rooms'),
    path('chat-rooms/create/', CreateChatRoomView.as_view(), name='create-chat-room'),
    path('chat-rooms/<int:room_id>/messages/', ChatMessageView.as_view(), name='chat-messages'),
]