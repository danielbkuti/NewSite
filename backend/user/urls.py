
from django.urls import path, include
from user.views import profile_view, signup_view, login_view, logout_view, activate_view, account_activation_sent_view
from user.api_views import (
    check_auth,
    login_api,
    logout_api,
    signup_start_api,
    signup_pending_api,
    signup_complete_api,
    check_email_exists,
)

urlpatterns = [
    path('profile/', profile_view, name='user_profile'),
    path('signup/', signup_view, name='signup'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('activate/<uidb64>/<token>/', activate_view, name='activate'),
    path('account_activation_sent/', account_activation_sent_view, name='account_activation_sent'),
    path("api/auth/", check_auth, name="check_auth"),
    path("api/login/", login_api, name="login_api"),
    path("api/logout/", logout_api, name="logout_api"),
    path("api/signup/start/", signup_start_api, name="signup_start_api"),
    path("api/signup/pending/<str:token>/", signup_pending_api, name="signup_pending_api"),
    path("api/signup/complete/<str:token>/", signup_complete_api, name="signup_complete_api"),
    path("api/email-exists/", check_email_exists, name="check_email_exists"),
    #path("", include("allauth.urls")),

]