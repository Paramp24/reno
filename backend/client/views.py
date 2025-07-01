import random
import string
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.authtoken.models import Token
from .models import INDUSTRY_CHOICES, SERVICES_CHOICES, ServiceRequest, ServiceRequestImage, BusinessProfile, UserProfile, ChatRoom, Message
from .email_utils import send_verification_email
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django.core.files.base import ContentFile
import base64
from rest_framework import serializers

def generate_code(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        username = data.get('username')
        email = data.get('email')
        password = data.get('password1')
        is_business_owner = data.get('is_business_owner', False)
        business_name = data.get('business_name', '')
        industry = data.get('industry', [])
        services = data.get('services', [])

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username exists'}, status=400)
        if is_business_owner in [True, 'true', 'True', 1, '1']:
            if not business_name or not industry:
                return Response({'error': 'Business name and industry required for business owners.'}, status=400)
            is_business_owner = True
        else:
            is_business_owner = False

        user = User.objects.create_user(username=username, email=email, password=password)
        code = generate_code()
        profile = user.userprofile
        profile.verification_code = code
        profile.is_verified = False
        profile.is_business_owner = is_business_owner
        if is_business_owner:
            profile.business_name = business_name
            profile.industry = industry
            profile.services = services
        profile.save()
        send_verification_email(email, code)
        return Response({'detail': 'Registered. Check your email for the code.'}, status=201)

class VerifyCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        code = request.data.get('code')
        try:
            user = User.objects.get(username=username)
            profile = user.userprofile
            if profile.verification_code == code:
                profile.is_verified = True
                profile.verification_code = ''
                profile.save()
                token, _ = Token.objects.get_or_create(user=user)
                return Response({'key': token.key}, status=200)
            else:
                return Response({'error': 'Invalid code'}, status=400)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

class CustomLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        try:
            user = User.objects.get(username=username)
            if not user.userprofile.is_verified:
                return Response({'error': 'User not verified'}, status=403)
            if user.check_password(password):
                token, _ = Token.objects.get_or_create(user=user)
                return Response({'key': token.key}, status=200)
            else:
                return Response({'error': 'Invalid credentials'}, status=400)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)


class HelloView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response({"message": "Hello, authenticated user!"})

class ChoicesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        industry = [choice[0] for choice in INDUSTRY_CHOICES]
        services = [choice[0] for choice in SERVICES_CHOICES]
        return Response({'industry': industry, 'services': services})

class ServiceRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        title = data.get('title')
        description = data.get('description')
        price = data.get('price')
        location = data.get('location')
        services_needed_json = data.get('services_needed', '[]')
        business_posted = data.get('business_posted', False)
        images = []
        # Collect all files with key starting with 'image'
        for key in request.FILES:
            if key.startswith('image'):
                img = request.FILES[key]
                if img:
                    images.append(img)
        # Handle services_needed as either JSON string or list
        if isinstance(services_needed_json, str):
            import json
            try:
                services_needed = json.loads(services_needed_json)
            except Exception:
                services_needed = []
        else:
            services_needed = services_needed_json

        # Convert business_posted string to boolean if needed
        if isinstance(business_posted, str):
            business_posted = business_posted.lower() in ['true', 'yes', '1']

        if not title or not description or not location:
            return Response({'error': 'Title, description, and location are required.'}, status=400)

        try:
            sr = ServiceRequest.objects.create(
                user=request.user,
                title=title,
                description=description,
                price=price if price else None,
                location=location,
                services_needed=services_needed,
                business_posted=business_posted,
            )
            # Save images
            for img in images:
                ServiceRequestImage.objects.create(service_request=sr, image=img)
            return Response({'detail': 'Service request created.'}, status=201)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class BusinessProfileListSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user_profile.user.username')
    email = serializers.CharField(source='user_profile.user.email')
    class Meta:
        model = BusinessProfile
        fields = ['id', 'business_name', 'industry', 'services', 'user', 'email']

class ServiceRequestListSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username')
    images = serializers.SerializerMethodField()
    class Meta:
        model = ServiceRequest
        fields = ['id', 'title', 'description', 'price', 'location', 'services_needed', 'business_posted', 'created_at', 'user', 'images']
    def get_images(self, obj):
        return [img.image.url for img in obj.images.all()]

class BusinessProfileListView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        queryset = BusinessProfile.objects.all()
        serializer = BusinessProfileListSerializer(queryset, many=True)
        return Response(serializer.data)

class ServiceRequestListView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        queryset = ServiceRequest.objects.all().order_by('-created_at')
        serializer = ServiceRequestListSerializer(queryset, many=True)
        return Response(serializer.data)

class ChatRoomListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rooms = ChatRoom.objects.filter(participants=request.user).select_related('service_request').prefetch_related('participants', 'messages')
        data = []
        
        for room in rooms:
            # Get the other participant (not the current user)
            other_participant = next(
                (user for user in room.participants.all() if user != request.user),
                None
            )
            
            # Get the latest message if any
            latest_message = room.messages.order_by('-timestamp').first()
            
            room_data = {
                'id': room.id,
                'service_request': {
                    'id': room.service_request.id,
                    'title': room.service_request.title,
                },
                'other_participant': {
                    'username': other_participant.username if other_participant else None,
                },
                'latest_message': {
                    'content': latest_message.content if latest_message else None,
                    'timestamp': latest_message.timestamp if latest_message else None,
                    'sender': latest_message.sender.username if latest_message else None,
                } if latest_message else None,
                'created_at': room.created_at,
            }
            data.append(room_data)
            
        # Sort by latest message timestamp or room creation date
        data.sort(key=lambda x: (
            x['latest_message']['timestamp'] if x['latest_message'] else x['created_at']
        ), reverse=True)
        
        return Response(data)

class MessageListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        try:
            room = ChatRoom.objects.get(id=room_id)
            if request.user not in room.participants.all():
                return Response({'error': 'Not allowed'}, status=403)
            messages = room.messages.order_by('timestamp')
            data = [
                {
                    'id': msg.id,
                    'sender': msg.sender.username,
                    'content': msg.content,
                    'timestamp': msg.timestamp,
                }
                for msg in messages
            ]
            return Response(data)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Room not found'}, status=404)

class CreateChatRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        service_request_id = request.data.get('service_request_id')
        try:
            sr = ServiceRequest.objects.get(id=service_request_id)
            # Only allow poster and business user
            if sr.user == request.user:
                other_user = request.data.get('other_user')
                if not other_user:
                    return Response({'error': 'Other user required'}, status=400)
                other = User.objects.get(username=other_user)
            else:
                other = sr.user
            # Check if room exists
            room, created = ChatRoom.objects.get_or_create(service_request=sr)
            room.participants.add(request.user, other)
            return Response({'room_id': room.id})
        except ServiceRequest.DoesNotExist:
            return Response({'error': 'Service request not found'}, status=404)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)