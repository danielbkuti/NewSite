"""
Tiny always-on process that runs `manage.py send_deadline_digest` once a
day. Not Celery/Celery Beat — this app has no task queue or broker set
up at all (see README.md's Future Improvements), and a single once-daily
job doesn't need one; a sleep-until-target-time loop is the whole job.
Run as the `scheduler` service in docker-compose.yml, same image as
`web`, so it shares the exact same Django settings/dependencies without
a second Dockerfile.
"""
import datetime
import os
import subprocess
import sys
import time

# UTC hour the digest goes out — arbitrary but fixed, so "once a day"
# actually means once a day rather than drifting with restarts.
DIGEST_HOUR_UTC = int(os.environ.get("DIGEST_HOUR_UTC", "13"))


def seconds_until_next_run():
    now = datetime.datetime.now(datetime.timezone.utc)
    target = now.replace(hour=DIGEST_HOUR_UTC, minute=0, second=0, microsecond=0)
    if target <= now:
        target += datetime.timedelta(days=1)
    return (target - now).total_seconds()


def run_digest():
    result = subprocess.run(
        [sys.executable, "backend/manage.py", "send_deadline_digest"],
        capture_output=True,
        text=True,
    )
    if result.stdout:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="", file=sys.stderr)


if __name__ == "__main__":
    print(f"[scheduler] started — digest runs daily at {DIGEST_HOUR_UTC:02d}:00 UTC", flush=True)
    while True:
        wait_s = seconds_until_next_run()
        print(f"[scheduler] sleeping {wait_s:.0f}s until next run", flush=True)
        time.sleep(wait_s)
        print("[scheduler] running send_deadline_digest", flush=True)
        run_digest()
