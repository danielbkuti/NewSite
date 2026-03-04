from django.db import models, transaction
from django.utils.timezone import now


# Create your models here.
class Task(models.Model):
    user = models.ForeignKey("user.CustomUser", related_name="tasks", on_delete=models.CASCADE)
    name = models.CharField(max_length=100, null=False, blank=False)
    description = models.TextField(blank=True, null=True)
    dateCreated = models.DateTimeField(auto_now_add=True)
    dateDeadline = models.DateTimeField(null=True, blank=True)
    completed = models.BooleanField(default=False)

    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('in_progress', 'In Progress'),
            ('completed', 'Completed')
        ],
        default='pending'
    )

    @property
    def days_since_created(self):
        """
        Returns the number of days since the task was created.
        This is computed dynamically to avoid storing derived data.
        """
        return (now() - self.dateCreated).days

    def update_completion_status(self):
        """
        Synchronizes parent task completion state based on subtasks.

        Instead of loading all subtasks into memory, we ask the database
        whether any incomplete subtasks exist. This avoids unnecessary
        queries and scales better for tasks with many subtasks.
        """

        has_incomplete = self.subtasks.filter(completed=False).exists()

        if has_incomplete:
            if self.completed:
                self.completed = False
                self.save(update_fields=["completed"])
        else:
            if not self.completed:
                self.completed = True
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

    def save(self, *args, **kwargs):
        """
        After saving a subtask, ensure the parent task completion state
        stays synchronized.
        """
        with transaction.atomic():
            super().save(*args, **kwargs)
            self.task.update_completion_status()

    def __str__(self):
        return f"{self.name} (Subtask of {self.task.name})"
