import re

from django.conf import settings
from django.contrib.auth import get_user_model
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
    send_mail('Activate your account', message, 'noreply@yourdomain.com', [user.email])


def send_signup_verification_email(pending_signup):
    """
    Step 1 of the multi-step signup flow — emails the link that continues
    it. Points at the React app's route (FRONTEND_URL), not this server's
    own host, since verification here is handled entirely by the SPA
    hitting a JSON endpoint, unlike the older activation-link flow above.
    """
    verify_url = f"{settings.FRONTEND_URL}/signup/verify/{pending_signup.token}/"

    message = render_to_string('account/signup_verification_email.html', {
        'email': pending_signup.email,
        'verify_url': verify_url,
    })
    send_mail(
        'Verify your email to continue signing up',
        message,
        'noreply@yourdomain.com',
        [pending_signup.email],
    )


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
