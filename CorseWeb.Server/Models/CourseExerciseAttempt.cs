namespace CorseWeb.Server.Models;

public class CourseExerciseAttempt
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string EnrollmentId { get; set; } = default!;
    public string LessonId { get; set; } = default!;
    public string ExerciseNodeId { get; set; } = default!;
    public string SubmittedAnswer { get; set; } = default!;
    public bool IsCorrect { get; set; }
    public bool Passed { get; set; }
    public int Score { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
}
