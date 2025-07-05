from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from .email_utils import send_verification_email
from .models import UserProfile, ServiceRequest
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
import os

User = get_user_model()

class EmailUtilsTestCase(TestCase):
    def test_send_verification_email(self):
        # This test checks that the function runs without raising exceptions
        try:
            send_verification_email('test@example.com', '123456')
        except Exception as e:
            self.fail(f"send_verification_email raised Exception unexpectedly: {e}")

class AuthVerificationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/register/'
        self.verify_url = '/api/verify/'
        self.login_url = '/api/login/'
        self.user_data = {
            'username': 'testuser',
            'email': 'testuser@example.com',
            'password1': 'Testpass123!',
            'password2': 'Testpass123!',
        }

    def test_registration_sends_email(self):
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, 201)
        # The response should indicate that an email was sent

    def test_verification_and_login_flow(self):
        # Register user
        self.client.post(self.register_url, self.user_data, format='json')
        # Get the code from the database
        user = User.objects.get(username='testuser')
        code = user.userprofile.verification_code
        # Verify code
        response = self.client.post(self.verify_url, {
            'username': 'testuser',
            'code': code,
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('key', response.data)
        # Try login after verification
        login_response = self.client.post(self.login_url, {
            'username': 'testuser',
            'password': 'Testpass123!',
        }, format='json')
        self.assertEqual(login_response.status_code, 200)
        self.assertIn('key', login_response.data)

class BusinessProfileTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/register/'
        self.business_data = {
            'username': 'bizuser',
            'email': 'bizuser@example.com',
            'password1': 'Bizpass123!',
            'password2': 'Bizpass123!',
            'is_business_owner': True,
            'business_name': 'BizName',
            'industry': ['Construction', 'Electrical'],
            'services': ['Repair', 'Installation'],
        }

    def test_business_profile_creation(self):
        # Register business user
        response = self.client.post(self.register_url, self.business_data, format='json')
        self.assertEqual(response.status_code, 201)
        # Check user and profile created
        user = User.objects.get(username='bizuser')
        profile = user.userprofile
        self.assertTrue(profile.is_business_owner)
        self.assertEqual(profile.business_name, 'BizName')
        self.assertIn('Construction', profile.industry)
        self.assertIn('Electrical', profile.industry)
        self.assertIn('Repair', profile.services)
        self.assertIn('Installation', profile.services)

    def test_business_profile_requires_fields_at_registration(self):
        # Missing business_name
        data = self.business_data.copy()
        del data['business_name']
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, 400)
        
        # Missing industry
        data = self.business_data.copy()
        del data['industry']
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, 400)

class UpdateBusinessInfoTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/register/'
        self.login_url = '/api/login/'
        self.update_business_url = '/api/update-business-info/'
        self.user_data = {
            'username': 'testuser_for_update',
            'email': 'testuser.update@example.com',
            'password1': 'Testpass123!',
            'password2': 'Testpass123!',
            'is_business_owner': False
        }
        self.business_data = {
            'is_business_owner': True,
            'business_name': 'Updated Biz Name',
            'industry': ['Plumbing'],
            'services': ['Repair']
        }
        # Register and verify user
        self.client.post(self.register_url, self.user_data, format='json')
        self.user = User.objects.get(username=self.user_data['username'])
        self.user.userprofile.is_verified = True
        self.user.userprofile.save()

        # Login to get token
        login_response = self.client.post(self.login_url, {
            'username': self.user_data['username'],
            'password': self.user_data['password1'],
        }, format='json')
        self.token = login_response.data['key']
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token)

    def test_update_user_to_business(self):
        response = self.client.post(self.update_business_url, self.business_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        profile = self.user.userprofile
        self.assertTrue(profile.is_business_owner)
        self.assertEqual(profile.business_name, self.business_data['business_name'])
        self.assertIn('Plumbing', profile.industry)
        self.assertIn('Repair', profile.services)

class ServiceRequestTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/register/'
        self.login_url = '/api/login/'
        self.service_request_url = '/api/service-request/'
        self.user_data = {
            'username': 'servicerequester',
            'email': 'requester@example.com',
            'password1': 'Testpass123!',
            'password2': 'Testpass123!',
        }
        # Register and verify user
        self.client.post(self.register_url, self.user_data, format='json')
        self.user = User.objects.get(username=self.user_data['username'])
        self.user.userprofile.is_verified = True
        self.user.userprofile.save()

        # Login to get token
        login_response = self.client.post(self.login_url, {
            'username': self.user_data['username'],
            'password': self.user_data['password1'],
        }, format='json')
        self.token = login_response.data['key']
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token)

        # Create a dummy image for upload
        self.image = SimpleUploadedFile("test_image.jpg", b"file_content", content_type="image/jpeg")

    def test_create_service_request_with_image(self):
        service_data = {
            'title': 'Leaky Faucet',
            'description': 'My kitchen faucet is leaking.',
            'location': '123 Main St',
            'services_needed': ['Repair'],
            'price': '50.00',
            'image1': self.image
        }
        response = self.client.post(self.service_request_url, service_data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ServiceRequest.objects.count(), 1)
        sr = ServiceRequest.objects.first()
        self.assertEqual(sr.title, 'Leaky Faucet')
        self.assertEqual(sr.images.count(), 1)
        # Check if file exists
        self.assertTrue(os.path.exists(sr.images.first().image.path))
        # Clean up the created file
        os.remove(sr.images.first().image.path)
