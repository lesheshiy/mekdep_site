import csv
from datetime import timedelta
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, status, generics, mixins
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import (
    Class, Exam, Question, Choice, Attempt, Answer, User, RetakeRequest,
    StudentProfile, Notification,
)
from .permissions import IsTeacher, IsTeacherOrReadOnly
from .serializers import (
    UserSerializer, MeSerializer, ClassSerializer,
    ExamSerializer, ExamPublicSerializer,
    AttemptSerializer, AttemptDetailSerializer, AttemptSubmitSerializer,
    RetakeRequestSerializer, NotificationSerializer,
    ProfileUpdateSerializer, PasswordChangeSerializer,
    GradeAnswerSerializer, ClassEnrollSerializer,
)


def notify(user, kind, title, body="", link=""):
    if not user:
        return
    Notification.objects.create(
        user=user, kind=kind, title=title, body=body, link=link
    )


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class PublicClassesView(generics.ListAPIView):
    """Public endpoint for the registration form to list classes."""
    permission_classes = [AllowAny]
    serializer_class = ClassSerializer

    def get_queryset(self):
        return Class.objects.all()


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ProfileUpdateSerializer
        return MeSerializer


class ChangePasswordView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PasswordChangeSerializer

    def post(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(ser.validated_data["old_password"]):
            return Response(
                {"detail": "Old password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(ser.validated_data["new_password"])
        user.save()
        return Response({"detail": "Password updated."})


class ClassViewSet(viewsets.ModelViewSet):
    serializer_class = ClassSerializer
    permission_classes = [IsTeacherOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_teacher:
            return Class.objects.filter(teacher=user)
        if user.is_student and hasattr(user, "student_profile"):
            sc = user.student_profile.student_class
            return Class.objects.filter(id=sc.id) if sc else Class.objects.none()
        return Class.objects.none()

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsTeacher])
    def enroll(self, request, pk=None):
        cls = self.get_object()
        ser = ClassEnrollSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        username = ser.validated_data["username"]
        try:
            student = User.objects.get(username=username, role=User.Role.STUDENT)
        except User.DoesNotExist:
            return Response(
                {"detail": "No student with that username."},
                status=status.HTTP_404_NOT_FOUND,
            )
        profile, _ = StudentProfile.objects.get_or_create(user=student)
        profile.student_class = cls
        profile.save()
        return Response(ClassSerializer(cls).data)

    @action(detail=True, methods=["post"], permission_classes=[IsTeacher],
            url_path="remove-student/(?P<student_id>[^/.]+)")
    def remove_student(self, request, pk=None, student_id=None):
        cls = self.get_object()
        try:
            profile = StudentProfile.objects.get(user_id=student_id, student_class=cls)
        except StudentProfile.DoesNotExist:
            return Response(
                {"detail": "Student not enrolled in this class."},
                status=status.HTTP_404_NOT_FOUND,
            )
        profile.student_class = None
        profile.save()
        return Response(ClassSerializer(cls).data)


class ExamViewSet(viewsets.ModelViewSet):
    permission_classes = [IsTeacherOrReadOnly]

    def get_queryset(self):
        qs = Exam.objects.prefetch_related("questions__choices").filter(is_deleted=False)
        user = self.request.user
        if user.is_teacher:
            return qs.filter(created_by=user)
        if user.is_student and hasattr(user, "student_profile"):
            sc = user.student_profile.student_class
            return qs.filter(assigned_to=sc, is_published=True) if sc else qs.none()
        return qs.none()

    def get_serializer_class(self):
        if self.request.user.is_authenticated and self.request.user.is_student:
            return ExamPublicSerializer
        return ExamSerializer

    def perform_create(self, serializer):
        exam = serializer.save(created_by=self.request.user)
        if exam.is_published:
            for profile in exam.assigned_to.students.select_related("user"):
                notify(
                    profile.user, Notification.Kind.EXAM_ASSIGNED,
                    f"New exam: {exam.title}",
                    f"You have been assigned a new exam by {self.request.user.username}.",
                    f"/exam/{exam.id}",
                )

    def destroy(self, request, *args, **kwargs):
        exam = self.get_object()
        exam.is_deleted = True
        exam.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], permission_classes=[IsTeacher])
    def duplicate(self, request, pk=None):
        original = self.get_object()
        new_exam = Exam.objects.create(
            title=f"{original.title} (Copy)",
            description=original.description,
            created_by=request.user,
            assigned_to=original.assigned_to,
            timer_minutes=original.timer_minutes,
            retake_limit=original.retake_limit,
            is_published=False,
        )
        for q in original.questions.all():
            new_q = Question.objects.create(
                exam=new_exam, text=q.text, type=q.type,
                points=q.points, order=q.order,
            )
            for c in q.choices.all():
                Choice.objects.create(
                    question=new_q, text=c.text, is_correct=c.is_correct
                )
        return Response(ExamSerializer(new_exam).data)

    @action(detail=True, methods=["post"], permission_classes=[IsTeacher])
    def toggle_publish(self, request, pk=None):
        exam = self.get_object()
        exam.is_published = not exam.is_published
        exam.save()
        if exam.is_published:
            for profile in exam.assigned_to.students.select_related("user"):
                notify(
                    profile.user, Notification.Kind.EXAM_ASSIGNED,
                    f"New exam: {exam.title}",
                    "An exam has been published for your class.",
                    f"/exam/{exam.id}",
                )
        return Response(ExamSerializer(exam).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def submit(self, request, pk=None):
        exam = self.get_object()
        user = request.user
        if not user.is_student:
            return Response(
                {"detail": "Only students can submit attempts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AttemptSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        started_at = data["started_at"]
        now = timezone.now()
        deadline = started_at + timedelta(minutes=exam.timer_minutes)
        flagged_late = now > deadline + timedelta(seconds=5)

        completed_count = Attempt.objects.filter(
            student=user, exam=exam, completed_at__isnull=False
        ).count()
        approved_bonus = RetakeRequest.objects.filter(
            student=user, exam=exam, status=RetakeRequest.Status.APPROVED
        ).count()
        if completed_count >= exam.retake_limit + approved_bonus:
            return Response(
                {"detail": "Retake limit reached for this exam."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attempt = Attempt.objects.create(
            student=user,
            exam=exam,
            started_at=started_at,
            completed_at=now,
            flagged_late=flagged_late,
            flagged_questions=data.get("flagged_questions", []),
        )

        questions = {q.id: q for q in exam.questions.prefetch_related("choices")}
        total_points = 0
        earned_points = 0
        has_text = False

        for ans in data["answers"]:
            q = questions.get(ans["question"])
            if not q:
                continue
            total_points += q.points
            selected_choice = None
            awarded = None
            if q.type == Question.Type.MCQ:
                cid = ans.get("selected_choice")
                if cid:
                    selected_choice = next(
                        (c for c in q.choices.all() if c.id == cid), None
                    )
                awarded = q.points if (selected_choice and selected_choice.is_correct) else 0
                earned_points += awarded
            else:
                has_text = True
            Answer.objects.create(
                attempt=attempt,
                question=q,
                selected_choice=selected_choice,
                text_answer=ans.get("text_answer", ""),
                awarded_points=awarded,
            )

        if total_points > 0:
            mcq_total = sum(
                q.points for q in questions.values() if q.type == Question.Type.MCQ
            )
            if mcq_total > 0:
                attempt.score = (earned_points / mcq_total * 100)
            else:
                attempt.score = None
        attempt.save()

        notify(
            exam.created_by, Notification.Kind.SUBMISSION_RECEIVED,
            f"{user.username} submitted {exam.title}",
            f"Score: {round(attempt.score)}%" if attempt.score is not None else "Awaiting grading.",
            f"/teacher/results",
        )

        return Response(AttemptDetailSerializer(attempt).data)


class AttemptViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return AttemptDetailSerializer
        return AttemptSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_teacher:
            return Attempt.objects.select_related("student", "exam").filter(
                exam__created_by=user
            )
        return Attempt.objects.select_related("student", "exam").filter(student=user)

    @action(detail=True, methods=["post"], permission_classes=[IsTeacher],
            url_path="grade-answer/(?P<answer_id>[^/.]+)")
    def grade_answer(self, request, pk=None, answer_id=None):
        attempt = self.get_object()
        if attempt.exam.created_by_id != request.user.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        try:
            answer = attempt.answers.select_related("question").get(id=answer_id)
        except Answer.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        ser = GradeAnswerSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        answer.awarded_points = ser.validated_data["awarded_points"]
        answer.feedback = ser.validated_data.get("feedback", "")
        answer.save()

        # Recalculate score across all answers
        total_points = sum(a.question.points for a in attempt.answers.all())
        earned = sum((a.awarded_points or 0) for a in attempt.answers.all())
        attempt.score = (earned / total_points * 100) if total_points else None
        attempt.save()

        notify(
            attempt.student, Notification.Kind.GRADED,
            f"Your {attempt.exam.title} attempt was graded",
            f"New score: {round(attempt.score)}%" if attempt.score is not None else "",
            f"/student/results",
        )
        return Response(AttemptDetailSerializer(attempt).data)

    @action(detail=False, methods=["get"], permission_classes=[IsTeacher])
    def export_csv(self, request):
        qs = self.get_queryset().filter(completed_at__isnull=False)
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="results.csv"'
        writer = csv.writer(response)
        writer.writerow(["Exam", "Student", "Score", "Completed", "Late"])
        for a in qs:
            writer.writerow([
                a.exam.title,
                a.student.username,
                round(a.score) if a.score is not None else "",
                a.completed_at.isoformat() if a.completed_at else "",
                "yes" if a.flagged_late else "no",
            ])
        return response

    @action(detail=False, methods=["get"], permission_classes=[IsTeacher],
            url_path="exam-stats/(?P<exam_id>[^/.]+)")
    def exam_stats(self, request, exam_id=None):
        try:
            exam = Exam.objects.get(id=exam_id, created_by=request.user)
        except Exam.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        attempts = Attempt.objects.filter(
            exam=exam, completed_at__isnull=False, score__isnull=False
        )
        scores = list(attempts.values_list("score", flat=True))
        avg = sum(scores) / len(scores) if scores else None
        # Score buckets 0-20,20-40,...
        buckets = [0] * 5
        for s in scores:
            idx = min(int(s // 20), 4)
            buckets[idx] += 1
        # Hardest question — lowest correct rate
        question_stats = []
        for q in exam.questions.all():
            answers = Answer.objects.filter(attempt__in=attempts, question=q)
            total = answers.count()
            if total == 0:
                continue
            correct = sum(
                1 for a in answers
                if a.awarded_points is not None and a.awarded_points >= q.points
            )
            question_stats.append({
                "id": q.id,
                "text": q.text[:80],
                "correct_rate": correct / total,
                "total": total,
            })
        question_stats.sort(key=lambda x: x["correct_rate"])
        return Response({
            "average": avg,
            "submissions": len(scores),
            "buckets": buckets,
            "questions": question_stats,
        })


class RetakeRequestViewSet(viewsets.ModelViewSet):
    serializer_class = RetakeRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_teacher:
            return RetakeRequest.objects.select_related("student", "exam").filter(
                exam__created_by=user
            )
        return RetakeRequest.objects.select_related("student", "exam").filter(
            student=user
        )

    def perform_create(self, serializer):
        retake = serializer.save(student=self.request.user)
        notify(
            retake.exam.created_by, Notification.Kind.RETAKE_REQUESTED,
            f"{self.request.user.username} requested a retake",
            f"Exam: {retake.exam.title}. Reason: {retake.reason or '—'}",
            "/teacher/approvals",
        )

    def destroy(self, request, *args, **kwargs):
        # Students can cancel their own pending requests.
        obj = self.get_object()
        if request.user.is_student:
            if obj.student_id != request.user.id:
                return Response(status=status.HTTP_403_FORBIDDEN)
            if obj.status != RetakeRequest.Status.PENDING:
                return Response(
                    {"detail": "Only pending requests can be cancelled."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], permission_classes=[IsTeacher])
    def approve(self, request, pk=None):
        retake_req = self.get_object()
        if retake_req.status != RetakeRequest.Status.PENDING:
            return Response(
                {"detail": "This request has already been reviewed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        retake_req.status = RetakeRequest.Status.APPROVED
        retake_req.reviewed_at = timezone.now()
        retake_req.save()
        notify(
            retake_req.student, Notification.Kind.RETAKE_APPROVED,
            f"Retake approved: {retake_req.exam.title}",
            "Your retake request was approved.",
            "/student/approvals",
        )
        return Response(RetakeRequestSerializer(retake_req).data)

    @action(detail=True, methods=["post"], permission_classes=[IsTeacher])
    def decline(self, request, pk=None):
        retake_req = self.get_object()
        if retake_req.status != RetakeRequest.Status.PENDING:
            return Response(
                {"detail": "This request has already been reviewed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        retake_req.status = RetakeRequest.Status.DECLINED
        retake_req.decline_reason = request.data.get("decline_reason", "")
        retake_req.reviewed_at = timezone.now()
        retake_req.save()
        notify(
            retake_req.student, Notification.Kind.RETAKE_DECLINED,
            f"Retake declined: {retake_req.exam.title}",
            retake_req.decline_reason or "Your retake request was declined.",
            "/student/approvals",
        )
        return Response(RetakeRequestSerializer(retake_req).data)


class NotificationViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        n = self.get_object()
        n.is_read = True
        n.save()
        return Response(NotificationSerializer(n).data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({"detail": "All marked read."})

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        return Response({"count": self.get_queryset().filter(is_read=False).count()})
