namespace CorseWeb.Server.Models;

public class CourseEnrollment
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = default!;
    public string CourseId { get; set; } = default!;
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public int OverallPercent { get; set; }
    public string? CurrentLessonId { get; set; }
    public DateTime LastAccessedAt { get; set; } = DateTime.UtcNow;
    public string ModulesProgressJson { get; set; } = "[]";
}
