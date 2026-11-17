using CorseWeb.Server.Helpers;
using CorseWeb.Server.Models;

var testCount = 0;

void Assert(bool condition, string message)
{
    testCount++;
    if (!condition)
        throw new InvalidOperationException($"Test {testCount} failed: {message}");
}

var course = new Course
{
    Id = "course-1",
    ModulesJson = """
    [
      {
        "id": "module-1",
        "lessons": [
          { "id": "lesson-published-1", "isPublished": true },
          { "id": "lesson-unpublished", "isPublished": false }
        ]
      },
      {
        "id": "module-2",
        "lessons": [
          { "id": "lesson-published-2", "isPublished": true }
        ]
      }
    ]
    """
};

var enrollment = new CourseEnrollment
{
    Id = "enrollment-1",
    CourseId = course.Id,
    UserId = "student-1",
    EnrolledAt = DateTime.UtcNow.AddDays(-1),
    LastAccessedAt = DateTime.UtcNow,
    CurrentLessonId = "lesson-unpublished",
    OverallPercent = 100,
    CompletedAt = DateTime.UtcNow,
    ModulesProgressJson = """
    [
      { "moduleId": "module-1", "percent": 100,
        "lessons": [{ "lessonId": "lesson-published-1", "status": "concluido" }] }
    ]
    """
};

var emptyProjection = EnrollmentProgressProjector.ToDto(enrollment, course, []);
Assert(emptyProjection.OverallPercent == 0, "Legacy client-supplied 100% must not be trusted.");
Assert(emptyProjection.CompletedAt == null, "Legacy client-supplied completion date must not be trusted.");
Assert(emptyProjection.CurrentLessonId == null, "Unpublished lessons must not be accepted as current progress.");
Assert(emptyProjection.ModulesProgress.GetArrayLength() == 2, "Only modules with published lessons should be projected.");
Assert(
    emptyProjection.ModulesProgress[0].GetProperty("lessons")[0].GetProperty("status").GetString() == "nao-iniciado",
    "Legacy client-supplied lesson completion must not be trusted.");

Assert(
    EnrollmentProgressProjector.IsPublishedLesson(course.ModulesJson, "lesson-published-1"),
    "A published lesson must be eligible for completion.");
Assert(
    !EnrollmentProgressProjector.IsPublishedLesson(course.ModulesJson, "lesson-unpublished"),
    "An unpublished lesson must not be eligible for completion.");
Assert(
    !EnrollmentProgressProjector.IsPublishedLesson(course.ModulesJson, "lesson-does-not-exist"),
    "An unknown lesson must not be eligible for completion.");

var completion = new CourseLessonCompletion
{
    Id = "completion-1",
    EnrollmentId = enrollment.Id,
    LessonId = "lesson-published-1",
    CompletedAt = DateTime.UtcNow.AddMinutes(-5)
};
var partialProjection = EnrollmentProgressProjector.ToDto(enrollment, course, [completion]);
Assert(partialProjection.OverallPercent == 50, "Course progress must be derived from server completion records.");
Assert(partialProjection.CompletedAt == null, "A partial course must not be marked completed.");
Assert(
    partialProjection.ModulesProgress[0].GetProperty("percent").GetInt32() == 100,
    "Module percentage must be calculated from its published lessons.");
Assert(
    partialProjection.ModulesProgress[1].GetProperty("percent").GetInt32() == 0,
    "Uncompleted modules must remain at zero percent.");

var secondCompletion = new CourseLessonCompletion
{
    Id = "completion-2",
    EnrollmentId = enrollment.Id,
    LessonId = "lesson-published-2",
    CompletedAt = DateTime.UtcNow
};
var completedProjection = EnrollmentProgressProjector.ToDto(enrollment, course, [completion, secondCompletion]);
Assert(completedProjection.OverallPercent == 100, "All published lessons completed must produce 100%.");
Assert(completedProjection.CompletedAt != null, "CompletedAt must be derived from server completion timestamps.");

var foreignEnrollmentCompletion = new CourseLessonCompletion
{
    Id = "completion-3",
    EnrollmentId = "another-enrollment",
    LessonId = "lesson-published-1",
    CompletedAt = DateTime.UtcNow
};
var foreignProjection = EnrollmentProgressProjector.ToDto(enrollment, course, [foreignEnrollmentCompletion]);
Assert(foreignProjection.OverallPercent == 0, "Completion records from another enrollment must be ignored.");

Console.WriteLine($"Passed {testCount} server progress contract assertions.");