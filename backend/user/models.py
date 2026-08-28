# models.py
import secrets

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
    # Optional — added for the profile page. Nothing in signup collects
    # this yet, so every existing account has it unset until someone
    # fills it in from their own profile.
    date_of_birth = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.username


def generate_signup_token():
    # Opaque, unguessable — this token IS the lookup key for a
    # PendingSignup (there's no user yet to hash against, unlike the
    # activation-link TokenGenerator).
    return secrets.token_urlsafe(32)


class PendingSignup(models.Model):
    """
    Tracks a multi-step signup in progress, before a real CustomUser
    exists. CustomUser requires a username + password, which aren't
    collected until later steps — this model holds state across the
    email-verification hop, which may happen in a completely different
    browser/device than where step 1 started.

    Consumed (deleted) once the real CustomUser is created at the final
    step.
    """

    email = models.EmailField(unique=True)
    token = models.CharField(max_length=64, unique=True, default=generate_signup_token, db_index=True)
    email_verified = models.BooleanField(default=False)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    username = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.email} ({'verified' if self.email_verified else 'unverified'})"