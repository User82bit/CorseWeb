using System.Text.Json;

namespace CorseWeb.Server.Helpers;

/// <summary>
/// Evaluates the current single-question, single-choice Quiz card contract.
/// The answer key remains inside the server's course JSON and is never returned
/// by this helper or by the student course projection.
/// </summary>
public static class CourseQuizEvaluator
{
    public sealed record QuizDefinition(IReadOnlyList<string> Options, int CorrectOptionIndex);

    public static QuizDefinition? FindPublishedQuiz(
        string? modulesJson,
        string lessonId,
        string quizNodeId)
    {
        if (string.IsNullOrWhiteSpace(modulesJson)
            || string.IsNullOrWhiteSpace(lessonId)
            || string.IsNullOrWhiteSpace(quizNodeId))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(modulesJson);
            if (document.RootElement.ValueKind != JsonValueKind.Array) return null;

            foreach (var module in document.RootElement.EnumerateArray())
            {
                if (module.ValueKind != JsonValueKind.Object) continue;
                if (TryGetProperty(module, "isPublished", out var modulePublished)
                    && modulePublished.ValueKind != JsonValueKind.True)
                {
                    continue;
                }
                if (!TryGetProperty(module, "lessons", out var lessons)
                    || lessons.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                foreach (var lesson in lessons.EnumerateArray())
                {
                    if (lesson.ValueKind != JsonValueKind.Object
                        || !HasString(lesson, "id", lessonId)
                        || !TryGetProperty(lesson, "isPublished", out var lessonPublished)
                        || lessonPublished.ValueKind != JsonValueKind.True
                        || !TryGetProperty(lesson, "nodes", out var nodes)
                        || nodes.ValueKind != JsonValueKind.Array)
                    {
                        continue;
                    }

                    foreach (var node in nodes.EnumerateArray())
                    {
                        if (node.ValueKind != JsonValueKind.Object
                            || !HasString(node, "id", quizNodeId)
                            || !HasString(node, "type", "quiz")
                            || !TryGetProperty(node, "props", out var props)
                            || props.ValueKind != JsonValueKind.Object
                            || !TryGetProperty(props, "question", out var question)
                            || question.ValueKind != JsonValueKind.String
                            || string.IsNullOrWhiteSpace(question.GetString())
                            || !TryGetProperty(props, "options", out var optionsElement)
                            || optionsElement.ValueKind != JsonValueKind.Array
                            || !TryGetProperty(props, "correctIndex", out var correctIndexElement)
                            || !correctIndexElement.TryGetInt32(out var correctIndex))
                        {
                            continue;
                        }

                        var options = optionsElement.EnumerateArray()
                            .Where(option => option.ValueKind == JsonValueKind.String)
                            .Select(option => option.GetString()?.Trim() ?? string.Empty)
                            .ToArray();

                        if (options.Length < 2
                            || options.Any(string.IsNullOrWhiteSpace)
                            || correctIndex < 0
                            || correctIndex >= options.Length)
                        {
                            return null;
                        }

                        return new QuizDefinition(options, correctIndex);
                    }
                }
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    public static IReadOnlyList<string> GetPublishedQuizNodeIds(string? modulesJson, string lessonId)
    {
        if (string.IsNullOrWhiteSpace(modulesJson) || string.IsNullOrWhiteSpace(lessonId))
            return [];

        try
        {
            using var document = JsonDocument.Parse(modulesJson);
            if (document.RootElement.ValueKind != JsonValueKind.Array) return [];

            foreach (var module in document.RootElement.EnumerateArray())
            {
                if (module.ValueKind != JsonValueKind.Object) continue;
                if (TryGetProperty(module, "isPublished", out var modulePublished)
                    && modulePublished.ValueKind != JsonValueKind.True)
                {
                    continue;
                }
                if (!TryGetProperty(module, "lessons", out var lessons)
                    || lessons.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                foreach (var lesson in lessons.EnumerateArray())
                {
                    if (lesson.ValueKind != JsonValueKind.Object
                        || !HasString(lesson, "id", lessonId)
                        || !TryGetProperty(lesson, "isPublished", out var lessonPublished)
                        || lessonPublished.ValueKind != JsonValueKind.True
                        || !TryGetProperty(lesson, "nodes", out var nodes)
                        || nodes.ValueKind != JsonValueKind.Array)
                    {
                        continue;
                    }

                    return nodes.EnumerateArray()
                        .Where(node => node.ValueKind == JsonValueKind.Object
                            && HasString(node, "type", "quiz")
                            && TryGetProperty(node, "id", out var id)
                            && id.ValueKind == JsonValueKind.String
                            && !string.IsNullOrWhiteSpace(id.GetString()))
                        .Select(node => node.GetProperty("id").GetString()!)
                        .Distinct(StringComparer.Ordinal)
                        .ToArray();
                }
            }
        }
        catch (JsonException)
        {
            return [];
        }

        return [];
    }

    public static bool IsCorrect(QuizDefinition quiz, int selectedOptionIndex)
    {
        return selectedOptionIndex >= 0
            && selectedOptionIndex < quiz.Options.Count
            && selectedOptionIndex == quiz.CorrectOptionIndex;
    }

    private static bool HasString(JsonElement element, string propertyName, string expected)
    {
        return TryGetProperty(element, propertyName, out var property)
            && property.ValueKind == JsonValueKind.String
            && string.Equals(property.GetString(), expected, StringComparison.Ordinal);
    }

    private static bool TryGetProperty(JsonElement element, string name, out JsonElement value)
    {
        if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out value))
            return true;

        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in element.EnumerateObject())
            {
                if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
                {
                    value = property.Value;
                    return true;
                }
            }
        }

        value = default;
        return false;
    }
}
