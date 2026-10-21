namespace CorseWeb.Server.Models;

public class AppUser
{
    public string Id { get; set; } = default!; // Google sub ou ID local aleatório
    public string Email { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? AvatarUrl { get; set; }
    public string Role { get; set; } = "user"; // user | admin
    public string? PasswordHash { get; set; } // hash gerado por PasswordHasher; nunca persistir senha em texto puro
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
