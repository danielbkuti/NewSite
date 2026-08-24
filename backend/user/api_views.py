import json
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.http import JsonResponse
from django.utils import timezone
from django.utils.http import urlsafe_base64_decode
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .forms import (
    CustomLoginForm,
    SignupStartForm,
    SignupDetailsForm,
    SignupCompleteForm,
    PasswordResetRequestForm,
    PasswordResetConfirmForm,
)
from .models import PendingSignup, generate_signup_token
from .ratelimit import is_rate_limited, record_attempt, reset_rate_limit
from .services import (
    send_signup_verification_email,
    send_password_reset_email,
    generate_username_from_name,
)

User = get_user_model()

# How long a signup-in-progress (and its verification link) stays valid.
PENDING_SIGNUP_EXPIRY = timedelta(hours=24)

# Failed login attempts, per IP, before login_api starts refusing to
# even check credentials for a while — a brute-force throttle, not an
# account lockout (it's keyed on IP, not username, so it can't be used
# to lock a legitimate user out of their own account from elsewhere).
LOGIN_RATE_LIMIT = 5
LOGIN_RATE_WINDOW_SECONDS = 15 * 60

# Password-reset requests, per IP — looser than login (every request
# here "succeeds" from the caller's point of view regardless of
# whether the email exists), mainly to stop this becoming a free email
# bomb rather than to stop credential guessing.
PASSWORD_RESET_RATE_LIMIT = 3
PASSWORD_RESET_RATE_WINDOW_SECONDS = 60 * 60


@ensure_csrf_cookie
def check_auth(request):
    """
    Reports auth status, and (via @ensure_csrf_cookie) hands the frontend a
    csrftoken cookie on first load. The React app calls this once on mount —
    both to know whether to show the login screen, and to prime the CSRF
    cookie it needs before it can POST to /user/api/login/.
    """
    if request.user.is_authenticated:
        return JsonResponse({
            "authenticated": True,
            "username": request.user.username,
            "first_name": request.user.first_name,
        })
    else:
        return JsonResponse({
            "authenticated": False,
        })


@require_http_methods(["POST"])
def login_api(request):
    """
    JSON counterpart to the existing template-based login_view. Reuses
    CustomLoginForm so validation/auth rules live in exactly one place.

    Rate-limited per client IP (LOGIN_RATE_LIMIT failed attempts per
    LOGIN_RATE_WINDOW_SECONDS) — checked before the credentials are
    even looked at, so once tripped, further guesses aren't processed
    at all. Only failures count against the limit; the counter resets
    the moment a login actually succeeds.
    """
    if is_rate_limited(request, "login", LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_SECONDS):
        return JsonResponse({
            "authenticated": False,
            "detail": "Too many failed login attempts. Please wait a few minutes and try again.",
        }, status=429)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON body."}, status=400)

    form = CustomLoginForm(request, data=data)
    if form.is_valid():
        reset_rate_limit(request, "login")
        user = form.get_user()
        login(request, user)
        return JsonResponse({
            "authenticated": True,
            "username": user.username,
            "first_name": user.first_name,
        })

    record_attempt(request, "login", LOGIN_RATE_WINDOW_SECONDS)
    return JsonResponse({
        "authenticated": False,
        "errors": form.errors.get_json_data(),
    }, status=400)


@require_http_methods(["POST"])
def logout_api(request):
    logout(request)
    return JsonResponse({"authenticated": False})


@require_http_methods(["POST"])
def signup_start_api(request):
    """
    Step 1 of the new multi-step signup flow: takes just an email,
    rejects it if a real account already has it, and otherwise creates
    (or refreshes) a PendingSignup and emails a verification link that
    continues the flow at /signup/verify/<token>/ in the React app.

    Re-submitting the same not-yet-verified email is treated as "start
    over" — it gets a fresh token (invalidating the old link) and its
    in-progress fields reset, rather than erroring.
    """
    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON body."}, status=400)

    form = SignupStartForm(data)
    if not form.is_valid():
        return JsonResponse({
            "success": False,
            "errors": form.errors.get_json_data(),
        }, status=400)

    email = form.cleaned_data["email"]

    pending, _created = PendingSignup.objects.update_or_create(
        email=email,
        defaults={
            "token": generate_signup_token(),
            "email_verified": False,
            "first_name": "",
            "last_name": "",
            "username": "",
        },
    )

    send_signup_verification_email(pending)

    return JsonResponse({"success": True})


