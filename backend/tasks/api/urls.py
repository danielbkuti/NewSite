from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, SubTaskViewSet, NotificationViewSet

router = DefaultRouter()
router.register(r"tasks", TaskViewSet, basename="task")
router.register(r"subtasks", SubTaskViewSet, basename="subtask")
router.register(r"notifications", NotificationViewSet, basename="notification")

urlpatterns = router.urls