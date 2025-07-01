from django.urls import path, include
from .consumer import ChatConsumer

# the empty string routes to ChatConsumer, which manages the chat functionality.
websocket_urlpatterns = [
    path("chat/<str:room_name>/", ChatConsumer.as_asgi()),
]