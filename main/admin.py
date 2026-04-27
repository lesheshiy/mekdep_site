from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    User, Class, StudentProfile, Exam, Question, Choice, Attempt, Answer,
    RetakeRequest,
)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Role", {"fields": ("role",)}),)
    list_display = ("username", "email", "role", "is_staff")


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 2


class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    inlines = [ChoiceInline]


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ("title", "created_by", "assigned_to", "timer_minutes")
    inlines = [QuestionInline]


admin.site.register(Class)
admin.site.register(StudentProfile)
admin.site.register(Attempt)
admin.site.register(Answer)
admin.site.register(RetakeRequest)
