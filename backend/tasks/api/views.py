from rest_framework import viewsets, permissions
from ..models import Task, SubTask, TaskActivity
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
        return (
            Task.objects
            .filter(user=self.request.user)
            .select_related("user")
            .prefetch_related("subtasks", "activity_log")
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

    def perform_destroy(self, instance):
        # Deletion doesn't go through SubTask.save(), so it's the one
        # write path _log_subtask_changes never sees — logged here
        # instead, against the parent task, before the row (and its
        # name) actually goes away.
        task = instance.task
        name = instance.name
        instance.delete()
        TaskActivity.objects.create(task=task, message=f'Subtask "{name}" removed')