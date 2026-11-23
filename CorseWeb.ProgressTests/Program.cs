using CorseWeb.Server.Data;
using CorseWeb.Server.Helpers;
using CorseWeb.Server.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

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

var duplicateCompletion = new CourseLessonCompletion
{
    Id = "completion-duplicate",
    EnrollmentId = enrollment.Id,
    LessonId = "lesson-published-1",
    CompletedAt = DateTime.UtcNow
};
var duplicateProjection = EnrollmentProgressProjector.ToDto(enrollment, course, [completion, duplicateCompletion]);
Assert(duplicateProjection.OverallPercent == 50, "Duplicate records must not inflate completion percentage.");

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

// Run the real EF Core migrations against an isolated in-memory SQLite database.
await using var connection = new SqliteConnection("Data Source=:memory:;Foreign Keys=True");
await connection.OpenAsync();

var options = new DbContextOptionsBuilder<AppDbContext>()
    .UseSqlite(connection)
    .Options;

await using (var db = new AppDbContext(options))
{
    var migrationsAssembly = db.GetService<IMigrationsAssembly>();
    var snapshotModel = migrationsAssembly.ModelSnapshot?.Model;
    if (snapshotModel != null)
    {
        var modelInitializer = db.GetService<IModelRuntimeInitializer>();
        var initializedSnapshot = modelInitializer.Initialize(snapshotModel, designTime: true);
        var designTimeModel = db.GetService<IDesignTimeModel>().Model;
        var initializedCurrent = modelInitializer.Initialize(designTimeModel, designTime: true);
        var modelDiffer = db.GetService<IMigrationsModelDiffer>();
        var pendingOperations = modelDiffer.GetDifferences(
            initializedSnapshot.GetRelationalModel(),
            initializedCurrent.GetRelationalModel());

        foreach (var operation in pendingOperations)
        {
            var details = operation.GetType().GetProperties()
                .Where(property => property.PropertyType == typeof(string)
                    || property.PropertyType.IsPrimitive)
                .Select(property => $"{property.Name}={property.GetValue(operation)}");
            Console.WriteLine($"Pending EF model difference: {operation.GetType().Name} {string.Join(", ", details)}");
        }
    }

    await db.Database.MigrateAsync();
    SqliteSchemaCompatibility.EnsurePasswordHashColumn(db);
    var userColumns = new List<string>();
    using (var command = connection.CreateCommand())
    {
        command.CommandText = "PRAGMA table_info('Users');";
        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            userColumns.Add(reader.GetString(1));
    }
    Assert(userColumns.Contains("PasswordHash"), "SQLite startup compatibility must ensure the nullable PasswordHash column.");

    var appliedMigrations = await db.Database.GetAppliedMigrationsAsync();
    Assert(
        appliedMigrations.Contains("20261117120000_AddCourseLessonCompletions"),
        "The lesson-completion migration must be discoverable and applied.");

    var persistedEnrollment = new CourseEnrollment
    {
        Id = "sqlite-enrollment",
        CourseId = "sqlite-course",
        UserId = "sqlite-student",
        EnrolledAt = DateTime.UtcNow,
        LastAccessedAt = DateTime.UtcNow
    };
    db.Enrollments.Add(persistedEnrollment);
    await db.SaveChangesAsync();

    var persistedCompletion = new CourseLessonCompletion
    {
        EnrollmentId = persistedEnrollment.Id,
        LessonId = "sqlite-lesson",
        CompletedAt = DateTime.UtcNow
    };
    db.CourseLessonCompletions.Add(persistedCompletion);
    await db.SaveChangesAsync();

    Assert(
        await db.CourseLessonCompletions.CountAsync() == 1,
        "A completion record must persist in the migrated SQLite schema.");

    db.CourseLessonCompletions.Add(new CourseLessonCompletion
    {
        EnrollmentId = persistedEnrollment.Id,
        LessonId = "sqlite-lesson",
        CompletedAt = DateTime.UtcNow
    });

    var duplicateRejected = false;
    try
    {
        await db.SaveChangesAsync();
    }
    catch (DbUpdateException)
    {
        duplicateRejected = true;
        foreach (var entry in db.ChangeTracker.Entries<CourseLessonCompletion>()
                     .Where(entry => entry.State == EntityState.Added))
        {
            entry.State = EntityState.Detached;
        }
    }

    Assert(duplicateRejected, "SQLite must reject duplicate completion rows for the same enrollment/lesson.");

    db.Enrollments.Remove(persistedEnrollment);
    await db.SaveChangesAsync();
    Assert(
        await db.CourseLessonCompletions.CountAsync() == 0,
        "Deleting an enrollment must cascade-delete its completion records.");

    // Publication status changes must increment the course version and persist
    // a snapshot with exactly the same status/version in the same unit of work.
    var versionedCourse = new Course
    {
        Id = "versioned-course",
        Slug = "versioned-course",
        Title = "Curso de versão",
        Description = "Descrição suficientemente longa para validar o curso.",
        Category = "Tecnologia",
        Status = "publicado",
        Language = "pt-BR",
        ModulesJson = "[]",
        AuthorId = "course-author",
        AuthorName = "Autor",
        CreatedBy = "course-author",
        UpdatedBy = "course-author",
        Version = 1
    };
    db.Courses.Add(versionedCourse);
    db.CourseVersions.Add(new CourseVersion
    {
        CourseId = versionedCourse.Id,
        Version = 1,
        SnapshotJson = System.Text.Json.JsonSerializer.Serialize(CourseMapper.ToDto(versionedCourse)),
        CreatedBy = "course-author"
    });
    await db.SaveChangesAsync();

    var transitionAt = DateTime.UtcNow;
    var changedToArchived = CourseVersioning.ApplyStatusTransition(
        versionedCourse, "arquivado", "course-admin", transitionAt);
    Assert(changedToArchived, "A real status change must be reported as changed.");
    Assert(versionedCourse.Status == "arquivado", "Publishing status must be updated.");
    Assert(versionedCourse.Version == 2, "A status change must increment the course version exactly once.");
    Assert(versionedCourse.UpdatedBy == "course-admin", "A status change must record the acting user.");
    Assert(versionedCourse.UpdatedAt == transitionAt, "A status change must use the transition timestamp.");

    var archivedSnapshot = CourseVersioning.CreateSnapshot(versionedCourse, "course-admin");
    db.CourseVersions.Add(archivedSnapshot);
    await db.SaveChangesAsync();
    Assert(archivedSnapshot.Version == 2, "The status snapshot must use the incremented version number.");
    Assert(archivedSnapshot.CreatedAt == transitionAt, "The snapshot and course transition must share one timestamp.");

    db.ChangeTracker.Clear();
    var persistedCourse = await db.Courses.SingleAsync(item => item.Id == "versioned-course");
    var persistedArchivedSnapshot = await db.CourseVersions.SingleAsync(item =>
        item.CourseId == "versioned-course" && item.Version == 2);
    using (var snapshotDocument = System.Text.Json.JsonDocument.Parse(persistedArchivedSnapshot.SnapshotJson))
    {
        var snapshotRoot = snapshotDocument.RootElement;
        Assert(snapshotRoot.GetProperty("Status").GetString() == "arquivado",
            "The persisted snapshot must capture the new publication status.");
        Assert(snapshotRoot.GetProperty("Version").GetInt32() == 2,
            "The persisted snapshot must capture the new version number.");
    }
    Assert(persistedCourse.Status == "arquivado" && persistedCourse.Version == 2,
        "The persisted course and snapshot must describe the same status transition.");

    var repeatedArchive = CourseVersioning.ApplyStatusTransition(persistedCourse, "rascunho", "course-admin");
    Assert(!repeatedArchive, "Requesting the already archived state via draft alias must be idempotent.");
    Assert(persistedCourse.Version == 2, "An idempotent status request must not increment the version.");
    Assert(await db.CourseVersions.CountAsync(item => item.CourseId == "versioned-course") == 2,
        "An idempotent status request must not create a duplicate snapshot.");

    var republished = CourseVersioning.ApplyStatusTransition(persistedCourse, "publicado", "course-author");
    Assert(republished && persistedCourse.Version == 3 && persistedCourse.Status == "publicado",
        "Re-publishing must create the next version transition.");
    db.CourseVersions.Add(CourseVersioning.CreateSnapshot(persistedCourse, "course-author"));
    await db.SaveChangesAsync();
    Assert(await db.CourseVersions.CountAsync(item => item.CourseId == "versioned-course") == 3,
        "Each effective status transition must have one history snapshot.");
}

await ApiIntegrationTestSuite.RunAsync(Assert);

Console.WriteLine($"Passed {testCount} server contract, SQLite migration and HTTP integration assertions.");
