namespace CorseWeb.Server.Models;

public class CourseQuizAttempt
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string EnrollmentId { get; set; } = default!;
    public string LessonId { get; set; } = default!;
    public string QuizNodeId { get; set; } = default!;
    public int SelectedOptionIndex { get; set; }
    public bool IsCorrect { get; set; }
    public bool Passed { get; set; }
    public int Score { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
}
