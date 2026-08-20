from django.shortcuts import render
from django.http import HttpResponse


# Create your views here.
def frontend_view(request, *args, **kwargs):
    return render(request, "frontend/index.html", {})


def contact_view(request, *args, **kwargs):
    return render(request, "contact.html", {})
