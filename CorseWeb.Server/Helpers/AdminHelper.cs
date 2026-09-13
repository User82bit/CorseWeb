using System;

namespace CorseWeb.Server.Helpers;

public static class AdminHelper
{
    public static bool IsAdminEmail(string email, IConfiguration config)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        var normalized = email.Trim().ToLowerInvariant();

        var list = config.GetSection("AdminEmails").Get<string[]>();
        if (list != null && list.Length > 0)
            return Array.Exists(list, x => x.Trim().ToLowerInvariant() == normalized);

        // fallback CSV in single string
        var csv = config["AdminEmailsCsv"] ?? config["AdminEmails"] ?? "";
        if (!string.IsNullOrWhiteSpace(csv) && !csv.Trim().StartsWith("["))
        {
            var parts = csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length > 0) return Array.Exists(parts, x => x.ToLowerInvariant() == normalized);
        }

        // dev fallback (remover em prod quando AdminEmails configurado)
        var fallback = new[] { "admin@corseweb.local" };
        var hasConfig = (list != null && list.Length > 0) || !string.IsNullOrWhiteSpace(csv);
        if (!hasConfig) return Array.Exists(fallback, x => x == normalized);
        return false;
    }

    public static string ResolveRole(string email, IConfiguration config)
        => IsAdminEmail(email, config) ? "admin" : "user";
}
