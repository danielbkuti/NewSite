from rest_framework.routers import DefaultRouter
from .api_views import TaskViewSet, SubTaskViewSet

router = DefaultRouter()
router.register(r"tasks", TaskViewSet, basename="task")
router.register(r"subtasks", SubTaskViewSet, basename="subtask")

urlpatterns = router.urls