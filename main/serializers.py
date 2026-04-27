from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import (
    User, Class, StudentProfile, Exam, Question, Choice, Attempt, Answer,
    RetakeRequest, Notification,
)


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    student_class = serializers.PrimaryKeyRelatedField(
        queryset=Class.objects.all(), write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "role", "student_class")

    def create(self, validated_data):
        student_class = validated_data.pop("student_class", None)
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        if user.is_student:
            StudentProfile.objects.create(user=user, student_class=student_class)
        return user


class MeSerializer(serializers.ModelSerializer):
    student_class = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "student_class")

    def get_student_class(self, obj):
        if obj.is_student and hasattr(obj, "student_profile"):
            sc = obj.student_profile.student_class
            return {"id": sc.id, "name": sc.name} if sc else None
        return None


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("username", "email")


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class StudentMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email")


class ClassSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()
    students = serializers.SerializerMethodField()

    class Meta:
        model = Class
        fields = ("id", "name", "teacher", "student_count", "students")
        read_only_fields = ("teacher",)

    def get_student_count(self, obj):
        return obj.students.count()

    def get_students(self, obj):
        return [
            {"id": p.user.id, "username": p.user.username, "email": p.user.email}
            for p in obj.students.select_related("user").all()
        ]


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ("id", "text", "is_correct")


class ChoicePublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ("id", "text")


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True)

    class Meta:
        model = Question
        fields = ("id", "text", "type", "points", "order", "choices")


class QuestionPublicSerializer(serializers.ModelSerializer):
    choices = ChoicePublicSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ("id", "text", "type", "points", "order", "choices")


class ExamSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True)

    class Meta:
        model = Exam
        fields = (
            "id", "title", "description", "assigned_to",
            "timer_minutes", "retake_limit", "is_published",
            "created_by", "created_at", "questions",
        )
        read_only_fields = ("created_by", "created_at")

    def create(self, validated_data):
        questions_data = validated_data.pop("questions", [])
        exam = Exam.objects.create(**validated_data)
        for idx, q in enumerate(questions_data):
            choices = q.pop("choices", [])
            q.setdefault("order", idx)
            question = Question.objects.create(exam=exam, **q)
            for c in choices:
                Choice.objects.create(question=question, **c)
        return exam

    def update(self, instance, validated_data):
        questions_data = validated_data.pop("questions", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if questions_data is not None:
            instance.questions.all().delete()
            for idx, q in enumerate(questions_data):
                choices = q.pop("choices", [])
                q.setdefault("order", idx)
                question = Question.objects.create(exam=instance, **q)
                for c in choices:
                    Choice.objects.create(question=question, **c)
        return instance


class ExamPublicSerializer(serializers.ModelSerializer):
    questions = QuestionPublicSerializer(many=True, read_only=True)
    retake_limit = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = (
            "id", "title", "description", "timer_minutes",
            "retake_limit", "assigned_to", "is_published", "questions",
        )

    def get_retake_limit(self, obj):
        request = self.context.get("request")
        bonus = 0
        if request and request.user.is_authenticated:
            bonus = RetakeRequest.objects.filter(
                student=request.user,
                exam=obj,
                status=RetakeRequest.Status.APPROVED,
            ).count()
        return obj.retake_limit + bonus


class AnswerInputSerializer(serializers.Serializer):
    question = serializers.IntegerField()
    selected_choice = serializers.IntegerField(required=False, allow_null=True)
    text_answer = serializers.CharField(required=False, allow_blank=True)


class AttemptSubmitSerializer(serializers.Serializer):
    exam = serializers.IntegerField()
    started_at = serializers.DateTimeField()
    answers = AnswerInputSerializer(many=True)
    flagged_questions = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )


class AnswerDetailSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source="question.text", read_only=True)
    question_type = serializers.CharField(source="question.type", read_only=True)
    question_points = serializers.IntegerField(source="question.points", read_only=True)
    selected_choice_text = serializers.CharField(
        source="selected_choice.text", read_only=True, default=None
    )
    correct_choice_id = serializers.SerializerMethodField()
    correct_choice_text = serializers.SerializerMethodField()

    class Meta:
        model = Answer
        fields = (
            "id", "question", "question_text", "question_type", "question_points",
            "selected_choice", "selected_choice_text",
            "correct_choice_id", "correct_choice_text",
            "text_answer", "awarded_points", "feedback",
        )

    def get_correct_choice_id(self, obj):
        c = obj.question.choices.filter(is_correct=True).first()
        return c.id if c else None

    def get_correct_choice_text(self, obj):
        c = obj.question.choices.filter(is_correct=True).first()
        return c.text if c else None


class AttemptSerializer(serializers.ModelSerializer):
    student_username = serializers.CharField(source="student.username", read_only=True)
    exam_title = serializers.CharField(source="exam.title", read_only=True)

    class Meta:
        model = Attempt
        fields = (
            "id", "student", "student_username", "exam", "exam_title",
            "started_at", "completed_at", "score", "flagged_late", "flagged_questions",
        )


class AttemptDetailSerializer(serializers.ModelSerializer):
    student_username = serializers.CharField(source="student.username", read_only=True)
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    answers = AnswerDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Attempt
        fields = (
            "id", "student", "student_username", "exam", "exam_title",
            "started_at", "completed_at", "score", "flagged_late", "flagged_questions",
            "answers",
        )


class GradeAnswerSerializer(serializers.Serializer):
    awarded_points = serializers.FloatField()
    feedback = serializers.CharField(required=False, allow_blank=True)


class RetakeRequestSerializer(serializers.ModelSerializer):
    student_username = serializers.CharField(source="student.username", read_only=True)
    exam_title = serializers.CharField(source="exam.title", read_only=True)

    class Meta:
        model = RetakeRequest
        fields = (
            "id", "student", "student_username", "exam", "exam_title",
            "reason", "decline_reason", "status", "created_at", "reviewed_at",
        )
        read_only_fields = ("student", "status", "created_at", "reviewed_at", "decline_reason")


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "kind", "title", "body", "link", "is_read", "created_at")
        read_only_fields = ("kind", "title", "body", "link", "created_at")


class ClassEnrollSerializer(serializers.Serializer):
    username = serializers.CharField()
