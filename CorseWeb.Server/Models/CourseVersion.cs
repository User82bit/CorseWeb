namespace CorseWeb.Server.Models;

public class CourseVersion
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CourseId { get; set; } = default!;
    public int Version { get; set; }
    public string SnapshotJson { get; set; } = "{}"; // Course serializado
    public string? Changelog { get; set; }
    public string CreatedBy { get; set; } = default!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
