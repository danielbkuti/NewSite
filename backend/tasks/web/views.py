from django.views.decorators.http import require_http_methods
from django.shortcuts import redirect, render, get_object_or_404
from django.contrib.auth.decorators import login_required
import pytz
from ..models import Task, SubTask
from .forms import TaskForm, SubTaskForm

@login_required
def task_create_view(request):
    user_tz = request.COOKIES.get("timezone", "UTC")
    user_tz = pytz.timezone(user_tz)
    form = TaskForm(request.POST or None, user_tz=user_tz)

    if form.is_valid():
        try:
            task = form.save(commit=False)
            task.user = request.user
            task.dateDeadline = form.cleaned_data.get('dateDeadline')  # Already UTC
            task.save()
            action = request.POST.get("action")
            if action == "add_subtasks":
                return redirect("tasks:subtask-create", task_id=task.id)
            else:
                return redirect("tasks:list-tasks")  # or wherever you want
        except Exception as e:
            form.add_error('dateDeadline', f"Something went wrong with the deadline: {e}")

    return render(request, 'tasks/task_create.html', {'form': form})

@login_required
def task_list_view(request):
    queryset = Task.objects.filter(user=request.user, completed=False).order_by('-dateDeadline')
    context = {
        'task_list': queryset
    }
    return render(request, 'tasks/task_list.html', context)

@login_required
@require_http_methods(["GET", "POST"])
def task_detail_view(request, id):
    task = get_object_or_404(Task, user=request.user,  id=id)
    if request.method == "POST":
        if request.POST.get('action') == 'mark_completed':
            task.completed = True
            task.save()
            return redirect('tasks:completed_details', id=task.id)
        if request.POST.get('action') == 'subtask_mark_completed':
            subtask_id = request.POST.get("complete_subtask_id")
            if subtask_id:
                subtask = get_object_or_404(SubTask, id=subtask_id, task=task)
                subtask.completed = True
                subtask.save()
                task.update_completion_status()  # Update task completion if all subtasks are done
    return render(request, 'tasks/task_detail.html', {'task': task})

@login_required
def task_delete_view(request, id):
    obj = get_object_or_404(Task, id=id)
    if request.method == "POST":
        obj.delete()
        return redirect("../../")
    context = {
        'task': obj
    }
    return render(request, "tasks/task_delete.html", context)

@login_required
def task_edit_view(request, id):
    task = get_object_or_404(Task, id=id)
    user_tz = request.COOKIES.get("timezone", "UTC")
    user_tz = pytz.timezone(user_tz)

    form = TaskForm(request.POST or None, instance=task, user_tz=user_tz)

    if request.method == "POST":
        if request.POST.get('action') == 'mark_completed':
            task.completed = True
            task.save()
            return redirect('tasks:task-detail', id=task.id)
        elif form.is_valid():
            task = form.save(commit=False)
            deadline = form.cleaned_data.get('dateDeadline')
            # Deadlines are stored in UTC.
            # We localize naive user input to the user's timezone,
            # then convert to UTC before saving to prevent timezone drift.
            if deadline and deadline.tzinfo is None:
                deadline = user_tz.localize(deadline)
            if deadline:
                task.dateDeadline = deadline.astimezone(pytz.UTC)

            task.save()
            return redirect('tasks:task-detail', id=task.id)

    return render(request, "tasks/task_edit.html", {"form": form, "task": task})

@login_required
def completed_tasks_view(request):
    completed_tasks = Task.objects.filter(
        user=request.user,
        completed=True
    )
    return render(request, 'tasks/completed_tasks.html', {'completed_tasks': completed_tasks})

@login_required
def completed_tasks_detail_view(request, id):
    task = get_object_or_404(Task, id=id, user=request.user)
    return render(request, 'tasks/completed_detail_view.html', {'task': task})

@login_required
def subtask_create_view(request, task_id):
    task = get_object_or_404(Task, id=task_id)
    form = SubTaskForm(request.POST or None)

    if request.method == "POST" and form.is_valid():
        subtask = form.save(commit=False)
        subtask.task = task
        subtask.save()
        # If account clicked "Save and Add Another", redirect to same page
        if request.POST.get('action') == 'add_another':
            return redirect('tasks:subtask-create', task_id=task.id)
        else:
            return redirect('tasks:task-detail', id=task.id)

    subtasks = task.subtasks.all()
    return render(request, 'tasks/subtasks/subtask_create.html', {
        'form': form,
        'task': task,
        'subtasks': subtasks,
    })

@login_required
def subtask_edit_view(request, task_id):
    subtask = get_object_or_404(SubTask, id=task_id)
    form = SubTaskForm(request.POST or None, instance=subtask)

    if request.method == "POST":
        if request.POST.get('action') == 'mark_completed':
            subtask.completed = True
            subtask.save()
            return redirect('tasks:task-detail', id=subtask.task.id)
        elif form.is_valid():
            form.save()
            return redirect('tasks:task-detail', id=subtask.task.id)

    return render(request, "tasks/subtasks/subtask_edit.html", {"form": form, "subtask": subtask})
