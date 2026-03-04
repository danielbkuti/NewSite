from django.urls import path
from .web.views import (task_create_view, task_list_view, task_detail_view,
                         task_delete_view, task_edit_view, subtask_create_view,
                         subtask_edit_view, completed_tasks_view, completed_tasks_detail_view)

app_name = 'tasks'
urlpatterns = [
    path('', task_list_view, name='list-tasks'),
    path('completed/', completed_tasks_view, name='completed_tasks'),
    path('completed/<int:id>', completed_tasks_detail_view, name='completed_details'),
    path('create/', task_create_view, name='create-task'),
    path('<int:id>/', task_detail_view, name='task-detail'),
    path('<int:id>/edit', task_edit_view, name='task-edit'),
    path('delete/<int:id>/', task_delete_view, name='task-delete'),
    path('<int:task_id>/add-subtask/', subtask_create_view, name='subtask-create'),
    path('<int:task_id>/edit-subtask/', subtask_edit_view, name='subtask-edit'),
]
