from django.core.cache import cache


def get_client_ip(request):
    """
    Prefers X-Forwarded-For (set by a reverse proxy/load balancer) over
    REMOTE_ADDR, taking the first hop — the client's own address, not
    whatever proxy relayed the request. Falls back to REMOTE_ADDR for
    the common case of no proxy in front (e.g. local dev).
    """
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def is_rate_limited(request, scope, limit, window_seconds):
    """
    Fixed-window counter keyed by (scope, client IP), backed by
    Django's cache framework rather than a dedicated package — nothing
    here needs more than that. Only reports whether the caller is
    already over the limit; call record_attempt() separately to
    actually count this attempt (kept apart so a caller can choose to
    only count failures, e.g. login).

    Not distributed-safe — the default cache backend (LocMemCache) is
    per-process, so this only actually rate-limits a single-process
    deployment. Fine for this app's current setup; would need a shared
    backend (Redis etc.) behind multiple worker processes.
    """
    key = f"ratelimit:{scope}:{get_client_ip(request)}"
    return cache.get(key, 0) >= limit


def record_attempt(request, scope, window_seconds):
    key = f"ratelimit:{scope}:{get_client_ip(request)}"
    cache.set(key, cache.get(key, 0) + 1, window_seconds)


def reset_rate_limit(request, scope):
    cache.delete(f"ratelimit:{scope}:{get_client_ip(request)}")
