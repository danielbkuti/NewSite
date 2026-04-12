from django.http import JsonResponse

def check_auth(request):
    if request.user.is_authenticated:
        return JsonResponse({
            "authenticated": True,
            "username": request.user.username
        })
    else:
        return JsonResponse({
            "authenticated": False
        })