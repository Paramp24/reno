import random
import string
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.authtoken.models import Token
from django.shortcuts import get_object_or_404
from .models import INDUSTRY_CHOICES, SERVICES_CHOICES, ServiceRequest, ServiceRequestImage, BusinessProfile, UserProfile, ChatRoom, Message
from .email_utils import send_verification_email
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers

# New API to update business owner info
class UpdateBusinessInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        profile = user.userprofile
        data = request.data

        is_business_owner = data.get('is_business_owner', False)
        business_name = data.get('business_name', '')
        industry = data.get('industry', [])
        services = data.get('services', [])

        profile.is_business_owner = is_business_owner in [True, 'true', 'True', 1, '1']
        if profile.is_business_owner:
            profile.business_name = business_name
            profile.industry = industry
            profile.services = services
        else:
            profile.business_name = ''
            profile.industry = []
            profile.services = []
        profile.save()

        return Response({'detail': 'Business info updated'}, status=status.HTTP_200_OK)

# Additional imports for Google token verification
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

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
        return Response({"username": request.user.username})

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

class ChatRoomSerializer(serializers.ModelSerializer):
    other_participant = serializers.SerializerMethodField()
    service_request = ServiceRequestListSerializer()
    latest_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'service_request', 'created_at', 'other_participant', 'latest_message']

    def get_other_participant(self, obj):
        user = self.context['request'].user
        other_user = obj.participants.exclude(id=user.id).first()
        return {'username': other_user.username, 'id': other_user.id} if other_user else None

    def get_latest_message(self, obj):
        latest = obj.messages.order_by('-timestamp').first()
        if latest:
            return {
                'content': latest.content,
                'sender': latest.sender.username,
                'timestamp': latest.timestamp
            }
        return None

class ChatMessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'content', 'sender', 'timestamp']

    def get_sender(self, obj):
        return {'username': obj.sender.username, 'id': obj.sender.id}

class ChatRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rooms = ChatRoom.objects.filter(participants=request.user)
        serializer = ChatRoomSerializer(rooms, many=True, context={'request': request})
        return Response(serializer.data)

class CreateChatRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        service_request_id = request.data.get('service_request_id')
        service_request = get_object_or_404(ServiceRequest, id=service_request_id)
        
        # Check if room already exists
        existing_room = ChatRoom.objects.filter(
            service_request=service_request,
            participants=request.user
        ).first()
        
        if existing_room:
            return Response({'room_id': existing_room.id})
            
        room = ChatRoom.objects.create(service_request=service_request)
        room.participants.add(request.user, service_request.user)
        return Response({'room_id': room.id})

class ChatMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        room = get_object_or_404(ChatRoom, id=room_id)
        if request.user not in room.participants.all():
            return Response({'error': 'Not authorized'}, status=403)
            
        messages = Message.objects.filter(room=room).order_by('-timestamp')
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request())
            email = idinfo.get('email')
            base_username = idinfo.get('name') or email.split('@')[0]

            if not email:
                return Response({'error': 'Email not available in token'}, status=status.HTTP_400_BAD_REQUEST)

            user, created = User.objects.get_or_create(
                email=email,
                defaults={'username': base_username}
            )

            if created:
                # Ensure username is unique if the default one was taken
                if User.objects.filter(username=base_username).count() > 1:
                    username = f"{base_username}{user.id}"
                    user.username = username
                
                user.set_unusable_password()
                user.save()
                
                # Create a basic profile, verification is implicitly true with Google
                profile = user.userprofile
                profile.is_verified = True
                profile.save()

            token_obj, _ = Token.objects.get_or_create(user=user)
            return Response({'key': token_obj.key, 'new_user': created}, status=status.HTTP_200_OK)

        except ValueError:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)



















