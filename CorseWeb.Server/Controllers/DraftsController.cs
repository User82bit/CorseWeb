using System.Text.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CorseWeb.Server.Data;
using CorseWeb.Server.Dtos;
using CorseWeb.Server.Helpers;

namespace CorseWeb.Server.Controllers;

[ApiController]
[Route("api/drafts")]
[Authorize]
public class DraftsController : ControllerBase
{
    private readonly AppDbContext _db;
    public DraftsController(AppDbContext db) { _db = db; }
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var list = await _db.CourseDrafts.Where(d => d.OwnerId == UserId).OrderByDescending(d => d.UpdatedAt).ToListAsync();
        return Ok(list.Select(CourseMapper.ToDto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id)
    {
        var d = await _db.CourseDrafts.FirstOrDefaultAsync(x => x.Id == id);
        if (d == null) return NotFound();
        if (d.OwnerId != UserId && User.FindFirstValue(ClaimTypes.Role) != "admin") return Forbid();
        return Ok(CourseMapper.ToDto(d));
    }

    [HttpGet("by-slug/{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var d = await _db.CourseDrafts.FirstOrDefaultAsync(x => x.Slug == slug && x.OwnerId == UserId);
        if (d == null) return NotFound();
        return Ok(CourseMapper.ToDto(d));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DraftCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Trim().Length < 3) return BadRequest(new { error = "Título mínimo 3" });
        if (string.IsNullOrWhiteSpace(dto.Description) || dto.Description.Trim().Length < 20) return BadRequest(new { error = "Descrição mínima 20" });
        var baseSlug = !string.IsNullOrWhiteSpace(dto.Slug) ? SlugHelper.Slugify(dto.Slug!) : SlugHelper.Slugify(dto.Title);
        var mine = await _db.CourseDrafts.Where(d => d.OwnerId == UserId).Select(d => d.Slug).ToListAsync();
        var publishedSlugs = await _db.Courses.Select(c => c.Slug).ToListAsync();
        var taken = new HashSet<string>(mine.Concat(publishedSlugs));
        var slug = SlugHelper.EnsureUnique(baseSlug, s => taken.Contains(s));
        var id = $"draft-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString()[..6]}";
        var draft = CourseMapper.FromDraftCreate(dto, UserId, slug, id);
        _db.CourseDrafts.Add(draft);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = draft.Id }, CourseMapper.ToDto(draft));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] DraftUpdateDto dto)
    {
        var d = await _db.CourseDrafts.FirstOrDefaultAsync(x => x.Id == id);
        if (d == null) return NotFound();
        if (d.OwnerId != UserId) return Forbid();
        // se alterar slug, garantir unicidade
        if (dto.Slug != null)
        {
            var desired = SlugHelper.Slugify(dto.Slug);
            if (desired != d.Slug)
            {
                var mine = await _db.CourseDrafts.Where(x => x.OwnerId == UserId && x.Id != id).Select(x => x.Slug).ToListAsync();
                var published = await _db.Courses.Select(c => c.Slug).ToListAsync();
                var taken = new HashSet<string>(mine.Concat(published));
                desired = SlugHelper.EnsureUnique(desired, s => taken.Contains(s));
                dto = dto with { Slug = desired };
            }
        }
        CourseMapper.ApplyDraftUpdate(d, dto);
        await _db.SaveChangesAsync();
        return Ok(CourseMapper.ToDto(d));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var d = await _db.CourseDrafts.FirstOrDefaultAsync(x => x.Id == id);
        if (d == null) return NotFound();
        if (d.OwnerId != UserId && User.FindFirstValue(ClaimTypes.Role) != "admin") return Forbid();
        _db.CourseDrafts.Remove(d);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [HttpPost("{id}/publish")]
    public async Task<IActionResult> Publish(string id)
    {
        var d = await _db.CourseDrafts.FirstOrDefaultAsync(x => x.Id == id);
        if (d == null) return NotFound();
        if (d.OwnerId != UserId && User.FindFirstValue(ClaimTypes.Role) != "admin") return Forbid();

        var user = await _db.Users.FindAsync(UserId);
        if (user == null) return Unauthorized();

        // se é edição de curso existente (SourceCourseId)
        if (!string.IsNullOrWhiteSpace(d.SourceCourseId))
        {
            var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == d.SourceCourseId);
            if (course == null) return NotFound(new { error = "Curso origem não encontrado" });
            if (course.AuthorId != UserId && User.FindFirstValue(ClaimTypes.Role) != "admin") return Forbid();
            // aplica draft no course
            course.Title = d.Title;
            course.Subtitle = d.Subtitle;
            course.Description = d.Description;
            course.ShortDescription = d.ShortDescription;
            course.ThumbnailJson = d.ThumbnailJson;
            course.Category = d.Category;
            course.TagsJson = d.TagsJson;
            course.Level = d.Level;
            course.Language = d.Language;
            course.ModulesJson = d.ModulesJson;
            course.TotalModules = d.TotalModules;
            course.TotalLessons = d.TotalLessons;
            course.TotalMinutes = d.TotalMinutes;
            course.AllowComments = d.AllowComments;
            course.AllowFork = d.AllowFork;
            course.UpdatedAt = DateTime.UtcNow;
            course.UpdatedBy = UserId;
            course.Version += 1;
            course.Status = "publicado";

            _db.CourseVersions.Add(new CorseWeb.Server.Models.CourseVersion
            {
                CourseId = course.Id, Version = course.Version,
                SnapshotJson = JsonSerializer.Serialize(CourseMapper.ToDto(course)),
                CreatedBy = UserId
            });
            _db.CourseDrafts.Remove(d);
            await _db.SaveChangesAsync();
            return Ok(CourseMapper.ToDto(course));
        }

        // novo curso a partir do rascunho
        var slug = d.Slug;
        var existingSlugs = await _db.Courses.Select(c => c.Slug).ToListAsync();
        if (existingSlugs.Contains(slug))
        {
            slug = SlugHelper.EnsureUnique(slug, s => existingSlugs.Contains(s));
        }
        var newId = $"course-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString()[..6]}";
        var courseNew = new CorseWeb.Server.Models.Course
        {
            Id = newId, Slug = slug, Title = d.Title, Subtitle = d.Subtitle, Description = d.Description,
            ShortDescription = d.ShortDescription, ThumbnailJson = d.ThumbnailJson, Category = d.Category,
            TagsJson = d.TagsJson, Level = d.Level, Language = d.Language, ModulesJson = d.ModulesJson,
            TotalModules = d.TotalModules, TotalLessons = d.TotalLessons, TotalMinutes = d.TotalMinutes,
            AllowComments = d.AllowComments, AllowFork = d.AllowFork, IsFeatured = false,
            AuthorId = UserId, AuthorName = user.Name, AuthorAvatarJson = user.AvatarUrl != null ? $"{{\"url\":\"{user.AvatarUrl}\"}}" : null,
            Version = 1, Status = "publicado", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
            CreatedBy = UserId, UpdatedBy = UserId
        };
        _db.Courses.Add(courseNew);
        _db.CourseVersions.Add(new CorseWeb.Server.Models.CourseVersion
        {
            CourseId = courseNew.Id, Version = courseNew.Version,
            SnapshotJson = JsonSerializer.Serialize(CourseMapper.ToDto(courseNew)),
            CreatedBy = UserId
        });
        _db.CourseDrafts.Remove(d);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = courseNew.Id }, CourseMapper.ToDto(courseNew));
    }
}
