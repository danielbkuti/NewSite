from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

User = get_user_model()

class EmailOrUsernameBackend(ModelBackend):
    """
    Custom authentication backend that allows users to log in 
    using either their username or email address.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Look for a user where either username OR email matches the input
            user = User.objects.get(Q(username__iexact=username) | Q(email__iexact=username))
        except User.DoesNotExist:
            return None
        except User.MultipleObjectsReturned:
            # If multiple users share the same email, pick the first one 
            # (ensure your emails are unique in the model to avoid this)
            return User.objects.filter(Q(username__iexact=username) | Q(email__iexact=username)).first()

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None