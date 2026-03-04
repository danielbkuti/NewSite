# models.py
from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    """
    Custom user model.

    - Enforces unique email addresses.
    - Defaults accounts to inactive until email verification.
    - Provides future extensibility for roles and profile data.
    """

    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=False) 

    def __str__(self):
        return self.username