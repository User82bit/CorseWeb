namespace CorseWeb.Server.Helpers;

public static class SlugHelper
{
    public static string Slugify(string input, int maxLen = 60)
    {
        if (string.IsNullOrWhiteSpace(input)) return $"curso-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
        var s = input.ToLowerInvariant().Normalize(System.Text.NormalizationForm.FormD);
        var sb = new System.Text.StringBuilder();
        foreach (var c in s)
        {
            var cat = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
            if (cat == System.Globalization.UnicodeCategory.NonSpacingMark) continue;
            sb.Append(c);
        }
        var cleaned = System.Text.RegularExpressions.Regex.Replace(sb.ToString(), @"[^a-z0-9]+", "-").Trim('-');
        if (cleaned.Length > maxLen) cleaned = cleaned[..maxLen].Trim('-');
        return string.IsNullOrWhiteSpace(cleaned) ? $"curso-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}" : cleaned;
    }

    public static string EnsureUnique(string baseSlug, Func<string, bool> exists)
    {
        var slug = baseSlug;
        var n = 1;
        while (exists(slug)) slug = $"{baseSlug}-{++n}";
        return slug;
    }
}
