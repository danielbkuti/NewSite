from django.test import TestCase
from django.contrib.auth import get_user_model
from ..models import Task, SubTask
from django.db import IntegrityError, transaction


class TaskModelTestCase(TestCase):

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="modeluser",
            email="model@test.com",
            password="password123",
            is_active=True
        )

    def test_completing_all_subtasks_does_not_auto_complete_task(self):
        """
        Finishing every subtask does not, by itself, mark the parent
        task completed — that's a separate, explicit action on the task
        itself (see update_completion_status's docstring).
        """
        task = Task.objects.create(
            user=self.user,
            name="Parent Task",
            status="pending"
        )

        sub1 = SubTask.objects.create(task=task, name="Sub1")
        sub2 = SubTask.objects.create(task=task, name="Sub2")

        sub1.completed = True
        sub1.save()

        task.refresh_from_db()
        self.assertFalse(task.completed)

        sub2.completed = True
        sub2.save()

        task.refresh_from_db()
        self.assertFalse(task.completed)

    def test_reopening_a_subtask_reopens_a_completed_task(self):
        """
        A task can't validly stay marked completed once one of its
        subtasks isn't — reopening a subtask reopens the task too.
        """
        task = Task.objects.create(
            user=self.user,
            name="Parent Task",
            status="pending",
            completed=True,
        )
        sub1 = SubTask.objects.create(task=task, name="Sub1", completed=True)

        sub1.completed = False
        sub1.save()

        task.refresh_from_db()
        self.assertFalse(task.completed)

    def test_completing_task_sets_date_completed(self):
        """dateCompleted is set automatically when completed flips to
        True, and cleared again if it's reopened."""
        task = Task.objects.create(user=self.user, name="Parent Task", status="pending")
        self.assertIsNone(task.dateCompleted)

        task.completed = True
        task.save()
        task.refresh_from_db()
        self.assertIsNotNone(task.dateCompleted)

        task.completed = False
        task.save()
        task.refresh_from_db()
        self.assertIsNone(task.dateCompleted)

    def test_auto_reopening_via_subtask_clears_date_completed(self):
        """The update_fields=["completed"] path (subtask-triggered
        auto-reopen) still clears dateCompleted, not just a plain full
        save() — this is the exact path that needs dateCompleted
        appended to update_fields to actually persist the change."""
        task = Task.objects.create(
            user=self.user, name="Parent Task", status="pending", completed=True
        )
        self.assertIsNotNone(task.dateCompleted)

        sub1 = SubTask.objects.create(task=task, name="Sub1", completed=True)
        sub1.completed = False
        sub1.save()  # triggers update_completion_status()'s update_fields save

        task.refresh_from_db()
        self.assertFalse(task.completed)
        self.assertIsNone(task.dateCompleted)

    def test_completing_subtask_sets_date_completed(self):
        """SubTask.dateCompleted follows the same rules as
        Task.dateCompleted — set on completion, cleared on reopening."""
        task = Task.objects.create(user=self.user, name="Parent Task", status="pending")
        sub = SubTask.objects.create(task=task, name="Sub1")
        self.assertIsNone(sub.dateCompleted)

        sub.completed = True
        sub.save()
        sub.refresh_from_db()
        self.assertIsNotNone(sub.dateCompleted)

        sub.completed = False
        sub.save()
        sub.refresh_from_db()
        self.assertIsNone(sub.dateCompleted)

    def test_days_since_created_property(self):
        """Computed property should return integer."""
        task = Task.objects.create(
            user=self.user,
            name="Test",
            status="pending"
        )

        self.assertIsInstance(task.days_since_created, int)

    def test_unique_task_name_per_user(self):
        """
        A user should not be able to create duplicate task names
        if the unique constraint was implemented.
        """

        Task.objects.create(
            user=self.user,
            name="Duplicate Task",
            status="pending"
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Task.objects.create(
                    user=self.user,
                    name="Duplicate Task",
                    status="pending"
                )