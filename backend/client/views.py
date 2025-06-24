import random
import string
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.authtoken.models import Token
from .models import UserProfile
from .email_utils import send_verification_email

def generate_code(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        username = data.get('username')
        email = data.get('email')
        password = data.get('password1')
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username exists'}, status=400)
        user = User.objects.create_user(username=username, email=email, password=password)
        code = generate_code()
        profile = user.userprofile
        profile.verification_code = code
        profile.is_verified = False
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

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class HelloView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response({"message": "Hello, authenticated user!"})