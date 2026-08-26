from django.contrib import admin
from .models import Task, SubTask, TaskActivity

# Register your models here.
admin.site.register(Task)
admin.site.register(SubTask)
admin.site.register(TaskActivity)
