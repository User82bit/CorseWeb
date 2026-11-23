using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CorseWeb.Server.Data;
using CorseWeb.Server.Dtos;

namespace CorseWeb.Server.Controllers;

[ApiController]
[Route("api/certificates")]
public class CertificatesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CertificatesController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Public verification endpoint. The unpredictable code is the public lookup key.
    /// </summary>
    [HttpGet("{verificationCode}")]
    [AllowAnonymous]
    public async Task<IActionResult> Verify(string verificationCode)
    {
        if (verificationCode.Length != 32 || !verificationCode.All(Uri.IsHexDigit))
            return NotFound(new { error = "Certificado não encontrado" });

        var normalizedCode = verificationCode.ToUpperInvariant();
        var certificate = await _db.CourseCertificates.AsNoTracking()
            .FirstOrDefaultAsync(item => item.VerificationCode == normalizedCode);

        if (certificate == null)
            return NotFound(new { error = "Certificado não encontrado" });

        return Ok(new CourseCertificatePayload(
            certificate.VerificationCode,
            certificate.StudentName,
            certificate.CourseTitle,
            certificate.AuthorName,
            certificate.CourseVersion,
            certificate.CourseCompletedAt,
            certificate.IssuedAt));
    }
}
