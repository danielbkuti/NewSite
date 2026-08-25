from django.shortcuts import render
from django.http import HttpResponse, JsonResponse


# The real app is the React SPA (dev: http://localhost:3000) talking to
# this server's /api/ — nothing here at '/' is meant to be browsed
# directly. This used to render a pre-React prototype
# (templates/frontend/index.html, a static task-list mockup unrelated to
# the actual product), now removed; this is just a plain marker so
# hitting the API origin directly shows something sane instead of a 404
# or a dead page.
def api_root_view(request, *args, **kwargs):
    return JsonResponse(
        {
            "service": "flexmaster-api",
            "frontend": "http://localhost:3000",
            "api": "/api/",
            "admin": "/admin/",
        }
    )


def contact_view(request, *args, **kwargs):
    return render(request, "contact.html", {})
