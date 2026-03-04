from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from tasks.models import Task
from tasks.serializers import TaskSerializer
from datetime import timedelta


class TaskSerializerTestCase(TestCase):

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="serializeruser",
            email="serializer@test.com",
            password="password123",
            is_active=True
        )

    def test_deadline_cannot_be_past(self):
        """
        Serializer should reject deadlines in the past.
        """

        past_date = timezone.now() - timedelta(days=1)

        serializer = TaskSerializer(data={
            "name": "Invalid Task",
            "status": "pending",
            "completed": False,
            "dateDeadline": past_date
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("dateDeadline", serializer.errors)