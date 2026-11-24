namespace CorseWeb.Server.Models;

public class CourseScriptExecution
{
    public const string EventMarkerScriptId = "__event__";

    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string EnrollmentId { get; set; } = default!;
    public string CourseId { get; set; } = default!;
    public string LessonId { get; set; } = default!;
    public string EventName { get; set; } = default!;
    public string SourceEventId { get; set; } = default!;
    public string ScriptId { get; set; } = default!;
    public string ResultJson { get; set; } = "{}";
    public bool Failed { get; set; }
    public string? DiagnosticCode { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
