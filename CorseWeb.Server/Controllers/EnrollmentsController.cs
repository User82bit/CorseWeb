using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CorseWeb.Server.Data;
using CorseWeb.Server.Dtos;
using CorseWeb.Server.Helpers;
using CorseWeb.Server.Models;

namespace CorseWeb.Server.Controllers;

[ApiController]
[Route("api/enrollments")]
[Authorize]
public class EnrollmentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public EnrollmentsController(AppDbContext db)
    {
        _db = db;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<IActionResult> MyEnrollments()
    {
        var enrollments = await _db.Enrollments
            .Where(enrollment => enrollment.UserId == UserId)
            .OrderByDescending(enrollment => enrollment.LastAccessedAt)
            .ToListAsync();

        var enrollmentIds = enrollments.Select(enrollment => enrollment.Id).ToArray();
        var courseIds = enrollments.Select(enrollment => enrollment.CourseId).Distinct().ToArray();

        var courses = await _db.Courses
            .Where(course => courseIds.Contains(course.Id))
            .ToDictionaryAsync(course => course.Id);

        var completions = enrollmentIds.Length == 0
            ? []
            : await _db.LessonCompletions
                .Where(completion => enrollmentIds.Contains(completion.EnrollmentId))
                .ToListAsync();

        var completionsByEnrollment = completions
            .GroupBy(completion => completion.EnrollmentId)
            .ToDictionary(group => group.Key, group => (IReadOnlyCollection<CourseLessonCompletion>)group.ToArray());

        return Ok(enrollments.Select(enrollment =>
        {
            courses.TryGetValue(enrollment.CourseId, out var course);
            completionsByEnrollment.TryGetValue(enrollment.Id, out var enrollmentCompletions);
            return EnrollmentProgressProjector.ToDto(
                enrollment,
                course,
                enrollmentCompletions ?? []);
        }));
    }

    [HttpPost("{courseId}")]
    public async Task<IActionResult> Enroll(string courseId)
    {
        var course = await FindCourseAsync(courseId);
        if (course == null) return NotFound(new { error = "Curso não encontrado" });
        if (course.Status != "publicado") return BadRequest(new { error = "Curso não publicado" });

        var existing = await _db.Enrollments
            .FirstOrDefaultAsync(enrollment => enrollment.UserId == UserId && enrollment.CourseId == course.Id);
        if (existing != null)
            return Ok(await BuildEnrollmentDtoAsync(existing, course));

        var now = DateTime.UtcNow;
        var enrollment = new CourseEnrollment
        {
            UserId = UserId,
            CourseId = course.Id,
            EnrolledAt = now,
            LastAccessedAt = now,
            OverallPercent = 0,
            ModulesProgressJson = "[]"
        };

        _db.Enrollments.Add(enrollment);
        await _db.SaveChangesAsync();

        return CreatedAtAction(
            nameof(MyEnrollments),
            new { courseId = course.Id },
            await BuildEnrollmentDtoAsync(enrollment, course));
    }

    /// <summary>
    /// Updates navigation state only. Completion, module progress and percentages
    /// are projected from server-side completion records and are never accepted here.
    /// </summary>
    [HttpPut("{courseId}/progress")]
    public async Task<IActionResult> UpdateProgress(string courseId, [FromBody] ProgressUpdateDto dto)
    {
        var course = await FindCourseAsync(courseId);
        if (course == null || course.Status != "publicado")
            return NotFound(new { error = "Curso publicado não encontrado" });

        var enrollment = await _db.Enrollments
            .FirstOrDefaultAsync(item => item.UserId == UserId && item.CourseId == course.Id);
        if (enrollment == null) return NotFound(new { error = "Matrícula não encontrada" });

        if (dto.CurrentLessonId != null)
        {
            if (string.IsNullOrWhiteSpace(dto.CurrentLessonId)
                || !EnrollmentProgressProjector.IsPublishedLesson(course.ModulesJson, dto.CurrentLessonId))
            {
                return BadRequest(new { error = "Aula não publicada ou não pertencente ao curso" });
            }

            enrollment.CurrentLessonId = dto.CurrentLessonId;
        }

        enrollment.LastAccessedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(await BuildEnrollmentDtoAsync(enrollment, course));
    }

    /// <summary>
    /// Records the student's explicit completion action for a published lesson.
    /// The server validates membership/publication and stores the completion timestamp.
    /// </summary>
    [HttpPost("{courseId}/lessons/{lessonId}/complete")]
    public async Task<IActionResult> CompleteLesson(string courseId, string lessonId)
    {
        var course = await FindCourseAsync(courseId);
        if (course == null || course.Status != "publicado")
            return NotFound(new { error = "Curso publicado não encontrado" });

        if (!EnrollmentProgressProjector.IsPublishedLesson(course.ModulesJson, lessonId))
            return NotFound(new { error = "Aula publicada não encontrada neste curso" });

        var enrollment = await _db.Enrollments
            .FirstOrDefaultAsync(item => item.UserId == UserId && item.CourseId == course.Id);
        if (enrollment == null) return NotFound(new { error = "Matrícula não encontrada" });

        var completionExists = await _db.LessonCompletions.AnyAsync(record =>
            record.EnrollmentId == enrollment.Id && record.LessonId == lessonId);

        if (!completionExists)
        {
            var completion = new CourseLessonCompletion
            {
                EnrollmentId = enrollment.Id,
                LessonId = lessonId,
                CompletedAt = DateTime.UtcNow
            };

            _db.LessonCompletions.Add(completion);
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // A unique index makes simultaneous duplicate requests idempotent.
                // Detach the failed insert and confirm another request persisted it.
                _db.Entry(completion).State = EntityState.Detached;
                var wasRecorded = await _db.LessonCompletions.AnyAsync(record =>
                    record.EnrollmentId == enrollment.Id && record.LessonId == lessonId);
                if (!wasRecorded) throw;
            }
        }

        enrollment.CurrentLessonId = lessonId;
        enrollment.LastAccessedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(await BuildEnrollmentDtoAsync(enrollment, course));
    }

    [HttpDelete("{courseId}")]
    public async Task<IActionResult> Unenroll(string courseId)
    {
        var course = await FindCourseAsync(courseId);
        if (course == null) return NotFound();

        var enrollment = await _db.Enrollments
            .FirstOrDefaultAsync(item => item.UserId == UserId && item.CourseId == course.Id);
        if (enrollment == null) return NotFound();

        _db.Enrollments.Remove(enrollment);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    private Task<Course?> FindCourseAsync(string courseId)
    {
        return _db.Courses.FirstOrDefaultAsync(course =>
            course.Id == courseId || course.Slug == courseId);
    }

    private async Task<EnrollmentDto> BuildEnrollmentDtoAsync(CourseEnrollment enrollment, Course course)
    {
        var completions = await _db.LessonCompletions
            .Where(record => record.EnrollmentId == enrollment.Id)
            .ToListAsync();

        return EnrollmentProgressProjector.ToDto(enrollment, course, completions);
    }
}
