using Microsoft.EntityFrameworkCore;
using CorseWeb.Server.Models;

namespace CorseWeb.Server.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<CourseDraft> CourseDrafts => Set<CourseDraft>();
    public DbSet<CourseVersion> CourseVersions => Set<CourseVersion>();
    public DbSet<CourseEnrollment> Enrollments => Set<CourseEnrollment>();

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
    }
}
