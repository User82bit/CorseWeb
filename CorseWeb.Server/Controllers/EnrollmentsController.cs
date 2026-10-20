using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CorseWeb.Server.Data;
using CorseWeb.Server.Dtos;

namespace CorseWeb.Server.Controllers;

[ApiController]
[Route("api/enrollments")]
[Authorize]
public class EnrollmentsController : ControllerBase
{
    private readonly AppDbContext _db;
    public EnrollmentsController(AppDbContext db) { _db = db; }
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<IActionResult> MyEnrollments()
    {
        var list = await _db.Enrollments.Where(e => e.UserId == UserId).OrderByDescending(e => e.LastAccessedAt).ToListAsync();
        return Ok(list.Select(e => new EnrollmentDto(e.CourseId, e.EnrolledAt, e.CompletedAt, e.OverallPercent, e.CurrentLessonId, e.LastAccessedAt,
            TryParse(e.ModulesProgressJson))));
    }

    [HttpPost("{courseId}")]
    public async Task<IActionResult> Enroll(string courseId)
    {
        var course = await _db.Courses.FindAsync(courseId);
        if (course == null)
            course = await _db.Courses.FirstOrDefaultAsync(c => c.Slug == courseId);
        if (course == null) return NotFound(new { error = "Curso não encontrado" });
        if (course.Status != "publicado") return BadRequest(new { error = "Curso não publicado" });

        var existing = await _db.Enrollments.FirstOrDefaultAsync(e => e.UserId == UserId && e.CourseId == course.Id);
        if (existing != null) return Ok(new EnrollmentDto(existing.CourseId, existing.EnrolledAt, existing.CompletedAt, existing.OverallPercent, existing.CurrentLessonId, existing.LastAccessedAt, TryParse(existing.ModulesProgressJson)));

        var en = new CorseWeb.Server.Models.CourseEnrollment
        {
            UserId = UserId, CourseId = course.Id, EnrolledAt = DateTime.UtcNow, LastAccessedAt = DateTime.UtcNow, OverallPercent = 0, ModulesProgressJson = "[]"
        };
        _db.Enrollments.Add(en);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(MyEnrollments), new EnrollmentDto(en.CourseId, en.EnrolledAt, en.CompletedAt, en.OverallPercent, en.CurrentLessonId, en.LastAccessedAt, TryParse(en.ModulesProgressJson)));
    }

    [HttpPut("{courseId}/progress")]
    public async Task<IActionResult> UpdateProgress(string courseId, [FromBody] ProgressUpdateDto dto)
    {
        var en = await _db.Enrollments.FirstOrDefaultAsync(e => e.UserId == UserId && e.CourseId == courseId);
        if (en == null)
        {
            // tenta por slug
            var c = await _db.Courses.FirstOrDefaultAsync(x => x.Slug == courseId);
            if (c != null) en = await _db.Enrollments.FirstOrDefaultAsync(e => e.UserId == UserId && e.CourseId == c.Id);
        }
        if (en == null) return NotFound(new { error = "Matrícula não encontrada" });
        if (dto.OverallPercent != null) en.OverallPercent = Math.Clamp(dto.OverallPercent.Value, 0, 100);
        if (dto.CurrentLessonId != null) en.CurrentLessonId = dto.CurrentLessonId;
        if (dto.ModulesProgress != null) en.ModulesProgressJson = JsonSerializer.Serialize(dto.ModulesProgress.Value);
        en.LastAccessedAt = DateTime.UtcNow;
        if (en.OverallPercent >= 100 && en.CompletedAt == null) en.CompletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new EnrollmentDto(en.CourseId, en.EnrolledAt, en.CompletedAt, en.OverallPercent, en.CurrentLessonId, en.LastAccessedAt, TryParse(en.ModulesProgressJson)));
    }

    [HttpDelete("{courseId}")]
    public async Task<IActionResult> Unenroll(string courseId)
    {
        var en = await _db.Enrollments.FirstOrDefaultAsync(e => e.UserId == UserId && e.CourseId == courseId);
        if (en == null)
        {
            var c = await _db.Courses.FirstOrDefaultAsync(x => x.Slug == courseId);
            if (c != null) en = await _db.Enrollments.FirstOrDefaultAsync(e => e.UserId == UserId && e.CourseId == c.Id);
        }
        if (en == null) return NotFound();
        _db.Enrollments.Remove(en);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    private static JsonElement TryParse(string json)
    {
        try { return JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? "[]" : json).RootElement.Clone(); }
        catch { return JsonDocument.Parse("[]").RootElement.Clone(); }
    }
}
