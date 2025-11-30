from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


class AccountsTests(APITestCase):
    def test_register_and_login(self):
        register_url = reverse('accounts:register')
        login_url = reverse('accounts:login')
        me_url = reverse('accounts:me')

        # Register a new user
        data = {
            'username': 'testuser',
            'email': 'testuser@example.com',
            'password': 's3cur3pass',
            'password2': 's3cur3pass'
        }
        resp = self.client.post(register_url, data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.filter(username='testuser').count(), 1)

        # Login
        resp = self.client.post(login_url, {'username': 'testuser', 'password': 's3cur3pass'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Check current user (requires authentication)
        resp = self.client.get(me_url, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['username'], 'testuser')

    def test_register_duplicate_username(self):
        url = reverse('accounts:register')
        data = {
            'username': 'dupuser',
            'email': 'dup@example.com',
            'password': 's3cur3pass',
            'password2': 's3cur3pass'
        }
        resp = self.client.post(url, data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        # attempt to register again with same username
        resp2 = self.client.post(url, data, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', resp2.data)
