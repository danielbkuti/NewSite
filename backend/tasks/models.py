from django.db import models, transaction
from django.utils.timezone import now


def _sync_date_completed(instance, model_cls, kwargs):
    """
    Shared by Task.save() and SubTask.save(): sets dateCompleted to now()
    the moment `completed` actually flips to True, clears it back to
    None the moment it flips back to False — never touched any other
    time. Mutates `kwargs` in place to append "dateCompleted" to
    update_fields when the caller passed one (e.g.
    Task.update_completion_status() saves with
    update_fields=["completed"]); without that, Django would silently
    drop the dateCompleted change instead of persisting it.
    """
    update_fields = kwargs.get("update_fields")
    previous_completed = None
    if instance.pk:
        previous_completed = (
            model_cls.objects.filter(pk=instance.pk).values_list("completed", flat=True).first()
        )

    completed_changed = (
        previous_completed is not None and previous_completed != instance.completed
    ) or (previous_completed is None and instance.completed)

    if completed_changed:
        instance.dateCompleted = now() if instance.completed else None
        if update_fields is not None:
            kwargs["update_fields"] = list(update_fields) + ["dateCompleted"]


# Create your models here.
class Task(models.Model):
    user = models.ForeignKey("user.CustomUser", related_name="tasks", on_delete=models.CASCADE)
    name = models.CharField(max_length=100, null=False, blank=False)
    description = models.TextField(blank=True, null=True)
    dateCreated = models.DateTimeField(auto_now_add=True)
    dateDeadline = models.DateTimeField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    # Set automatically in save() whenever `completed` actually changes —
    # never set directly by a caller. Cleared back to None if the task
    # is reopened, so it always reflects the most recent completion
    # rather than the first one.
    dateCompleted = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('in_progress', 'In Progress'),
            ('completed', 'Completed')
        ],
        default='pending'
    )

    def save(self, *args, **kwargs):
        """See _sync_date_completed."""
        _sync_date_completed(self, Task, kwargs)
        super().save(*args, **kwargs)

    @property
    def days_since_created(self):
        """
        Returns the number of days since the task was created.
        This is computed dynamically to avoid storing derived data.
        """
        return (now() - self.dateCreated).days

    def update_completion_status(self):
        """
        Keeps completion state consistent with subtasks in one direction
        only: a task can never validly stay marked completed while one
        of its subtasks isn't, so it's reopened automatically the moment
        that happens.

        It deliberately does NOT go the other way — finishing the last
        subtask does not, by itself, mark the task completed. Completing
        a task is its own explicit action (gated client-side on every
        subtask already being done), separate from finishing the
        subtasks themselves — the two are tracked as distinct portions
        of a task's progress, not one triggering the other.

        Instead of loading all subtasks into memory, we ask the database
        whether any incomplete subtasks exist. This avoids unnecessary
        queries and scales better for tasks with many subtasks.
        """

        has_incomplete = self.subtasks.filter(completed=False).exists()

        if has_incomplete and self.completed:
            self.completed = False
            self.save(update_fields=["completed"])

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["-dateCreated"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "name"],
                name="unique_task_per_user"
            )
        ]
        indexes = [
            models.Index(fields=["user", "completed"]),
            models.Index(fields=["dateDeadline"]),
            models.Index(fields=["status"]),
        ]


class SubTask(models.Model):
    task = models.ForeignKey(Task, related_name="subtasks", on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    dateCreated = models.DateTimeField(auto_now_add=True)
    dateDeadline = models.DateTimeField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    # Same rules as Task.dateCompleted — set the moment `completed`
    # flips to True, cleared the moment it flips back. Lets the frontend
    # sort completed subtasks by when each was actually finished
    # (most-recent first) instead of losing that ordering entirely.
    dateCompleted = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        """
        Keeps dateCompleted in sync (see _sync_date_completed), then
        ensures the parent task's own completion state stays
        synchronized.
        """
        _sync_date_completed(self, SubTask, kwargs)
        with transaction.atomic():
            super().save(*args, **kwargs)
            self.task.update_completion_status()

    def __str__(self):
        return f"{self.name} (Subtask of {self.task.name})"
