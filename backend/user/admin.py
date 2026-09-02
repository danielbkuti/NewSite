from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, PendingSignup


class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff')


class PendingSignupAdmin(admin.ModelAdmin):
    list_display = ('email', 'email_verified', 'code', 'code_attempts', 'username', 'created_at')
    readonly_fields = ('token', 'code', 'code_sent_at', 'created_at')


admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(PendingSignup, PendingSignupAdmin)
