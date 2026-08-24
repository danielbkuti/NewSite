from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class CustomSignupForm(UserCreationForm):
    first_name = forms.CharField(max_length=30, required=True)
    last_name = forms.CharField(max_length=30, required=True)

    class Meta:
        model = User
        fields = ("username", "first_name", "last_name", "email", "password1", "password2")


class CustomLoginForm(AuthenticationForm):
    username = forms.CharField(label="Email or Username")


class SignupStartForm(forms.Form):
    """Step 1 of the multi-step signup flow — just an email."""
    email = forms.EmailField()

    def clean_email(self):
        email = self.cleaned_data["email"].lower()
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("An account with this email already exists.")
        return email


class SignupDetailsForm(forms.Form):
    """
    Step 3 — first/last name + an optional username. If left blank here,
    a username gets generated at the final (password) step instead.
    """
    first_name = forms.CharField(max_length=150)
    last_name = forms.CharField(max_length=150)
    username = forms.CharField(max_length=150, required=False)

    def clean_username(self):
        username = self.cleaned_data.get("username", "").strip()
        if username and User.objects.filter(username__iexact=username).exists():
            raise forms.ValidationError("That username is already taken.")
        return username


class SignupCompleteForm(forms.Form):
    """
    Step 4 (final) — sets the password and, on success, is what triggers
    the real CustomUser actually getting created.
    """
    password1 = forms.CharField()
    password2 = forms.CharField()

    def __init__(self, *args, pending=None, **kwargs):
        self.pending = pending
        super().__init__(*args, **kwargs)

    def clean_password1(self):
        password1 = self.cleaned_data.get("password1")
        if password1 and self.pending is not None:
            # Build an unsaved User with the pending signup's data so
            # Django's UserAttributeSimilarityValidator can check the
            # password isn't just their own name/email — there's no
            # real user to check against yet, since this IS the step
            # that creates one.
            temp_user = User(
                username=self.pending.username or "",
                email=self.pending.email,
                first_name=self.pending.first_name,
                last_name=self.pending.last_name,
            )
            validate_password(password1, user=temp_user)
        return password1

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("The two password fields didn't match.")
        return password2


class PasswordResetRequestForm(forms.Form):
    """Step 1 of forgot-password — just an email, same shape as signup's."""
    email = forms.EmailField()


class PasswordResetConfirmForm(forms.Form):
    """
    Sets a new password for an already-identified, already-token-
    verified user — resolving the uid and checking the token both
    happen at the view level before this form ever runs, so `user` is
    passed in already known-good rather than looked up here.
    """
    password1 = forms.CharField()
    password2 = forms.CharField()

    def __init__(self, *args, user=None, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)

    def clean_password1(self):
        password1 = self.cleaned_data.get("password1")
        if password1 and self.user is not None:
            validate_password(password1, user=self.user)
        return password1

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("The two password fields didn't match.")
        return password2
