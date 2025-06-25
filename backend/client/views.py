import random
import string
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.authtoken.models import Token
from .models import INDUSTRY_CHOICES, SERVICES_CHOICES, ServiceRequest, ServiceRequestImage
from .email_utils import send_verification_email
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django.core.files.base import ContentFile
import base64

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
        for key in request.FILES:
            if key.startswith('image'):
                images.append(request.FILES[key])
        
        # Handle services_needed as either JSON string or list
        if isinstance(services_needed_json, str):
            import json
            try:
                services_needed = json.loads(services_needed_json)
            except:
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
            for img in images:
                ServiceRequestImage.objects.create(service_request=sr, image=img)

            # Add two default 1×1 white pixel images
            white_pixel_b64 = b'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M+AAQAEAEbCDaDGAAAAAElFTkSuQmCC'
            content_file_1 = ContentFile(base64.b64decode(white_pixel_b64), 'white_pixel_1.png')
            content_file_2 = ContentFile(base64.b64decode(white_pixel_b64), 'white_pixel_2.png')
            ServiceRequestImage.objects.create(service_request=sr, image=content_file_1)
            ServiceRequestImage.objects.create(service_request=sr, image=content_file_2)
            return Response({'detail': 'Service request created.'}, status=201)
        except Exception as e:
            print("ServiceRequest creation error:", e)  # Debug line
            return Response({'error': str(e)}, status=500)