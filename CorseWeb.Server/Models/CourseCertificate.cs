namespace CorseWeb.Server.Models;

/// <summary>
/// Immutable, verifiable snapshot of a learner's course completion.
/// It intentionally has no cascading foreign key to enrollment/course so that
/// an issued record survives later deletion or publication changes.
/// </summary>
public class CourseCertificate
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string EnrollmentId { get; set; } = default!;
    public string CourseId { get; set; } = default!;
    public string VerificationCode { get; set; } = default!;
    public string StudentName { get; set; } = default!;
    public string CourseTitle { get; set; } = default!;
    public string AuthorName { get; set; } = default!;
    public int CourseVersion { get; set; }
    public DateTime CourseCompletedAt { get; set; }
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
}
