from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, get_user_model
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from .tokens import account_activation_token

from .forms import CustomLoginForm, CustomSignupForm
from .services import send_activation_email


@login_required
def profile_view(request):
    return render(request, 'user/profile.html')


def signup_view(request):
    if request.method == 'POST':
        form = CustomSignupForm(request.POST)

        if form.is_valid():
            user = form.save(commit=False)
            user.is_active = True  # simplify for now
            user.save()

            send_activation_email(user)
            return render(request, 'account/account_activation_sent.html')

    return render(request, "account/signup.html", {"form": form})

def activate_view(request, uidb64, token):
    User = get_user_model()
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and account_activation_token.check_token(user, token):
        user.is_active = True
        user.save()
        return redirect('login')
    else:
        return render(request, 'account/activation_invalid.html')

def account_activation_sent_view(request):
    return render(request, 'account/account_activation_sent.html')

def login_view(request):
    if request.method == "POST":
        form = CustomLoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect("/")
    else:
        form = CustomLoginForm()



    return render(request, "account/login.html", {"form": form})


def logout_view(request):
    logout(request)
    return redirect("/")
