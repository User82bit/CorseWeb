using System.Text.Json;

namespace CorseWeb.Server.Dtos;

// DTOs genéricos — espelham types/course.ts, serializados como JSON no cliente.
// Mantemos Media/Tag/Module/Lesson como JsonElement/JsonDocument para não travar evolução do editor.

public record CourseListDto(
    string Id, string Slug, string Title, string? Subtitle, string Description, string? ShortDescription,
    JsonElement Thumbnail, string Category, JsonElement Tags, string Level, string Status, string Language,
    JsonElement Modules,
    int TotalModules, int TotalLessons, int TotalMinutes,
    string? SeoTitle, string? SeoDescription, JsonElement? OgImage,
    bool AllowComments, bool AllowFork, bool IsFeatured,
    string AuthorId, string AuthorName, JsonElement? AuthorAvatar,
    int Version, string? Changelog,
    DateTime CreatedAt, DateTime UpdatedAt, string CreatedBy, string UpdatedBy
);

public record CourseCreateDto(
    string Title, string? Subtitle, string Description, string Category,
    JsonElement? Tags, string Level, string Language,
    JsonElement? Thumbnail, JsonElement? Modules,
    bool? AllowComments, bool? AllowFork, string? SeoTitle, string? SeoDescription, JsonElement? OgImage
);

public record CourseUpdateDto(
    string? Title, string? Subtitle, string? Description, string? Category,
    JsonElement? Tags, string? Level, string? Language,
    JsonElement? Thumbnail, JsonElement? Modules,
    bool? AllowComments, bool? AllowFork, bool? IsFeatured,
    string? SeoTitle, string? SeoDescription, JsonElement? OgImage, string? Changelog
);

public record CourseDraftDto(
    string Id, string OwnerId, string? SourceCourseId, string Slug, string Title, string? Subtitle,
    string Description, string? ShortDescription,
    JsonElement Thumbnail, string Category, JsonElement Tags, string Level, string Language,
    JsonElement Modules, int TotalModules, int TotalLessons, int TotalMinutes,
    bool AllowComments, bool AllowFork,
    DateTime CreatedAt, DateTime UpdatedAt
);

public record DraftCreateDto(
    string? Slug, string Title, string? Subtitle, string Description, string Category,
    JsonElement? Tags, string Level, string Language,
    JsonElement? Thumbnail, JsonElement? Modules,
    bool? AllowComments, bool? AllowFork,
    string? SourceCourseId
);

public record DraftUpdateDto(
    string? Title, string? Subtitle, string? Description, string? Category,
    JsonElement? Tags, string? Level, string? Language,
    JsonElement? Thumbnail, JsonElement? Modules,
    bool? AllowComments, bool? AllowFork, string? Slug
);

public record EnrollmentDto(
    string CourseId, DateTime EnrolledAt, DateTime? CompletedAt, int OverallPercent, string? CurrentLessonId, DateTime LastAccessedAt, JsonElement ModulesProgress
);

public record ProgressUpdateDto(int? OverallPercent, string? CurrentLessonId, JsonElement? ModulesProgress);
