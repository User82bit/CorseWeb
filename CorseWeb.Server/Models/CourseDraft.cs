namespace CorseWeb.Server.Models;

/// <summary>
/// Rascunho vinculado a um usuário (C2). Rascunhos ficam aqui; ao publicar viram Course.
/// Também suporta rascunho de edição de um curso já publicado (SourceCourseId).
/// </summary>
public class CourseDraft
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string OwnerId { get; set; } = default!; // AppUser.Id
    public string? SourceCourseId { get; set; } // se for edição de um publicado
    public string Slug { get; set; } = default!; // slug desejado (único por usuário quando rascunho novo)
    public string Title { get; set; } = default!;
    public string? Subtitle { get; set; }
    public string Description { get; set; } = default!;
    public string? ShortDescription { get; set; }

    public string ThumbnailJson { get; set; } = "{}";
    public string Category { get; set; } = default!;
    public string TagsJson { get; set; } = "[]";
    public string Level { get; set; } = "Iniciante";
    public string Language { get; set; } = "pt-BR";
    public string ModulesJson { get; set; } = "[]";
    public int TotalModules { get; set; }
    public int TotalLessons { get; set; }
    public int TotalMinutes { get; set; }
    public bool AllowComments { get; set; } = true;
    public bool AllowFork { get; set; } = true;

    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public string? OgImageJson { get; set; }
    public string? AuthorAvatarJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
