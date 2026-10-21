namespace CorseWeb.Server.Dtos;

public record UserDto(string Id, string Name, string Email, string? AvatarUrl, string Role);

public record GoogleLoginRequest(string IdToken);

public record LocalLoginRequest(string Email, string Password);

public record LocalRegisterRequest(string Name, string Email, string Password);

public record DevLoginRequest(string Email, string? Name);
