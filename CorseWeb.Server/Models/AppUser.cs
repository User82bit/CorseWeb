namespace CorseWeb.Server.Models;

public class AppUser
{
    public string Id { get; set; } = default!; // google sub ou user-{email} para dev
    public string Email { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? AvatarUrl { get; set; }
    public string Role { get; set; } = "user"; // user | admin
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
