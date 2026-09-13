using System.Text.Json;

namespace CorseWeb.Server.Models;

public class Course
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Slug { get; set; } = default!;
    public string Title { get; set; } = default!;
    public string? Subtitle { get; set; }
    public string Description { get; set; } = default!;
    public string? ShortDescription { get; set; }

    // JSON columns — espelham types/course.ts
    public string ThumbnailJson { get; set; } = "{}"; // Media
    public string Category { get; set; } = default!;
    public string TagsJson { get; set; } = "[]";      // Tag[]
    public string Level { get; set; } = "Iniciante";  // Iniciante|Intermediário|Avançado
    public string Status { get; set; } = "publicado"; // publicado|arquivado (rascunho vive em Drafts)
    public string Language { get; set; } = "pt-BR";
    public string ModulesJson { get; set; } = "[]";    // Module[]

    public int TotalModules { get; set; }
    public int TotalLessons { get; set; }
    public int TotalMinutes { get; set; }

    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public string? OgImageJson { get; set; }

    public bool AllowComments { get; set; } = true;
    public bool AllowFork { get; set; } = true;
    public bool IsFeatured { get; set; }

    public string AuthorId { get; set; } = default!;
    public string AuthorName { get; set; } = default!;
    public string? AuthorAvatarJson { get; set; }

    public int Version { get; set; } = 1;
    public string? Changelog { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = default!;
    public string UpdatedBy { get; set; } = default!;

    // helpers não mapeados
    public JsonDocument? ThumbnailDoc => TryParse(ThumbnailJson);
    public JsonDocument? TagsDoc => TryParse(TagsJson);
    public JsonDocument? ModulesDoc => TryParse(ModulesJson);

    private static JsonDocument? TryParse(string json)
    {
        try { return JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? "{}" : json); }
        catch { return null; }
    }
}
