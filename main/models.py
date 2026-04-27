from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = "STUDENT", "Student"
        TEACHER = "TEACHER", "Teacher"

    role = models.CharField(max_length=16, choices=Role.choices, default=Role.STUDENT)

    @property
    def is_teacher(self):
        return self.role == self.Role.TEACHER

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT


class Class(models.Model):
    name = models.CharField(max_length=120)
    teacher = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="classes",
        limit_choices_to={"role": User.Role.TEACHER},
    )

    class Meta:
        verbose_name_plural = "Classes"

    def __str__(self):
        return self.name


class StudentProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="student_profile",
        limit_choices_to={"role": User.Role.STUDENT},
    )
    student_class = models.ForeignKey(
        Class, on_delete=models.SET_NULL, null=True, related_name="students"
    )

    def __str__(self):
        return f"{self.user.username} ({self.student_class})"


class Exam(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_exams",
        limit_choices_to={"role": User.Role.TEACHER},
    )
    assigned_to = models.ForeignKey(
        Class, on_delete=models.CASCADE, related_name="exams"
    )
    timer_minutes = models.PositiveIntegerField(default=30)
    retake_limit = models.PositiveIntegerField(
        default=1, help_text="Maximum number of attempts a student is allowed."
    )
    is_published = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.title


class Question(models.Model):
    class Type(models.TextChoices):
        MCQ = "MCQ", "Multiple Choice"
        TEXT = "TEXT", "Text"

    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()
    type = models.CharField(max_length=8, choices=Type.choices, default=Type.MCQ)
    points = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("order", "id")

    def __str__(self):
        return self.text[:60]


class Choice(models.Model):
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="choices"
    )
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return self.text


class Attempt(models.Model):
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="attempts",
        limit_choices_to={"role": User.Role.STUDENT},
    )
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="attempts")
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.FloatField(null=True, blank=True)
    flagged_late = models.BooleanField(default=False)
    flagged_questions = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ("-completed_at", "-started_at")

    def __str__(self):
        return f"{self.student.username} - {self.exam.title}"


class Answer(models.Model):
    attempt = models.ForeignKey(
        Attempt, on_delete=models.CASCADE, related_name="answers"
    )
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_choice = models.ForeignKey(
        Choice, on_delete=models.SET_NULL, null=True, blank=True
    )
    text_answer = models.TextField(blank=True)
    awarded_points = models.FloatField(null=True, blank=True)
    feedback = models.TextField(blank=True)


class RetakeRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        DECLINED = "DECLINED", "Declined"

    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="retake_requests",
        limit_choices_to={"role": User.Role.STUDENT},
    )
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="retake_requests")
    reason = models.TextField(blank=True)
    decline_reason = models.TextField(blank=True)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(default=timezone.now)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.student.username} - {self.exam.title} ({self.status})"


class Notification(models.Model):
    class Kind(models.TextChoices):
        EXAM_ASSIGNED = "EXAM_ASSIGNED", "Exam assigned"
        RETAKE_APPROVED = "RETAKE_APPROVED", "Retake approved"
        RETAKE_DECLINED = "RETAKE_DECLINED", "Retake declined"
        RETAKE_REQUESTED = "RETAKE_REQUESTED", "Retake requested"
        SUBMISSION_RECEIVED = "SUBMISSION_RECEIVED", "Submission received"
        GRADED = "GRADED", "Manually graded"

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    kind = models.CharField(max_length=32, choices=Kind.choices)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    link = models.CharField(max_length=300, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.user.username}: {self.title}"
