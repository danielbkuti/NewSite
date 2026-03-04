from django.test import TestCase
from django.contrib.auth import get_user_model


class AuthTestCase(TestCase):

    def test_user_defaults_inactive(self):
        """
        Newly created users should default to inactive.
        """
        user = get_user_model().objects.create_user(
            username="newuser",
            email="new@test.com",
            password="password123"
        )

        self.assertFalse(user.is_active)