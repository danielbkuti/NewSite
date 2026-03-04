import pytz
from django import forms
from django.forms import DateTimeInput
from django.utils.timezone import now, make_naive
from ..models import Task, SubTask

class TaskForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        self.user_tz = kwargs.pop('user_tz', pytz.UTC)  # Default to UTC if not passed
        super(TaskForm, self).__init__(*args, **kwargs)
        self.fields['dateDeadline'].input_formats = ['%Y-%m-%dT%H:%M']

    def clean_dateDeadline(self):
        deadline = self.cleaned_data.get('dateDeadline')
        if deadline:
            deadline = deadline.replace(tzinfo=self.user_tz)
            deadline = make_naive(deadline, self.user_tz)
            # Localize to account timezone first
            if deadline.tzinfo is None:
                deadline = self.user_tz.localize(deadline)

            # Convert to UTC
            deadline_utc = deadline.astimezone(pytz.UTC)

            if deadline_utc <= now():
                raise forms.ValidationError("Deadline must be a future date and time.")

            # Store the converted UTC datetime back into cleaned_data
            return deadline_utc
        return deadline

    class Meta:
        model = Task
        fields = ["name", "description", "dateDeadline", "completed"]
        widgets = {
            'dateDeadline': DateTimeInput(attrs={'type': 'datetime-local'}, format='%Y-%m-%dT%H:%M'),
        }


class SubTaskForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        self.user_tz = kwargs.pop('user_tz', pytz.UTC)  # Default to UTC if not passed
        super(SubTaskForm, self).__init__(*args, **kwargs)
        self.fields['dateDeadline'].input_formats = ['%Y-%m-%dT%H:%M']

    def clean_dateDeadline(self):
        deadline = self.cleaned_data.get('dateDeadline')
        if deadline:
            deadline = deadline.replace(tzinfo=self.user_tz)
            deadline = make_naive(deadline, self.user_tz)
            # Localize to account timezone first
            if deadline.tzinfo is None:
                deadline = self.user_tz.localize(deadline)

            # Convert to UTC
            deadline_utc = deadline.astimezone(pytz.UTC)

            if deadline_utc <= now():
                raise forms.ValidationError("Deadline must be a future date and time.")

            # Store the converted UTC datetime back into cleaned_data
            return deadline_utc
        return deadline

    class Meta:
        model = SubTask
        fields = ["name", "dateDeadline", "completed"]
        widgets = {
            'dateDeadline': DateTimeInput(attrs={'type': 'datetime-local'}, format='%Y-%m-%dT%H:%M'),
        }
