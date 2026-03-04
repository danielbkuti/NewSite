from rest_framework import viewsets, permissions
from .models import Task, SubTask
from .serializers import TaskSerializer, SubTaskSerializer
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend


class TaskViewSet(viewsets.ModelViewSet):
    """
    REST API endpoint for managing user tasks.
    """

    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]

    filterset_fields = ["completed", "status"]
    ordering_fields = ["dateDeadline", "dateCreated"]
    ordering = ["-dateDeadline"]

    def get_queryset(self):
        return Task.objects.filter(
            user=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SubTaskViewSet(viewsets.ModelViewSet):
    """
    REST API endpoint for managing subtasks.
    """

    serializer_class = SubTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SubTask.objects.filter(
            task__user=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save()