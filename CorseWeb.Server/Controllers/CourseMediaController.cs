using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CorseWeb.Server.Controllers;

[ApiController]
[Route("api/course-media")]
[Authorize]
public sealed class CourseMediaController : ControllerBase
{
    private const long MaxCoverBytes = 5 * 1024 * 1024;
    private readonly IWebHostEnvironment _environment;

    public CourseMediaController(IWebHostEnvironment environment) => _environment = environment;

    [HttpPost("covers")]
    [RequestSizeLimit(6_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 6_000_000)]
    public async Task<IActionResult> UploadCover([FromForm] IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "Selecione uma imagem para a capa." });

        if (file.Length > MaxCoverBytes)
            return BadRequest(new { error = "A imagem deve ter no máximo 5 MB." });

        await using var input = file.OpenReadStream();
        var signature = new byte[12];
        var bytesRead = await input.ReadAsync(signature.AsMemory(0, signature.Length), cancellationToken);
        var extension = GetImageExtension(signature, bytesRead);
        if (extension is null)
            return BadRequest(new { error = "Formato não suportado. Use uma imagem PNG, JPEG ou WebP." });

        var webRoot = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRoot))
            webRoot = Path.Combine(_environment.ContentRootPath, "wwwroot");

        var uploadDirectory = Path.Combine(webRoot, "uploads", "course-covers");
        Directory.CreateDirectory(uploadDirectory);

        var filename = $"{Guid.NewGuid():N}{extension}";
        var destination = Path.Combine(uploadDirectory, filename);
        input.Position = 0;
        await using (var output = new FileStream(destination, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
        {
            await input.CopyToAsync(output, cancellationToken);
        }

        return Ok(new
        {
            id = $"cover-{Guid.NewGuid():N}",
            type = "image",
            url = $"/uploads/course-covers/{filename}",
            alt = string.Empty
        });
    }

    private static string? GetImageExtension(byte[] signature, int length)
    {
        if (length >= 8
            && signature[0] == 0x89 && signature[1] == 0x50
            && signature[2] == 0x4E && signature[3] == 0x47
            && signature[4] == 0x0D && signature[5] == 0x0A
            && signature[6] == 0x1A && signature[7] == 0x0A)
            return ".png";

        if (length >= 3 && signature[0] == 0xFF && signature[1] == 0xD8 && signature[2] == 0xFF)
            return ".jpg";

        if (length >= 12
            && signature[0] == (byte)'R' && signature[1] == (byte)'I'
            && signature[2] == (byte)'F' && signature[3] == (byte)'F'
            && signature[8] == (byte)'W' && signature[9] == (byte)'E'
            && signature[10] == (byte)'B' && signature[11] == (byte)'P')
            return ".webp";

        return null;
    }
}
