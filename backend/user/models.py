# models.py
import secrets

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

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
    # Opaque, unguessable — this identifies a PendingSignup to the
    # frontend across steps 1-4. No longer secret proof of email
    # ownership by itself (that's `code`, below) — the frontend is
    # handed this token directly in the signup_start_api response now,
    # rather than only via a clicked email link.
    return secrets.token_urlsafe(32)


def generate_signup_code():
    # 6-digit numeric code, zero-padded — emailed to the user and typed
    # back into the app to prove the address is theirs. secrets.randbelow
    # (not `random`) since this is a credential, however short-lived.
    return f"{secrets.randbelow(1_000_000):06d}"


class PendingSignup(models.Model):
    """
    Tracks a multi-step signup in progress, before a real CustomUser
    exists. CustomUser requires a username + password, which aren't
    collected until later steps — this model holds state across the
    email-verification step.

    Consumed (deleted) once the real CustomUser is created at the final
    step.
    """

    email = models.EmailField(unique=True)
    token = models.CharField(max_length=64, unique=True, default=generate_signup_token, db_index=True)
    email_verified = models.BooleanField(default=False)
    # The code emailed for step 2, how many wrong guesses have been made
    # against it (see SIGNUP_CODE_MAX_ATTEMPTS in api_views.py), and when
    # it was (re)sent — separate from `created_at` below, since
    # resending a code (signup_start_api called again for the same
    # email) refreshes this without resetting the overall signup's own
    # age/expiry.
    code = models.CharField(max_length=6, default=generate_signup_code)
    code_attempts = models.PositiveSmallIntegerField(default=0)
    # Not auto_now_add — every code-(re)send path (signup_start_api)
    # sets this explicitly to the moment that code was generated, and a
    # plain default (rather than auto_now_add) means adding this field
    # to already-existing rows didn't need a one-off migration prompt.
    code_sent_at = models.DateTimeField(default=timezone.now)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    username = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.email} ({'verified' if self.email_verified else 'unverified'})"