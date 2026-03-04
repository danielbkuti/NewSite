from rest_framework import serializers
from .models import Task, SubTask
from django.utils import timezone


class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTask
        fields = [
            "id",
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

    def get_queryset(self):
        return (
            Task.objects
            .filter(user=self.request.user)
            .select_related("user")
            .prefetch_related("subtasks")
            .order_by("-dateDeadline")
        )



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
