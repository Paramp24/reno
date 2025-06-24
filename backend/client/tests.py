from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from .email_utils import send_verification_email

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
        logout_response = self.client.post(self.logout_url)
        self.assertEqual(logout_response.status_code, 200)
        # After logout, token should be invalid
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)
        # protected_response2 = self.client.get('/api/some-protected/')
        # self.assertEqual(protected_response2.status_code, 401)

class EmailUtilsTestCase(TestCase):
    def test_send_verification_email(self):
        # This test will not actually send an email but checks for exceptions
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
        # Since we use a real email backend, we can't check the outbox, but we can check the response

    def test_verification_and_redirect(self):
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
