from django.test import TestCase
from django.contrib.auth import get_user_model
from tasks.models import Task, SubTask
from django.db import IntegrityError, transaction


class TaskModelTestCase(TestCase):

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="modeluser",
            email="model@test.com",
            password="password123",
            is_active=True
        )

    def test_subtask_completion_propagates(self):
        """
        If all subtasks are completed,
        parent task should be marked completed.
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
        self.assertTrue(task.completed)

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