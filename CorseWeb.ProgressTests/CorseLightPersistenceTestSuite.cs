using CorseWeb.Server.CorseLight;
using CorseWeb.Server.Data;
using CorseWeb.Server.Helpers;
using CorseWeb.Server.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

public static class CorseLightPersistenceTestSuite
{
    public static async Task RunAsync(Action<bool, string> assert)
    {
        await using var connection = new SqliteConnection("Data Source=:memory:;Foreign Keys=True");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        await using var db = new AppDbContext(options);
        await db.Database.MigrateAsync();

        const string modules = """
        [
          {
            "id": "module",
            "lessons": [
              {
                "id": "lesson-one",
                "isPublished": true,
                "nodes": [
                  { "id": "heading-one", "type": "heading", "props": { "content": "Initial" } }
                ]
              },
              {
                "id": "lesson-two",
                "isPublished": true,
                "nodes": [
                  { "id": "heading-one", "type": "heading", "props": { "content": "Initial" } }
                ]
              }
            ]
          }
        ]
        """;

        const string scripts = """
        [
          {
            "id": "progress-script",
            "name": "Estado de progresso",
            "language": "CL",
            "languageVersion": "0.1",
            "enabled": true,
            "source": "on lesson.start { if (state.get(\"visited\") == null) { state.set(\"visited\", true); } content.setText(\"heading-one\", \"content\", \"Visitado\"); } on activity.submit { if (activity.isCorrect()) { state.set(\"submitted-answer\", activity.getAnswer()); activity.feedback(\"Resposta aceita.\", \"success\"); } else { activity.feedback(\"Revise sua resposta.\", \"warning\"); } }"
          }
        ]
        """;

        var course = new Course
        {
            Id = "cl-course",
            Slug = "cl-course",
            Title = "Curso CorseLight",
            Description = "Curso de teste de persistência CorseLight.",
            Category = "Teste",
            Status = "publicado",
            Language = "pt-BR",
            ModulesJson = modules,
            ScriptsJson = scripts,
            AuthorId = "author",
            AuthorName = "Author",
            CreatedBy = "author",
            UpdatedBy = "author"
        };
        var firstEnrollment = new CourseEnrollment
        {
            Id = "cl-enrollment-one",
            UserId = "student-one",
            CourseId = course.Id
        };
        var secondEnrollment = new CourseEnrollment
        {
            Id = "cl-enrollment-two",
            UserId = "student-two",
            CourseId = course.Id
        };
        db.Courses.Add(course);
        db.Enrollments.AddRange(firstEnrollment, secondEnrollment);
        await db.SaveChangesAsync();

        assert(CorseLightValidator.ValidateScriptsJson(course.ScriptsJson, course.ModulesJson).Count == 0,
            "Persisted CorseLight test scripts must satisfy the publication contract.");

        var startEffects = await CorseLightEventRunner.ExecuteAsync(
            db, course, firstEnrollment, "lesson-one", "lesson.start", "lesson-one");
        await db.SaveChangesAsync();
        assert(startEffects.NodeText.Count == 1 && startEffects.NodeText[0].Value == "Visitado",
            "lesson.start must persist and return a declarative node-text effect.");
        assert(await db.CourseScriptStates.AnyAsync(state =>
                state.EnrollmentId == firstEnrollment.Id
                && state.ScriptId == "progress-script"
                && state.Key == "visited"),
            "Script state must persist under the enrollment and stable script id.");

        var replayedStart = await CorseLightEventRunner.ExecuteAsync(
            db, course, firstEnrollment, "lesson-one", "lesson.start", "lesson-one");
        await db.SaveChangesAsync();
        assert(replayedStart.NodeText.Count == 1
                && await db.CourseScriptExecutions.CountAsync(execution =>
                    execution.EnrollmentId == firstEnrollment.Id
                    && execution.LessonId == "lesson-one"
                    && execution.EventName == "lesson.start") == 2,
            "A repeated lesson.start must replay cached effects without creating new script executions.");

        var secondLessonEffects = await CorseLightEventRunner.ExecuteAsync(
            db, course, firstEnrollment, "lesson-two", "lesson.start", "lesson-two");
        await db.SaveChangesAsync();
        assert(secondLessonEffects.NodeText.Count == 1
                && await db.CourseScriptStates.CountAsync(state =>
                    state.EnrollmentId == firstEnrollment.Id
                    && state.ScriptId == "progress-script"
                    && state.Key == "visited") == 1,
            "One script's state must persist across lessons within the same enrollment.");

        var secondStudentEffects = await CorseLightEventRunner.ExecuteAsync(
            db, course, secondEnrollment, "lesson-one", "lesson.start", "lesson-one");
        await db.SaveChangesAsync();
        assert(secondStudentEffects.NodeText.Count == 1
                && await db.CourseScriptStates.CountAsync(state =>
                    state.ScriptId == "progress-script" && state.Key == "visited") == 2,
            "Different enrollments must have isolated copies of the same script state.");

        var activityEffects = await CorseLightEventRunner.ExecuteAsync(
            db, course, firstEnrollment, "lesson-one", "activity.submit", "quiz-one",
            activityId: "quiz-one", activityAnswer: 2d, activityIsCorrect: true);
        await db.SaveChangesAsync();
        assert(activityEffects.Feedback.Count == 1
                && activityEffects.Feedback[0].Tone == "success",
            "activity.submit must receive server-evaluated results and persist feedback effects.");
        assert(await db.CourseScriptStates.AnyAsync(state =>
                state.EnrollmentId == firstEnrollment.Id
                && state.ScriptId == "progress-script"
                && state.Key == "submitted-answer"
                && state.ValueJson == "2"),
            "activity.getAnswer must expose only the accepted answer to the event runtime.");

        const string failureModules = """
        [
          {
            "id": "module",
            "lessons": [
              {
                "id": "lesson-failure",
                "isPublished": true,
                "nodes": [
                  { "id": "heading-failure", "type": "heading", "props": { "content": "Initial" } }
                ]
              }
            ]
          }
        ]
        """;
        const string failureScripts = """
        [
          {
            "id": "failing-script",
            "name": "Rollback",
            "language": "CL",
            "languageVersion": "0.1",
            "enabled": true,
            "source": "on lesson.start { state.set(\"partial\", true); if (state.get(\"type-error\")) { content.hide(\"heading-failure\"); } }"
          }
        ]
        """;
        var failureCourse = new Course
        {
            Id = "cl-failure-course",
            Slug = "cl-failure-course",
            Title = "Falha",
            Description = "Curso de teste de rollback CorseLight.",
            Category = "Teste",
            Status = "publicado",
            Language = "pt-BR",
            ModulesJson = failureModules,
            ScriptsJson = failureScripts,
            AuthorId = "author",
            AuthorName = "Author",
            CreatedBy = "author",
            UpdatedBy = "author"
        };
        var failureEnrollment = new CourseEnrollment
        {
            Id = "cl-failure-enrollment",
            UserId = "student-failure",
            CourseId = failureCourse.Id
        };
        db.Courses.Add(failureCourse);
        db.Enrollments.Add(failureEnrollment);
        db.CourseScriptStates.Add(new CourseScriptState
        {
            EnrollmentId = failureEnrollment.Id,
            ScriptId = "failing-script",
            Key = "type-error",
            ValueJson = "\"not-a-boolean\""
        });
        await db.SaveChangesAsync();

        var failedResult = await CorseLightEventRunner.ExecuteAsync(
            db, failureCourse, failureEnrollment, "lesson-failure", "lesson.start", "lesson-failure");
        await db.SaveChangesAsync();
        assert(failedResult == ClEffects.Empty,
            "A script runtime error must discard every partial effect.");
        assert(!await db.CourseScriptStates.AnyAsync(state =>
                state.EnrollmentId == failureEnrollment.Id && state.Key == "partial"),
            "A failed script must roll back state mutations.");
        assert(await db.CourseScriptExecutions.AnyAsync(execution =>
                execution.EnrollmentId == failureEnrollment.Id
                && execution.ScriptId == "failing-script"
                && execution.Failed
                && execution.DiagnosticCode == "CL_TYPE_MISMATCH"),
            "Runtime diagnostics must be stored internally without exposing source or exception details.");

        db.Enrollments.Remove(firstEnrollment);
        await db.SaveChangesAsync();
        assert(!await db.CourseScriptStates.AnyAsync(state => state.EnrollmentId == firstEnrollment.Id)
                && !await db.CourseScriptExecutions.AnyAsync(execution => execution.EnrollmentId == firstEnrollment.Id),
            "Deleting an enrollment must cascade-delete script state and execution records.");
    }
}
