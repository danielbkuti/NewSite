from django.shortcuts import render
from django.http import HttpResponse


# Create your views here.
def app_view(request, *args, **kwargs):
    return render(request, "base.html", {})


def contact_view(request, *args, **kwargs):
    return render(request, "contact.html", {})
