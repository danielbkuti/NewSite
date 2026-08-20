from django.urls import path
from .api_views import login_view, register_view, logout_view, auth_status, csrf

urlpatterns = [
    path("login/", login_view),
    path("register/", register_view),
    path("logout/", logout_view),
    path("auth/", auth_status),
    path("csrf/", csrf),  
]