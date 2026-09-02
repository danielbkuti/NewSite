import re

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .tokens import account_activation_token


def send_activation_email(user):
    """
    Generates a fresh activation token + uid for the user and emails the
    activation link.

    Shared by both the template-based signup flow (views.signup_view) and
    the JSON signup_api, so there's exactly one place that builds this
    email instead of two copies drifting apart.
    """
    token = account_activation_token.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))

    message = render_to_string('account/acc_active_email.html', {
        'user': user,
        'uid': uid,
        'token': token,
    })
    send_mail('Activate your account', message, settings.DEFAULT_FROM_EMAIL, [user.email])


def send_signup_verification_email(pending_signup):
    """
    Step 1 of the multi-step signup flow — emails the 6-digit code that
    continues it (SignupVerify.jsx collects this on the same page the
    user is already on, rather than requiring them to open the email
    and click a link). Called again on a "resend" — the caller
    (signup_start_api) is what actually generates the fresh code before
    this runs.
    """
    message = render_to_string('account/signup_verification_email.html', {
        'email': pending_signup.email,
        'code': pending_signup.code,
    })
    send_mail(
        'Your Fauxcus verification code',
        message,
        settings.DEFAULT_FROM_EMAIL,
        [pending_signup.email],
    )


def send_password_reset_email(user):
    """
    Uses Django's own PasswordResetTokenGenerator (default_token_generator)
    rather than the custom activation TokenGenerator in tokens.py — its
    hash already folds in the user's current password + last_login, so
    the token naturally stops working the moment the password actually
    changes (or after Django's own PASSWORD_RESET_TIMEOUT). That's
    exactly the property a reset link needs and the activation token,
    built for a different purpose, doesn't provide.
    """
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

    message = render_to_string('account/password_reset_email.html', {
        'user': user,
        'reset_url': reset_url,
    })
    send_mail('Reset your Fauxcus password', message, settings.DEFAULT_FROM_EMAIL, [user.email])


def generate_username_from_name(first_name, last_name):
    """
    Fallback for when step 3 left the optional username blank — builds
    one from the name (e.g. "Grace Hopper" -> "gracehopper"), appending
    a numeric suffix if that's already taken.
    """
    User = get_user_model()
    base = re.sub(r"[^a-z0-9]", "", f"{first_name}{last_name}".lower()) or "user"

    username = base
    suffix = 1
    while User.objects.filter(username__iexact=username).exists():
        suffix += 1
        username = f"{base}{suffix}"
    return username
