
from django.urls import path, include
#from .views import ProfileView, CustomSignupView
from user.views import profile_view, signup_view, login_view, logout_view, activate_view, account_activation_sent_view

urlpatterns = [
    path('profile/', profile_view, name='user_profile'),
    path('signup/', signup_view, name='signup'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('activate/<uidb64>/<token>/', activate_view, name='activate'),
    path('account_activation_sent/', account_activation_sent_view, name='account_activation_sent'),
    #path("", include("allauth.urls")),

]