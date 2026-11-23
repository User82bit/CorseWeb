using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CorseWeb.Server.Data;
using CorseWeb.Server.Dtos;
using CorseWeb.Server.Helpers;
using CorseWeb.Server.Models;

namespace CorseWeb.Server.Controllers;

[ApiController]
[Route("api/courses")]
public class CoursesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    public CoursesController(AppDbContext db, IConfiguration config) { _db = db; _config = config; }

    private string? CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string? CurrentRole => User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirst("role")?.Value;
    private bool IsAdmin => CurrentRole == "admin";
    private bool IsAuthenticated => User.Identity?.IsAuthenticated == true;

    // GET /api/courses?status=publicado|all & search=
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] string? search, [FromQuery] bool? includeAll)
    {
        IQueryable<CorseWeb.Server.Models.Course> q = _db.Courses;
        // público vê só publicado; admin autenticado pode pedir includeAll=true para ver todos
        var canSeeAll = IsAdmin && (includeAll == true || status == "all");
        if (!canSeeAll)
        {
            q = q.Where(c => c.Status == "publicado");
        }
        else if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            q = q.Where(c => c.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(c => c.Title.ToLower().Contains(s) || c.Description.ToLower().Contains(s));
        }

        var list = await q.OrderByDescending(c => c.UpdatedAt).Take(200).ToListAsync();
        var attemptsByCourse = new Dictionary<string, IReadOnlyCollection<CourseQuizAttempt>>(StringComparer.Ordinal);
        if (!IsAdmin && CurrentUserId is { } userId && list.Count > 0)
        {
            var listedCourseIds = list.Select(course => course.Id).ToArray();
            var enrollmentMap = await _db.Enrollments
                .Where(enrollment => enrollment.UserId == userId && listedCourseIds.Contains(enrollment.CourseId))
                .ToDictionaryAsync(enrollment => enrollment.Id, enrollment => enrollment.CourseId);
            var enrollmentIds = enrollmentMap.Keys.ToArray();
            if (enrollmentIds.Length > 0)
            {
                var attempts = await _db.CourseQuizAttempts
                    .Where(attempt => enrollmentIds.Contains(attempt.EnrollmentId))
                    .ToListAsync();
                attemptsByCourse = attempts
                    .GroupBy(attempt => enrollmentMap[attempt.EnrollmentId], StringComparer.Ordinal)
                    .ToDictionary(
                        group => group.Key,
                        group => (IReadOnlyCollection<CourseQuizAttempt>)group.ToArray(),
                        StringComparer.Ordinal);
            }
        }

        return Ok(list.Select(course =>
        {
            if (IsAdmin || course.AuthorId == CurrentUserId)
                return CourseMapper.ToDto(course);
            attemptsByCourse.TryGetValue(course.Id, out var attempts);
            return CourseMapper.ToStudentDto(course, attempts ?? []);
        }));
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var c = await _db.Courses.FirstOrDefaultAsync(x => x.Slug == slug);
        if (c == null) return NotFound(new { error = "Curso não encontrado" });
        if (c.Status != "publicado" && !IsAdmin && c.AuthorId != CurrentUserId)
            return NotFound(new { error = "Curso não encontrado" });
        if (IsAdmin || c.AuthorId == CurrentUserId)
            return Ok(CourseMapper.ToDto(c));

        IReadOnlyCollection<CourseQuizAttempt> attempts = [];
        if (CurrentUserId is { } userId)
        {
            var enrollmentId = await _db.Enrollments
                .Where(enrollment => enrollment.UserId == userId && enrollment.CourseId == c.Id)
                .Select(enrollment => enrollment.Id)
                .FirstOrDefaultAsync();
            if (enrollmentId != null)
            {
                attempts = await _db.CourseQuizAttempts
                    .Where(attempt => attempt.EnrollmentId == enrollmentId)
                    .ToListAsync();
            }
        }

        return Ok(CourseMapper.ToStudentDto(c, attempts));
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CourseCreateDto dto)
    {
        var userId = CurrentUserId!;
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Trim().Length < 3) return BadRequest(new { error = "Título mínimo 3 caracteres" });
        if (string.IsNullOrWhiteSpace(dto.Description) || dto.Description.Trim().Length < 20) return BadRequest(new { error = "Descrição mínima 20 caracteres" });
        var contentError = CourseContentValidator.Validate(dto.Modules);
        if (contentError != null) return BadRequest(new { error = contentError });
        var quizError = CourseQuizEvaluator.ValidatePublishedQuizzes(dto.Modules?.GetRawText());
        if (quizError != null) return BadRequest(new { error = quizError });

        var baseSlug = SlugHelper.Slugify(dto.Title);
        var existingSlugs = await _db.Courses.Select(c => c.Slug).ToListAsync();
        var slug = SlugHelper.EnsureUnique(baseSlug, s => existingSlugs.Contains(s));
        // também evita colisão com drafts do usuário
        var draftSlugs = await _db.CourseDrafts.Where(d => d.OwnerId == userId).Select(d => d.Slug).ToListAsync();
        slug = SlugHelper.EnsureUnique(slug, s => draftSlugs.Contains(s));

        var id = $"course-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString()[..6]}";
        var course = CourseMapper.FromCreateDto(dto, userId, user.Name, slug, id);
        _db.Courses.Add(course);

        // version snapshot
        _db.CourseVersions.Add(new CorseWeb.Server.Models.CourseVersion
        {
            CourseId = course.Id, Version = course.Version,
            SnapshotJson = JsonSerializer.Serialize(CourseMapper.ToDto(course)),
            CreatedBy = userId
        });

        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetBySlug), new { slug = course.Slug }, CourseMapper.ToDto(course));
    }

    [Authorize]
    [HttpPut("{slug}")]
    public async Task<IActionResult> Update(string slug, [FromBody] CourseUpdateDto dto)
    {
        var c = await _db.Courses.FirstOrDefaultAsync(x => x.Slug == slug);
        if (c == null) return NotFound();
        if (!IsAdmin && c.AuthorId != CurrentUserId) return Forbid();
        var contentError = CourseContentValidator.Validate(dto.Modules);
        if (contentError != null) return BadRequest(new { error = contentError });
        var quizError = CourseQuizEvaluator.ValidatePublishedQuizzes(dto.Modules?.GetRawText());
        if (quizError != null) return BadRequest(new { error = quizError });
        CourseMapper.ApplyUpdate(c, dto, CurrentUserId!);
        _db.CourseVersions.Add(new CorseWeb.Server.Models.CourseVersion
        {
            CourseId = c.Id, Version = c.Version,
            SnapshotJson = JsonSerializer.Serialize(CourseMapper.ToDto(c)),
            Changelog = dto.Changelog,
            CreatedBy = CurrentUserId!
        });
        await _db.SaveChangesAsync();
        return Ok(CourseMapper.ToDto(c));
    }

    [Authorize]
    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug)
    {
        var c = await _db.Courses.FirstOrDefaultAsync(x => x.Slug == slug);
        if (c == null) return NotFound();
        if (!IsAdmin && c.AuthorId != CurrentUserId) return Forbid();
        _db.Courses.Remove(c);
        // remove versões associadas
        var versions = _db.CourseVersions.Where(v => v.CourseId == c.Id);
        _db.CourseVersions.RemoveRange(versions);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [HttpGet("{slug}/versions")]
    public async Task<IActionResult> Versions(string slug)
    {
        var c = await _db.Courses.FirstOrDefaultAsync(x => x.Slug == slug);
        if (c == null) return NotFound();
        if (c.Status != "publicado" && !IsAdmin && c.AuthorId != CurrentUserId) return NotFound();
        var list = await _db.CourseVersions.Where(v => v.CourseId == c.Id).OrderByDescending(v => v.Version).Take(50).ToListAsync();
        return Ok(list.Select(v => new { v.Id, v.CourseId, v.Version, v.Changelog, v.CreatedBy, v.CreatedAt }));
    }

    [Authorize]
    [HttpPost("{slug}/publish")]
    public async Task<IActionResult> PublishToggle(string slug, [FromBody] PublishRequest? body)
    {
        var c = await _db.Courses.FirstOrDefaultAsync(x => x.Slug == slug);
        if (c == null) return NotFound();
        if (!IsAdmin && c.AuthorId != CurrentUserId) return Forbid();
        var target = body?.Status;
        if (string.IsNullOrWhiteSpace(target))
            target = c.Status == "publicado" ? "rascunho" : "publicado";
        // na arquitetura nova, rasacunho publicado volta como Course status mas histórico diz; 
        // se quiser mover para rascunho, mantemos como arquivar ou voltar a draft — aqui só alterna status ou arquiva
        if (target != "publicado" && target != "arquivado" && target != "rascunho")
            return BadRequest(new { error = "Status inválido" });
        if (target == "publicado")
        {
            var contentError = CourseContentValidator.ValidateJson(c.ModulesJson);
            if (contentError != null) return BadRequest(new { error = contentError });
            var quizError = CourseQuizEvaluator.ValidatePublishedQuizzes(c.ModulesJson);
            if (quizError != null) return BadRequest(new { error = quizError });
        }
        var changed = CourseVersioning.ApplyStatusTransition(c, target, CurrentUserId!);
        if (!changed)
            return Ok(CourseMapper.ToDto(c));

        // EF Core persists the course update and its immutable version snapshot
        // in one SaveChanges transaction.
        _db.CourseVersions.Add(CourseVersioning.CreateSnapshot(c, CurrentUserId!));
        await _db.SaveChangesAsync();
        return Ok(CourseMapper.ToDto(c));
    }

    public record PublishRequest(string? Status);
}
