using System.Security.Claims;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CorseWeb.Server.Data;
using CorseWeb.Server.Dtos;
using CorseWeb.Server.Helpers;
using CorseWeb.Server.Models;

namespace CorseWeb.Server.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext db, IConfiguration config, IWebHostEnvironment env, ILogger<AuthController> logger)
    {
        _db = db; _config = config; _env = env; _logger = logger;
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (User.Identity?.IsAuthenticated != true) return Unauthorized(new { authenticated = false });
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(id)) return Unauthorized(new { authenticated = false });
        var user = await _db.Users.FindAsync(id);
        if (user == null) return Unauthorized(new { authenticated = false });
        // refresh role if AdminEmails changed
        var expectedRole = AdminHelper.ResolveRole(user.Email, _config);
        if (user.Role != expectedRole)
        {
            user.Role = expectedRole;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            // re-issue cookie
            await SignInAsync(user);
        }
        return Ok(new UserDto(user.Id, user.Name, user.Email, user.AvatarUrl, user.Role));
    }

    [HttpGet("config")]
    public IActionResult Config()
    {
        var clientId = _config["Authentication:Google:ClientId"];
        return Ok(new { googleClientId = clientId, configured = !string.IsNullOrWhiteSpace(clientId) });
    }

    [HttpPost("google")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.IdToken)) return BadRequest(new { error = "idToken obrigatório" });
        var clientId = _config["Authentication:Google:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            return StatusCode(500, new { error = "Google ClientId não configurado no servidor. Use dev-login em Development ou configure Authentication:Google:ClientId." });

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(req.IdToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { clientId }
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Google token inválido");
            return Unauthorized(new { error = "Token Google inválido", detail = ex.Message });
        }

        if (payload == null || string.IsNullOrWhiteSpace(payload.Email) || payload.EmailVerified != true)
            return Unauthorized(new { error = "E-mail Google não verificado" });

        var user = await FindOrCreateUser(payload.Subject, payload.Email, payload.Name ?? payload.Email.Split('@')[0], payload.Picture);
        await SignInAsync(user);
        return Ok(new UserDto(user.Id, user.Name, user.Email, user.AvatarUrl, user.Role));
    }

    [HttpPost("dev-login")]
    public async Task<IActionResult> DevLogin([FromBody] DevLoginRequest req)
    {
        if (!_env.IsDevelopment()) return NotFound(new { error = "dev-login só em Development" });
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains("@")) return BadRequest(new { error = "Email inválido" });
        var email = req.Email.Trim().ToLowerInvariant();
        var name = string.IsNullOrWhiteSpace(req.Name) ? email.Split('@')[0] : req.Name!.Trim();
        var id = $"user-{email}";
        var user = await FindOrCreateUser(id, email, name, null);
        await SignInAsync(user);
        return Ok(new UserDto(user.Id, user.Name, user.Email, user.AvatarUrl, user.Role));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { ok = true });
    }

    private async Task<AppUser> FindOrCreateUser(string id, string email, string name, string? avatarUrl)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            // also check by email unique
            var byEmail = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
            if (byEmail != null)
            {
                // google id changed — keep original id but update? prefer by email identity
                user = byEmail;
                if (user.Id != id && id.StartsWith("user-") == false) // google sub differs
                {
                    // keep email identity; update Id if it's dev id? don't break FK — keep existing
                }
            }
        }
        var role = AdminHelper.ResolveRole(normalizedEmail, _config);
        if (user == null)
        {
            user = new AppUser
            {
                Id = id,
                Email = normalizedEmail,
                Name = name,
                AvatarUrl = avatarUrl,
                Role = role,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }
        else
        {
            var changed = false;
            if (user.Email != normalizedEmail) { user.Email = normalizedEmail; changed = true; }
            if (user.Name != name) { user.Name = name; changed = true; }
            if (!string.IsNullOrWhiteSpace(avatarUrl) && user.AvatarUrl != avatarUrl) { user.AvatarUrl = avatarUrl; changed = true; }
            if (user.Role != role) { user.Role = role; changed = true; }
            if (changed) { user.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync(); }
        }
        return user;
    }

    private async Task SignInAsync(AppUser user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Role, user.Role),
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal, new AuthenticationProperties
        {
            IsPersistent = true,
            ExpiresUtc = DateTimeOffset.UtcNow.AddDays(14),
            AllowRefresh = true
        });
    }
}
