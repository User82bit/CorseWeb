namespace CorseWeb.Server.Models;

public class CourseScriptState
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string EnrollmentId { get; set; } = default!;
    public string ScriptId { get; set; } = default!;
    public string Key { get; set; } = default!;
    public string ValueJson { get; set; } = "null";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
