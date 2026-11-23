using Microsoft.EntityFrameworkCore;
using CorseWeb.Server.Models;
using CorseWeb.Server.Helpers;

namespace CorseWeb.Server.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<CourseDraft> CourseDrafts => Set<CourseDraft>();
    public DbSet<CourseVersion> CourseVersions => Set<CourseVersion>();
    public DbSet<CourseEnrollment> Enrollments => Set<CourseEnrollment>();
    public DbSet<CourseLessonCompletion> CourseLessonCompletions => Set<CourseLessonCompletion>();
    public DbSet<CourseQuizAttempt> CourseQuizAttempts => Set<CourseQuizAttempt>();
    public DbSet<CourseExerciseAttempt> CourseExerciseAttempts => Set<CourseExerciseAttempt>();
    public DbSet<CourseCertificate> CourseCertificates => Set<CourseCertificate>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<AppUser>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Email).IsUnique();
        });

        b.Entity<Course>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.AuthorId);
        });

        b.Entity<CourseDraft>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.OwnerId, x.Slug });
            e.HasIndex(x => x.OwnerId);
            e.HasIndex(x => x.SourceCourseId);
        });

        b.Entity<CourseVersion>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.CourseId, x.Version }).IsUnique();
        });

        b.Entity<CourseEnrollment>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.CourseId }).IsUnique();
        });

        b.Entity<CourseCertificate>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.EnrollmentId).HasMaxLength(36).IsRequired();
            e.Property(x => x.CourseId).HasMaxLength(36).IsRequired();
            e.Property(x => x.VerificationCode).HasMaxLength(32).IsRequired();
            e.Property(x => x.StudentName).HasMaxLength(200).IsRequired();
            e.Property(x => x.CourseTitle).HasMaxLength(240).IsRequired();
            e.Property(x => x.AuthorName).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.EnrollmentId).IsUnique();
            e.HasIndex(x => x.VerificationCode).IsUnique();
            // Certificates are immutable snapshots and intentionally survive enrollment/course deletion.
        });

        b.Entity<CourseExerciseAttempt>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.EnrollmentId, x.LessonId, x.ExerciseNodeId }).IsUnique();
            e.Property(x => x.SubmittedAnswer).HasMaxLength(CourseExerciseEvaluator.MaxAnswerLength);
            e.HasOne<CourseEnrollment>()
                .WithMany()
                .HasForeignKey(x => x.EnrollmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<CourseQuizAttempt>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.EnrollmentId, x.LessonId, x.QuizNodeId }).IsUnique();
            e.HasOne<CourseEnrollment>()
                .WithMany()
                .HasForeignKey(x => x.EnrollmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<CourseLessonCompletion>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.EnrollmentId, x.LessonId }).IsUnique();
            e.HasOne<CourseEnrollment>()
                .WithMany()
                .HasForeignKey(x => x.EnrollmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
