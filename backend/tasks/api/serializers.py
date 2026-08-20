from rest_framework import serializers
from ..models import Task, SubTask
from django.utils import timezone


class SubTaskSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Restrict which tasks a client can even choose from to the
        # requesting user's own tasks. Without this, `task` would accept
        # any task's primary key — including another user's — reopening
        # exactly the cross-user access bug the /api/tasks/ endpoint
        # doesn't have.
        request = self.context.get("request")
        if request is not None:
            self.fields["task"].queryset = Task.objects.filter(user=request.user)

    class Meta:
        model = SubTask
        fields = [
            "id",
            "task",
            "name",
            "dateCreated",
            "dateDeadline",
            "completed",
        ]
        read_only_fields = ["dateCreated"]


class TaskSerializer(serializers.ModelSerializer):
    subtasks = SubTaskSerializer(many=True, read_only=True)
    days_since_created = serializers.ReadOnlyField()

    def validate_dateDeadline(self, value):
        if value and value < timezone.now():
            raise serializers.ValidationError(
                "Deadline cannot be in the past."
            )
        return value

    def validate(self, data):
        status = data.get("status")
        completed = data.get("completed")

        if status == "completed" and not completed:
            raise serializers.ValidationError(
                "Completed status requires completed=True."
            )

        return data

    class Meta:
        model = Task
        fields = [
            "id",
            "name",
            "description",
            "dateCreated",
            "dateDeadline",
            "completed",
            "status",
            "days_since_created",
            "subtasks",
        ]
        read_only_fields = ["dateCreated"]
