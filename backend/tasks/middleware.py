import pytz
from django.utils.timezone import activate

class TimezoneMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tzname = request.COOKIES.get('timezone')
        try:
            timezone = pytz.timezone(tzname)
            activate(timezone)
        except Exception:
            activate(pytz.UTC)

        response = self.get_response(request)
        return response
