using System.Security.Claims;
using System.Net.Mail;
using Microsoft.AspNetCore.Identity;
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
    private readonly IPasswordHasher<AppUser> _passwordHasher;

    public AuthController(
        AppDbContext db,
        IConfiguration config,
        IWebHostEnvironment env,
        ILogger<AuthController> logger,
        IPasswordHasher<AppUser> passwordHasher)
    {
        _db = db;
        _config = config;
        _env = env;
        _logger = logger;
        _passwordHasher = passwordHasher;
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

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] LocalRegisterRequest req)
    {
        if (req == null) return BadRequest(new { error = "Dados de cadastro inválidos." });

        var name = req.Name?.Trim();
        var email = req.Email?.Trim().ToLowerInvariant();
        var password = req.Password;

        if (string.IsNullOrWhiteSpace(name) || name.Length < 2 || name.Length > 80)
            return BadRequest(new { error = "Informe um nome entre 2 e 80 caracteres." });

        if (string.IsNullOrWhiteSpace(email) ||
            !MailAddress.TryCreate(email, out var parsedEmail) ||
            !string.Equals(parsedEmail.Address, email, StringComparison.OrdinalIgnoreCase) ||
            email.Length > 254)
            return BadRequest(new { error = "Informe um e-mail válido." });

        if (string.IsNullOrEmpty(password) || password.Length < 8 || password.Length > 128)
            return BadRequest(new { error = "A senha deve ter entre 8 e 128 caracteres." });

        var alreadyExists = await _db.Users.AnyAsync(user => user.Email.ToLower() == email);
        if (alreadyExists)
            return Conflict(new { error = "Este e-mail já está cadastrado. Entre com sua conta existente ou use o Google." });

        var user = new AppUser
        {
            Id = $"local-{Guid.NewGuid():N}",
            Email = email,
            Name = name,
            Role = AdminHelper.ResolveRole(email, _config),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, password);

        _db.Users.Add(user);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            _logger.LogInformation(ex, "Cadastro local não concluído; possível conflito de e-mail.");
            return Conflict(new { error = "Não foi possível criar a conta com esse e-mail. Confira os dados ou entre na conta existente." });
        }

        await SignInAsync(user);
        return Ok(new UserDto(user.Id, user.Name, user.Email, user.AvatarUrl, user.Role));
    }

    [HttpPost("local-login")]
    public async Task<IActionResult> LocalLogin([FromBody] LocalLoginRequest req)
    {
        if (req == null || string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrEmpty(req.Password))
            return BadRequest(new { error = "Informe e-mail e senha." });

        var email = req.Email.Trim().ToLowerInvariant();
        if (!MailAddress.TryCreate(email, out var parsedEmail) ||
            !string.Equals(parsedEmail.Address, email, StringComparison.OrdinalIgnoreCase) ||
            email.Length > 254)
            return BadRequest(new { error = "Informe um e-mail válido." });

        var user = await _db.Users.FirstOrDefaultAsync(candidate => candidate.Email.ToLower() == email);
        if (user?.PasswordHash is not { Length: > 0 } passwordHash)
            return Unauthorized(new { error = "E-mail ou senha incorretos." });

        var verification = _passwordHasher.VerifyHashedPassword(user, passwordHash, req.Password);
        if (verification == PasswordVerificationResult.Failed)
            return Unauthorized(new { error = "E-mail ou senha incorretos." });

        var expectedRole = AdminHelper.ResolveRole(user.Email, _config);
        var changed = false;
        if (user.Role != expectedRole)
        {
            user.Role = expectedRole;
            changed = true;
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, req.Password);
            changed = true;
        }

        if (changed)
        {
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

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
