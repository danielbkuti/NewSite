from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from ..models import Task, SubTask


class TaskAPITestCase(APITestCase):

    def setUp(self):
        self.User = get_user_model()

        self.user1 = self.User.objects.create_user(
            username="user1",
            email="user1@test.com",
            password="password123",
            is_active=True
        )

        self.user2 = self.User.objects.create_user(
            username="user2",
            email="user2@test.com",
            password="password123",
            is_active=True
        )

        self.url = "/api/tasks/"

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_authentication_required(self):
        """API should reject unauthenticated access."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_isolation(self):
        """Users should only see their own tasks."""
        Task.objects.create(user=self.user1, name="User1 Task", status="pending")
        Task.objects.create(user=self.user2, name="User2 Task", status="pending")

        self.authenticate(self.user1)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "User1 Task")

    def test_create_task_assigns_user(self):
        """Task created via API should automatically assign request.user."""
        self.authenticate(self.user1)

        response = self.client.post(self.url, {
            "name": "New Task",
            "status": "pending",
            "completed": False
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Task.objects.count(), 1)
        self.assertEqual(Task.objects.first().user, self.user1)

    def test_filtering_completed(self):
        """Filtering by completed should work."""
        Task.objects.create(user=self.user1, name="A", completed=True, status="completed")
        Task.objects.create(user=self.user1, name="B", completed=False, status="pending")

        self.authenticate(self.user1)

        response = self.client.get(self.url + "?completed=true")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertTrue(response.data["results"][0]["completed"])

    def test_ordering(self):
        """Ordering by creation date should work."""
        self.authenticate(self.user1)

        Task.objects.create(user=self.user1, name="First", status="pending")
        Task.objects.create(user=self.user1, name="Second", status="pending")

        response = self.client.get(self.url + "?ordering=dateCreated")
        self.assertEqual(response.status_code, 200)


class SubTaskAPITestCase(APITestCase):
    """
    Regression coverage for a real bug: SubTaskSerializer used to omit the
    `task` field entirely, so POSTing a subtask crashed with a raw
    IntegrityError (task_id NOT NULL) instead of a clean response.
    """

    def setUp(self):
        self.User = get_user_model()

        self.user1 = self.User.objects.create_user(
            username="subuser1",
            email="subuser1@test.com",
            password="password123",
            is_active=True,
        )
        self.user2 = self.User.objects.create_user(
            username="subuser2",
            email="subuser2@test.com",
            password="password123",
            is_active=True,
        )

        self.task1 = Task.objects.create(user=self.user1, name="User1 Task", status="pending")
        self.task2 = Task.objects.create(user=self.user2, name="User2 Task", status="pending")

        self.url = "/api/subtasks/"

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_create_subtask_on_own_task(self):
        """Creating a subtask on a task you own should succeed."""
        self.authenticate(self.user1)

        response = self.client.post(self.url, {
            "task": self.task1.id,
            "name": "Subtask A",
            "completed": False,
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SubTask.objects.count(), 1)
        self.assertEqual(SubTask.objects.first().task, self.task1)

    def test_cannot_attach_subtask_to_other_users_task(self):
        """
        Attaching a subtask to someone else's task must be rejected — not
        silently allowed, and not a 500 crash.
        """
        self.authenticate(self.user1)

        response = self.client.post(self.url, {
            "task": self.task2.id,
            "name": "Malicious subtask",
            "completed": False,
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(SubTask.objects.count(), 0)

    def test_completing_subtask_propagates_to_parent(self):
        """Same propagation behavior as test_models, but driven through
        the actual API path instead of the ORM directly."""
        self.authenticate(self.user1)

        create_response = self.client.post(self.url, {
            "task": self.task1.id,
            "name": "Only subtask",
            "completed": False,
        })
        subtask_id = create_response.data["id"]

        self.client.patch(f"{self.url}{subtask_id}/", {"completed": True})

        self.task1.refresh_from_db()
        self.assertTrue(self.task1.completed)