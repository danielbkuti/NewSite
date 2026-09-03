from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.template.loader import render_to_string
from django.utils import timezone

from tasks.models import Notification, SubTask, Task

# Same 24h "due soon" window the frontend itself already uses
# (frontend/src/lib/utils.js's URGENT_WINDOW_MS) — a task doesn't
# become digest-eligible until it's inside the same window the app's
# own UI already flags as urgent, so the two agree on what "due soon"
# means instead of the digest inventing its own threshold.
DIGEST_WINDOW = timedelta(hours=24)


class Command(BaseCommand):
    help = (
        "Sends one daily digest per user — in-app Notification rows plus "
        "a single summary email — for every active task/subtask due "
        "within the next 24 hours that hasn't already been reminded "
        "about for its *current* deadline (Task.reminderSentAt / "
        "SubTask.reminderSentAt, cleared automatically whenever a "
        "deadline actually changes — see those fields' own comments in "
        "tasks/models.py). Meant to run once a day — see the `scheduler` "
        "service in docker-compose.yml. Deliberately not Celery: this "
        "app has no task queue set up at all yet, and a once-a-day job "
        "doesn't need one — see README.md's Future Improvements."
    )

    def handle(self, *args, **options):
        now = timezone.now()
        window_end = now + DIGEST_WINDOW

        User = get_user_model()
        users_notified = 0
        items_notified = 0

        for user in User.objects.filter(is_active=True):
            due_tasks = Task.objects.filter(
                user=user,
                completed=False,
                reminderSentAt__isnull=True,
                dateDeadline__gt=now,
                dateDeadline__lte=window_end,
            )
            due_subtasks = SubTask.objects.filter(
                task__user=user,
                completed=False,
                reminderSentAt__isnull=True,
                dateDeadline__gt=now,
                dateDeadline__lte=window_end,
            ).select_related("task")

            # A plain list of dicts rather than mixing Task/SubTask
            # instances directly — the two need slightly different
            # shapes below (a subtask also carries its parent task's
            # name), and this keeps the sort/render logic below from
            # needing to branch on type at every step.
            items = [
                {"kind": "task", "name": t.name, "dateDeadline": t.dateDeadline, "obj": t}
                for t in due_tasks
            ] + [
                {
                    "kind": "subtask",
                    "name": s.name,
                    "dateDeadline": s.dateDeadline,
                    "obj": s,
                    "task_name": s.task.name,
                }
                for s in due_subtasks
            ]

            if not items:
                continue

            items.sort(key=lambda i: i["dateDeadline"])

            for item in items:
                obj = item["obj"]
                if item["kind"] == "task":
                    message = f'"{item["name"]}" is due soon'
                else:
                    message = f'"{item["name"]}" (part of "{item["task_name"]}") is due soon'

                Notification.objects.create(
                    user=user,
                    task=obj if item["kind"] == "task" else obj.task,
                    subtask=obj if item["kind"] == "subtask" else None,
                    message=message,
                )
                # update_fields=["reminderSentAt"] — Task.save()/
                # SubTask.save() only logs a TaskActivity row for
                # name/completed/dateDeadline actually changing, none of
                # which this touches, so this doesn't add noise to the
                # task's own activity log.
                obj.reminderSentAt = now
                obj.save(update_fields=["reminderSentAt"])
                items_notified += 1

            body = render_to_string(
                "tasks/deadline_digest_email.html",
                {"user": user, "items": items, "frontend_url": settings.FRONTEND_URL},
            )
            send_mail(
                f'{len(items)} task{"s" if len(items) != 1 else ""} due soon on Fauxcus',
                body,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
            )
            users_notified += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Digest sent to {users_notified} user(s), {items_notified} item(s) notified."
            )
        )
