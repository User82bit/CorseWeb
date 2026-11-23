using System.Text.Json;
using System.Text.Json.Serialization;
using CorseWeb.Server.Dtos;
using CorseWeb.Server.Models;

namespace CorseWeb.Server.Helpers;

/// <summary>
/// Builds student progress exclusively from server-recorded lesson completion events.
/// Legacy fields on CourseEnrollment are intentionally not used as a source of truth.
/// </summary>
public static class EnrollmentProgressProjector
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static bool IsPublishedLesson(string? modulesJson, string lessonId)
    {
        if (string.IsNullOrWhiteSpace(lessonId)) return false;

        return ReadPublishedModules(modulesJson)
            .SelectMany(module => module.Lessons)
            .Any(lesson => string.Equals(lesson.LessonId, lessonId, StringComparison.Ordinal));
    }

    public static EnrollmentDto ToDto(
        CourseEnrollment enrollment,
        Course? course,
        IReadOnlyCollection<CourseLessonCompletion> completionRecords,
        IReadOnlyCollection<CourseQuizAttempt>? quizAttempts = null,
        IReadOnlyCollection<CourseExerciseAttempt>? exerciseAttempts = null)
    {
        var modules = ReadPublishedModules(course?.ModulesJson);
        var validLessonIds = modules
            .SelectMany(module => module.Lessons)
            .Select(lesson => lesson.LessonId)
            .ToHashSet(StringComparer.Ordinal);

        // Ignore records for another enrollment and orphaned/unpublished lessons.
        // The database unique index additionally prevents duplicate completion events.
        var completedAtByLesson = completionRecords
            .Where(record =>
                string.Equals(record.EnrollmentId, enrollment.Id, StringComparison.Ordinal)
                && validLessonIds.Contains(record.LessonId))
            .GroupBy(record => record.LessonId, StringComparer.Ordinal)
            .ToDictionary(
                group => group.Key,
                group => group.Min(record => record.CompletedAt),
                StringComparer.Ordinal);

        var totalLessons = validLessonIds.Count;
        var completedCount = completedAtByLesson.Count;
        var overallPercent = totalLessons == 0
            ? 0
            : (int)Math.Round(completedCount * 100d / totalLessons, MidpointRounding.AwayFromZero);

        DateTime? courseCompletedAt = totalLessons > 0 && completedCount == totalLessons
            ? completedAtByLesson.Values.Max()
            : null;

        var modulesProgress = modules.Select(module =>
        {
            var lessonProgress = module.Lessons.Select(lesson =>
            {
                var completed = completedAtByLesson.TryGetValue(lesson.LessonId, out var completedAt);
                var isCurrent = string.Equals(enrollment.CurrentLessonId, lesson.LessonId, StringComparison.Ordinal);
                return new LessonProgressPayload(
                    lesson.LessonId,
                    completed ? "concluido" : isCurrent ? "em-andamento" : "nao-iniciado",
                    completedAt,
                    0);
            }).ToArray();

            var moduleCompletedCount = lessonProgress.Count(item => item.Status == "concluido");
            var modulePercent = lessonProgress.Length == 0
                ? 0
                : (int)Math.Round(moduleCompletedCount * 100d / lessonProgress.Length, MidpointRounding.AwayFromZero);
            DateTime? moduleCompletedAt = moduleCompletedCount == lessonProgress.Length && lessonProgress.Length > 0
                ? lessonProgress
                    .Where(item => item.CompletedAt.HasValue)
                    .Max(item => item.CompletedAt!.Value)
                : null;

            return new ModuleProgressPayload(module.ModuleId, moduleCompletedAt, modulePercent, lessonProgress);
        }).ToArray();

        var attemptPayload = (quizAttempts ?? Array.Empty<CourseQuizAttempt>())
            .Where(attempt => string.Equals(attempt.EnrollmentId, enrollment.Id, StringComparison.Ordinal))
            .OrderBy(attempt => attempt.CompletedAt)
            .Select(attempt => new QuizAttemptPayload(
                attempt.LessonId,
                attempt.QuizNodeId,
                attempt.SelectedOptionIndex,
                attempt.IsCorrect,
                attempt.Passed,
                attempt.Score,
                attempt.CompletedAt))
            .ToArray();

        var exercisePayload = (exerciseAttempts ?? Array.Empty<CourseExerciseAttempt>())
            .Where(attempt => string.Equals(attempt.EnrollmentId, enrollment.Id, StringComparison.Ordinal))
            .OrderBy(attempt => attempt.CompletedAt)
            .Select(attempt => new ExerciseAttemptPayload(
                attempt.LessonId,
                attempt.ExerciseNodeId,
                attempt.IsCorrect,
                attempt.Passed,
                attempt.Score,
                attempt.CompletedAt))
            .ToArray();

        using var document = JsonDocument.Parse(JsonSerializer.Serialize(modulesProgress, JsonOptions));
        using var quizDocument = JsonDocument.Parse(JsonSerializer.Serialize(attemptPayload, JsonOptions));
        using var exerciseDocument = JsonDocument.Parse(JsonSerializer.Serialize(exercisePayload, JsonOptions));
        var currentLessonId = enrollment.CurrentLessonId is { } current
            && validLessonIds.Contains(current)
                ? current
                : null;

        return new EnrollmentDto(
            enrollment.CourseId,
            enrollment.EnrolledAt,
            courseCompletedAt,
            overallPercent,
            currentLessonId,
            enrollment.LastAccessedAt,
            document.RootElement.Clone(),
            quizDocument.RootElement.Clone(),
            exerciseDocument.RootElement.Clone());
    }

    private static IReadOnlyList<PublishedModule> ReadPublishedModules(string? modulesJson)
    {
        if (string.IsNullOrWhiteSpace(modulesJson)) return [];

        try
        {
            using var document = JsonDocument.Parse(modulesJson);
            if (document.RootElement.ValueKind != JsonValueKind.Array) return [];

            var modules = new List<PublishedModule>();
            var seenModuleIds = new HashSet<string>(StringComparer.Ordinal);
            var seenLessonIds = new HashSet<string>(StringComparer.Ordinal);

            foreach (var moduleElement in document.RootElement.EnumerateArray())
            {
                if (moduleElement.ValueKind != JsonValueKind.Object
                    || !TryGetString(moduleElement, "id", out var moduleId)
                    || !seenModuleIds.Add(moduleId)
                    || !TryGetProperty(moduleElement, "lessons", out var lessonsElement)
                    || lessonsElement.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                var lessons = new List<PublishedLesson>();
                foreach (var lessonElement in lessonsElement.EnumerateArray())
                {
                    if (lessonElement.ValueKind != JsonValueKind.Object
                        || !TryGetString(lessonElement, "id", out var lessonId)
                        || !seenLessonIds.Add(lessonId)
                        || !TryGetProperty(lessonElement, "isPublished", out var isPublished)
                        || isPublished.ValueKind != JsonValueKind.True)
                    {
                        continue;
                    }

                    lessons.Add(new PublishedLesson(lessonId));
                }

                if (lessons.Count > 0)
                    modules.Add(new PublishedModule(moduleId, lessons));
            }

            return modules;
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static bool TryGetString(JsonElement element, string name, out string value)
    {
        value = string.Empty;
        if (!TryGetProperty(element, name, out var property)
            || property.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        value = property.GetString() ?? string.Empty;
        return !string.IsNullOrWhiteSpace(value);
    }

    private static bool TryGetProperty(JsonElement element, string name, out JsonElement value)
    {
        if (element.TryGetProperty(name, out value)) return true;

        foreach (var property in element.EnumerateObject())
        {
            if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }

        value = default;
        return false;
    }

    private sealed record PublishedModule(string ModuleId, IReadOnlyList<PublishedLesson> Lessons);
    private sealed record PublishedLesson(string LessonId);
    private sealed record ModuleProgressPayload(
        string ModuleId,
        DateTime? CompletedAt,
        int Percent,
        IReadOnlyList<LessonProgressPayload> Lessons);
    private sealed record LessonProgressPayload(
        string LessonId,
        string Status,
        DateTime? CompletedAt,
        int TimeSpentMinutes);
}