@require_http_methods(["GET", "PATCH"])
def signup_pending_api(request, token):
    """
    One resource, two actions on it:

    - GET: hit when the emailed verification link is clicked. Marks the
      email verified and reports back what's already filled in, so the
      frontend knows which step to resume on (also makes a page refresh
      mid-flow non-destructive).
    - PATCH: step 3 — submits first/last name + an optional username.
      Requires the email to already be verified — enforces the step
      order server-side, not just by however the frontend happens to
      navigate.
    """
    try:
        pending = PendingSignup.objects.get(token=token)
    except PendingSignup.DoesNotExist:
        return JsonResponse({"detail": "This link is invalid or has expired."}, status=404)

    if timezone.now() - pending.created_at > PENDING_SIGNUP_EXPIRY:
        pending.delete()
        return JsonResponse({"detail": "This link is invalid or has expired."}, status=404)

    if request.method == "GET":
        if not pending.email_verified:
            pending.email_verified = True
            pending.save(update_fields=["email_verified"])

        return JsonResponse({
            "email": pending.email,
            "email_verified": pending.email_verified,
            "first_name": pending.first_name,
            "last_name": pending.last_name,
            "username": pending.username,
        })

    # PATCH from here on.
    if not pending.email_verified:
        return JsonResponse({"detail": "Please verify your email first."}, status=400)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON body."}, status=400)

    form = SignupDetailsForm(data)
    if not form.is_valid():
        return JsonResponse({
            "success": False,
            "errors": form.errors.get_json_data(),
        }, status=400)

    pending.first_name = form.cleaned_data["first_name"]
    pending.last_name = form.cleaned_data["last_name"]
    pending.username = form.cleaned_data["username"]
    pending.save(update_fields=["first_name", "last_name", "username"])

    return JsonResponse({
        "success": True,
        "email": pending.email,
        "first_name": pending.first_name,
        "last_name": pending.last_name,
        "username": pending.username,
    })


@require_http_methods(["POST"])
def signup_complete_api(request, token):
    """
    Step 4 (final) — takes the password and is what actually creates the
    real CustomUser; PendingSignup was only ever a staging area for
    everything collected in steps 1-3. Requires email_verified AND
    first/last name to already be filled in, enforcing that steps 2 and
    3 actually happened rather than just that the token exists.

    Deletes the PendingSignup once consumed, and logs the new user
    straight in — they just finished a whole guided signup, no reason
    to immediately ask them to log in again.
    """
    try:
        pending = PendingSignup.objects.get(token=token)
    except PendingSignup.DoesNotExist:
        return JsonResponse({"detail": "This link is invalid or has expired."}, status=404)

    if timezone.now() - pending.created_at > PENDING_SIGNUP_EXPIRY:
        pending.delete()
        return JsonResponse({"detail": "This link is invalid or has expired."}, status=404)

    if not pending.email_verified:
        return JsonResponse({"detail": "Please verify your email first."}, status=400)

    if not pending.first_name or not pending.last_name:
        return JsonResponse({"detail": "Please provide your name first."}, status=400)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON body."}, status=400)

    form = SignupCompleteForm(data, pending=pending)
    if not form.is_valid():
        return JsonResponse({
            "success": False,
            "errors": form.errors.get_json_data(),
        }, status=400)

    username = pending.username or generate_username_from_name(
        pending.first_name, pending.last_name
    )

    user = User.objects.create_user(
        username=username,
        email=pending.email,
        first_name=pending.first_name,
        last_name=pending.last_name,
        password=form.cleaned_data["password1"],
    )
    user.is_active = True
    user.save(update_fields=["is_active"])

    pending.delete()

    # login() normally learns which auth backend to credit from
    # authenticate() — we bypassed that by creating the user directly,
    # so with two backends configured (see AUTHENTICATION_BACKENDS) it
    # has no way to infer one. Has to be set explicitly.
    user.backend = settings.AUTHENTICATION_BACKENDS[0]
    login(request, user)

    return JsonResponse({
        "success": True,
        "authenticated": True,
        "username": user.username,
        "first_name": user.first_name,
    })


