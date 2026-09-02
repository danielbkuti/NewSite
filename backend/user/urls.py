
from django.urls import path, include
from user.views import profile_view, signup_view, login_view, logout_view, activate_view, account_activation_sent_view
from user.api_views import (
    check_auth,
    login_api,
    logout_api,
    signup_start_api,
    signup_pending_api,
    signup_verify_code_api,
    signup_complete_api,
    check_email_exists,
    password_reset_request_api,
    password_reset_confirm_api,
    profile_api,
    change_password_api,
    delete_account_api,
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
    path("api/signup/verify-code/<str:token>/", signup_verify_code_api, name="signup_verify_code_api"),
    path("api/signup/complete/<str:token>/", signup_complete_api, name="signup_complete_api"),
    path("api/email-exists/", check_email_exists, name="check_email_exists"),
    path("api/password-reset/request/", password_reset_request_api, name="password_reset_request_api"),
    path(
        "api/password-reset/confirm/<uidb64>/<token>/",
        password_reset_confirm_api,
        name="password_reset_confirm_api",
    ),
    path("api/profile/", profile_api, name="profile_api"),
    path("api/profile/password/", change_password_api, name="change_password_api"),
    path("api/profile/delete/", delete_account_api, name="delete_account_api"),
    #path("", include("allauth.urls")),

]