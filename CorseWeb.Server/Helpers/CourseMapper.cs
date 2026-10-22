using System.Text.Json;
using CorseWeb.Server.Models;
using CorseWeb.Server.Dtos;

namespace CorseWeb.Server.Helpers;

public static class CourseMapper
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private static JsonElement ParseJsonElement(string json, string fallback = "{}")
    {
        try
        {
            var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? fallback : json);
            return doc.RootElement.Clone();
        }
        catch { return JsonDocument.Parse(fallback).RootElement.Clone(); }
    }

    private static JsonElement? ParseNullable(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonDocument.Parse(json).RootElement.Clone(); }
        catch { return null; }
    }

    private static string Stringify(JsonElement? el, string fallback = "{}")
    {
        if (el == null || el.Value.ValueKind == JsonValueKind.Undefined || el.Value.ValueKind == JsonValueKind.Null)
            return fallback;
        return JsonSerializer.Serialize(el.Value, JsonOpts);
    }

    private static string StringifyArray(JsonElement? el) => Stringify(el, "[]");

    // Courses must always have a usable cover URL. Empty URLs can exist in old
    // browser caches or in drafts created before cover validation was added.
    private static string EnsureThumbnailJson(string? json, string? title)
    {
        if (!string.IsNullOrWhiteSpace(json))
        {
            try
            {
                using var document = JsonDocument.Parse(json);
                var root = document.RootElement;
                if (root.ValueKind == JsonValueKind.Object
                    && root.TryGetProperty("url", out var url)
                    && url.ValueKind == JsonValueKind.String
                    && !string.IsNullOrWhiteSpace(url.GetString()))
                {
                    return root.GetRawText();
                }
            }
            catch (JsonException)
            {
                // Replace malformed legacy thumbnail data with the default cover.
            }
        }

        return JsonSerializer.Serialize(new
        {
            id = "thumb-default",
            type = "image",
            url = "/hero.png",
            alt = title ?? string.Empty
        }, JsonOpts);
    }

    private static (int Modules, int Lessons, int Minutes) CalculateContentTotals(string? modulesJson)
    {
        try
        {
            using var document = JsonDocument.Parse(string.IsNullOrWhiteSpace(modulesJson) ? "[]" : modulesJson);
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Array) return (0, 0, 0);

            var moduleCount = 0;
            var lessonCount = 0;
            var totalMinutes = 0;

            foreach (var module in root.EnumerateArray())
            {
                if (module.ValueKind != JsonValueKind.Object) continue;
                moduleCount++;

                if (!module.TryGetProperty("lessons", out var lessons) || lessons.ValueKind != JsonValueKind.Array)
                    continue;

                foreach (var lesson in lessons.EnumerateArray())
                {
                    if (lesson.ValueKind != JsonValueKind.Object) continue;
                    lessonCount++;
                    if (lesson.TryGetProperty("estimatedMinutes", out var duration) && duration.TryGetInt32(out var minutes))
                        totalMinutes += Math.Clamp(minutes, 0, 600);
                }
            }

            return (moduleCount, lessonCount, totalMinutes);
        }
        catch (JsonException)
        {
            return (0, 0, 0);
        }
    }

    private static void ApplyContentTotals(Course course)
    {
        var totals = CalculateContentTotals(course.ModulesJson);
        course.TotalModules = totals.Modules;
        course.TotalLessons = totals.Lessons;
        course.TotalMinutes = totals.Minutes;
    }

    private static void ApplyContentTotals(CourseDraft draft)
    {
        var totals = CalculateContentTotals(draft.ModulesJson);
        draft.TotalModules = totals.Modules;
        draft.TotalLessons = totals.Lessons;
        draft.TotalMinutes = totals.Minutes;
    }

    public static CourseListDto ToDto(Course c)
    {
        var totals = CalculateContentTotals(c.ModulesJson);
        return new CourseListDto(
            c.Id, c.Slug, c.Title, c.Subtitle, c.Description, c.ShortDescription,
            ParseJsonElement(EnsureThumbnailJson(c.ThumbnailJson, c.Title)),
            c.Category, ParseJsonElement(c.TagsJson, "[]"), c.Level, c.Status, c.Language,
            ParseJsonElement(c.ModulesJson, "[]"),
            totals.Modules, totals.Lessons, totals.Minutes,
            c.SeoTitle, c.SeoDescription, ParseNullable(c.OgImageJson),
            c.AllowComments, c.AllowFork, c.IsFeatured,
            c.AuthorId, c.AuthorName, ParseNullable(c.AuthorAvatarJson),
            c.Version, c.Changelog,
            c.CreatedAt, c.UpdatedAt, c.CreatedBy, c.UpdatedBy
        );
    }

    public static CourseDraftDto ToDto(CourseDraft d)
    {
        var totals = CalculateContentTotals(d.ModulesJson);
        return new CourseDraftDto(
            d.Id, d.OwnerId, d.SourceCourseId, d.Slug, d.Title, d.Subtitle,
            d.Description, d.ShortDescription,
            ParseJsonElement(EnsureThumbnailJson(d.ThumbnailJson, d.Title)),
            d.Category, ParseJsonElement(d.TagsJson, "[]"), d.Level, d.Language,
            ParseJsonElement(d.ModulesJson, "[]"), totals.Modules, totals.Lessons, totals.Minutes,
            d.AllowComments, d.AllowFork,
            d.CreatedAt, d.UpdatedAt
        );
    }

    public static Course FromCreateDto(CourseCreateDto dto, string authorId, string authorName, string slug, string id)
    {
        var now = DateTime.UtcNow;
        var modulesJson = dto.Modules != null ? JsonSerializer.Serialize(dto.Modules.Value, JsonOpts) : "[]";
        var totals = CalculateContentTotals(modulesJson);
        return new Course
        {
            Id = id,
            Slug = slug,
            Title = dto.Title.Trim(),
            Subtitle = dto.Subtitle?.Trim(),
            Description = dto.Description.Trim(),
            ShortDescription = dto.Description.Trim().Length > 140 ? dto.Description.Trim()[..140] : dto.Description.Trim(),
            ThumbnailJson = EnsureThumbnailJson(dto.Thumbnail.HasValue ? dto.Thumbnail.Value.GetRawText() : null, dto.Title),
            Category = dto.Category,
            TagsJson = dto.Tags != null ? JsonSerializer.Serialize(dto.Tags.Value, JsonOpts) : "[]",
            Level = dto.Level,
            Status = "publicado",
            Language = dto.Language ?? "pt-BR",
            ModulesJson = modulesJson,
            TotalModules = totals.Modules,
            TotalLessons = totals.Lessons,
            TotalMinutes = totals.Minutes,
            SeoTitle = dto.SeoTitle,
            SeoDescription = dto.SeoDescription,
            OgImageJson = dto.OgImage != null ? JsonSerializer.Serialize(dto.OgImage.Value, JsonOpts) : null,
            AllowComments = dto.AllowComments ?? true,
            AllowFork = dto.AllowFork ?? true,
            IsFeatured = false,
            AuthorId = authorId,
            AuthorName = authorName,
            Version = 1,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedBy = authorId,
            UpdatedBy = authorId
        };
    }

    public static void ApplyUpdate(Course c, CourseUpdateDto dto, string actorId)
    {
        if (dto.Title != null) c.Title = dto.Title.Trim();
        if (dto.Subtitle != null) c.Subtitle = dto.Subtitle?.Trim();
        if (dto.Description != null) { c.Description = dto.Description.Trim(); c.ShortDescription = dto.Description.Trim()[..Math.Min(140, dto.Description.Trim().Length)]; }
        if (dto.Category != null) c.Category = dto.Category;
        if (dto.Tags != null) c.TagsJson = JsonSerializer.Serialize(dto.Tags.Value, JsonOpts);
        if (dto.Level != null) c.Level = dto.Level;
        if (dto.Language != null) c.Language = dto.Language;
        if (dto.Thumbnail != null) c.ThumbnailJson = EnsureThumbnailJson(dto.Thumbnail.Value.GetRawText(), c.Title);
        if (dto.Modules != null)
        {
            c.ModulesJson = JsonSerializer.Serialize(dto.Modules.Value, JsonOpts);
            ApplyContentTotals(c);
        }
        if (dto.AllowComments != null) c.AllowComments = dto.AllowComments.Value;
        if (dto.AllowFork != null) c.AllowFork = dto.AllowFork.Value;
        if (dto.IsFeatured != null) c.IsFeatured = dto.IsFeatured.Value;
        if (dto.SeoTitle != null) c.SeoTitle = dto.SeoTitle;
        if (dto.SeoDescription != null) c.SeoDescription = dto.SeoDescription;
        if (dto.OgImage != null) c.OgImageJson = JsonSerializer.Serialize(dto.OgImage.Value, JsonOpts);
        if (dto.Changelog != null) c.Changelog = dto.Changelog;
        c.UpdatedAt = DateTime.UtcNow;
        c.UpdatedBy = actorId;
        c.Version += 1;
    }

    public static CourseDraft FromDraftCreate(DraftCreateDto dto, string ownerId, string slug, string id)
    {
        var now = DateTime.UtcNow;
        var modulesJson = dto.Modules != null ? JsonSerializer.Serialize(dto.Modules.Value, JsonOpts) : "[]";
        var totals = CalculateContentTotals(modulesJson);
        return new CourseDraft
        {
            Id = id,
            OwnerId = ownerId,
            SourceCourseId = dto.SourceCourseId,
            Slug = slug,
            Title = dto.Title.Trim(),
            Subtitle = dto.Subtitle?.Trim(),
            Description = dto.Description.Trim(),
            ShortDescription = dto.Description.Trim().Length > 140 ? dto.Description.Trim()[..140] : dto.Description.Trim(),
            ThumbnailJson = EnsureThumbnailJson(dto.Thumbnail.HasValue ? dto.Thumbnail.Value.GetRawText() : null, dto.Title),
            Category = dto.Category,
            TagsJson = dto.Tags != null ? JsonSerializer.Serialize(dto.Tags.Value, JsonOpts) : "[]",
            Level = dto.Level,
            Language = dto.Language ?? "pt-BR",
            ModulesJson = modulesJson,
            TotalModules = totals.Modules,
            TotalLessons = totals.Lessons,
            TotalMinutes = totals.Minutes,
            AllowComments = dto.AllowComments ?? true,
            AllowFork = dto.AllowFork ?? true,
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    public static void ApplyDraftUpdate(CourseDraft d, DraftUpdateDto dto)
    {
        if (dto.Title != null) d.Title = dto.Title.Trim();
        if (dto.Subtitle != null) d.Subtitle = dto.Subtitle?.Trim();
        if (dto.Description != null) { d.Description = dto.Description.Trim(); d.ShortDescription = dto.Description.Trim()[..Math.Min(140, dto.Description.Trim().Length)]; }
        if (dto.Category != null) d.Category = dto.Category;
        if (dto.Tags != null) d.TagsJson = JsonSerializer.Serialize(dto.Tags.Value, JsonOpts);
        if (dto.Level != null) d.Level = dto.Level;
        if (dto.Language != null) d.Language = dto.Language;
        if (dto.Thumbnail != null) d.ThumbnailJson = EnsureThumbnailJson(dto.Thumbnail.Value.GetRawText(), d.Title);
        if (dto.Modules != null)
        {
            d.ModulesJson = JsonSerializer.Serialize(dto.Modules.Value, JsonOpts);
            ApplyContentTotals(d);
        }
        if (dto.AllowComments != null) d.AllowComments = dto.AllowComments.Value;
        if (dto.AllowFork != null) d.AllowFork = dto.AllowFork.Value;
        if (dto.Slug != null) d.Slug = dto.Slug.Trim();
        d.UpdatedAt = DateTime.UtcNow;
    }
}
