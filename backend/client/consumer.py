import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

from .models import ChatRoom, Message

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Get room_id from the URL route
        self.room_id = self.scope['url_route']['kwargs']['room_name']  # room_name contains the ID in the URL
        self.room_group_name = f'chat_{self.room_id}'

        # Check if the user has access to this room
        room = await self.get_room(self.room_id)
        if room and self.scope["user"] in await self.get_room_participants(room):
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data["message"]
        username = self.scope["user"].username
        time = data.get("time", None)

        room = await self.get_room(self.room_id)  # Changed from self.room_name to self.room_id
        sender = self.scope['user']

        if room:
            await self.save_message(room, sender, message)
        else:
            # Optionally: log missing room
            print(f"[ERROR] Chatroom '{self.room_id}' not found — message not saved.")

        await self.channel_layer.group_send(
            self.room_group_name, {
                "type": "sendMessage",
                "message": message,
                "username": username,
                "time": time
            }
        )

    async def sendMessage(self, event):
        await self.send(text_data=json.dumps({
            "message": event["message"],
            "username": event["username"],
            "time": event["time"]
        }))

    @database_sync_to_async
    def get_room(self, room_id):
        try:
            return ChatRoom.objects.get(id=room_id)
        except ChatRoom.DoesNotExist:
            return None

    @database_sync_to_async
    def save_message(self, room, sender, content):
        return Message.objects.create(room=room, sender=sender, content=content)

    @database_sync_to_async
    def get_room_participants(self, room):
        return list(room.participants.all())