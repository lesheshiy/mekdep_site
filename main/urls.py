from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    RegisterView, MeView, ClassViewSet, ExamViewSet, AttemptViewSet,
    RetakeRequestViewSet, NotificationViewSet, ChangePasswordView,
    PublicClassesView,
)

router = DefaultRouter()
router.register("classes", ClassViewSet, basename="class")
router.register("exams", ExamViewSet, basename="exam")
router.register("attempts", AttemptViewSet, basename="attempt")
router.register("retake-requests", RetakeRequestViewSet, basename="retake-request")
router.register("notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("public/classes/", PublicClassesView.as_view(), name="public-classes"),
    path("", include(router.urls)),
]
