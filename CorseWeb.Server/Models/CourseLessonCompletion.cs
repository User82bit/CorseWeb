namespace CorseWeb.Server.Models;

public class CourseLessonCompletion
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string EnrollmentId { get; set; } = default!;
    public string LessonId { get; set; } = default!;
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
}