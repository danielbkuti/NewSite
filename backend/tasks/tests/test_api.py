from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from .tasks.models import Task


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