@require_http_methods(["GET"])
def check_email_exists(request):
    """
    Lets the landing page's single email box route to login vs. signup
    without the visitor picking which one themselves.

    Worth knowing: this is a real, if minor, email-enumeration surface —
    anyone can probe arbitrary addresses to learn which ones have
    accounts. Common tradeoff for this exact UX pattern; flagging it
    rather than silently shipping it.
    """
    email = request.GET.get("email", "").strip().lower()
    if not email:
        return JsonResponse({"detail": "Email is required."}, status=400)

    exists = User.objects.filter(email__iexact=email).exists()
    return JsonResponse({"exists": exists})


@require_http_methods(["POST"])
def password_reset_request_api(request):
    """
    Step 1 of forgot-password. Always responds the same way whether or
    not the email actually belongs to an account — unlike
    check_email_exists above, this endpoint deliberately does NOT leak
    that, since nothing in the reset flow itself needs to know.
    """
    if is_rate_limited(request, "password-reset", PASSWORD_RESET_RATE_LIMIT, PASSWORD_RESET_RATE_WINDOW_SECONDS):
        return JsonResponse({"detail": "Too many requests. Please wait a while and try again."}, status=429)
    record_attempt(request, "password-reset", PASSWORD_RESET_RATE_WINDOW_SECONDS)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON body."}, status=400)

    form = PasswordResetRequestForm(data)
    if not form.is_valid():
        return JsonResponse({"success": False, "errors": form.errors.get_json_data()}, status=400)

    email = form.cleaned_data["email"]
    try:
        # is_active=True: an account that never finished signup
        # verification has no usable password to reset yet.
        user = User.objects.get(email__iexact=email, is_active=True)
    except User.DoesNotExist:
        user = None

    if user is not None:
        send_password_reset_email(user)

    return JsonResponse({"success": True})


@require_http_methods(["GET", "POST"])
def password_reset_confirm_api(request, uidb64, token):
    """
    One resource, two actions on it — same shape as signup_pending_api:

    - GET: hit when the emailed link is first opened. Just validates
      the uid/token are still good, so the frontend can show the
      "choose a new password" form or a clean "link invalid/expired"
      state without requiring a submission first.
    - POST: sets the new password. Re-validates the same uid/token
      rather than trusting the earlier GET happened, since the two
      requests aren't otherwise tied together.
    """
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    valid = user is not None and default_token_generator.check_token(user, token)

    if request.method == "GET":
        return JsonResponse({"valid": valid})

    if not valid:
        return JsonResponse({"detail": "This link is invalid or has expired."}, status=400)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON body."}, status=400)

    form = PasswordResetConfirmForm(data, user=user)
    if not form.is_valid():
        return JsonResponse({"success": False, "errors": form.errors.get_json_data()}, status=400)

    user.set_password(form.cleaned_data["password1"])
    user.save(update_fields=["password"])

    # Same reasoning as signup_complete_api: we're not going through
    # authenticate(), so Django has no way to infer which backend to
    # credit — has to be set explicitly before login() will accept it.
    user.backend = settings.AUTHENTICATION_BACKENDS[0]
    login(request, user)

    return JsonResponse({
        "success": True,
        "authenticated": True,
        "username": user.username,
        "first_name": user.first_name,
    })
