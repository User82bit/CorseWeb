using System.Text.Json;

namespace CorseWeb.Server.Helpers;

/// <summary>
/// Evaluates the first Exercise contract as a text/code comparison.
/// Submitted code is never compiled or executed by the server.
/// </summary>
public static class CourseExerciseEvaluator
{
    public const int MaxAnswerLength = 20_000;

    public sealed record ExerciseDefinition(string Instruction, string StarterCode, string Solution);

    public static ExerciseDefinition? FindPublishedExercise(
        string? modulesJson,
        string lessonId,
        string exerciseNodeId)
    {
        if (string.IsNullOrWhiteSpace(modulesJson)
            || string.IsNullOrWhiteSpace(lessonId)
            || string.IsNullOrWhiteSpace(exerciseNodeId))
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
                            || !HasString(node, "id", exerciseNodeId)
                            || !HasString(node, "type", "exercise")
                            || !TryGetProperty(node, "props", out var props)
                            || props.ValueKind != JsonValueKind.Object
                            || !TryGetProperty(props, "instruction", out var instruction)
                            || instruction.ValueKind != JsonValueKind.String
                            || string.IsNullOrWhiteSpace(instruction.GetString())
                            || !TryGetProperty(props, "solution", out var solution)
                            || solution.ValueKind != JsonValueKind.String
                            || string.IsNullOrWhiteSpace(solution.GetString()))
                        {
                            continue;
                        }

                        var starterCode = TryGetProperty(props, "starterCode", out var starter)
                            && starter.ValueKind == JsonValueKind.String
                                ? starter.GetString() ?? string.Empty
                                : string.Empty;
                        var expected = solution.GetString() ?? string.Empty;
                        if (expected.Length > MaxAnswerLength || starterCode.Length > MaxAnswerLength)
                            return null;

                        return new ExerciseDefinition(instruction.GetString()!, starterCode, expected);
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

    public static string? ValidatePublishedExercises(string? modulesJson)
    {
        if (string.IsNullOrWhiteSpace(modulesJson)) return null;

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
                        || !TryGetProperty(lesson, "isPublished", out var lessonPublished)
                        || lessonPublished.ValueKind != JsonValueKind.True
                        || !TryGetProperty(lesson, "nodes", out var nodes)
                        || nodes.ValueKind != JsonValueKind.Array)
                    {
                        continue;
                    }

                    foreach (var node in nodes.EnumerateArray())
                    {
                        if (node.ValueKind != JsonValueKind.Object || !HasString(node, "type", "exercise"))
                            continue;

                        var nodeId = TryGetProperty(node, "id", out var idElement)
                            && idElement.ValueKind == JsonValueKind.String
                                ? idElement.GetString()
                                : "sem ID";
                        if (!TryGetProperty(node, "props", out var props)
                            || props.ValueKind != JsonValueKind.Object
                            || !TryGetProperty(props, "instruction", out var instruction)
                            || instruction.ValueKind != JsonValueKind.String
                            || string.IsNullOrWhiteSpace(instruction.GetString())
                            || !TryGetProperty(props, "solution", out var solution)
                            || solution.ValueKind != JsonValueKind.String
                            || string.IsNullOrWhiteSpace(solution.GetString()))
                        {
                            return $"O Exercício '{nodeId}' precisa de instrução e solução de referência.";
                        }

                        var solutionText = solution.GetString()!;
                        if (solutionText.Length > MaxAnswerLength)
                            return $"A solução do Exercício '{nodeId}' excede o limite de {MaxAnswerLength} caracteres.";
                        if (TryGetProperty(props, "starterCode", out var starter)
                            && starter.ValueKind == JsonValueKind.String
                            && (starter.GetString()?.Length ?? 0) > MaxAnswerLength)
                        {
                            return $"O código inicial do Exercício '{nodeId}' excede o limite de {MaxAnswerLength} caracteres.";
                        }
                    }
                }
            }

            return null;
        }
        catch (JsonException)
        {
            return "O conteúdo do curso contém uma definição de Exercício inválida.";
        }
    }

    public static bool IsCorrect(ExerciseDefinition exercise, string submittedAnswer)
    {
        return string.Equals(
            NormalizeAnswer(submittedAnswer),
            NormalizeAnswer(exercise.Solution),
            StringComparison.Ordinal);
    }

    /// <summary>
    /// Makes LF/CRLF equivalent and ignores trailing whitespace per line.
    /// Indentation and all non-trailing internal whitespace remain significant.
    /// </summary>
    public static string NormalizeAnswer(string answer)
    {
        var normalizedLines = (answer ?? string.Empty)
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace('\r', '\n')
            .Split('\n')
            .Select(line => line.TrimEnd());
        return string.Join("\n", normalizedLines).Trim();
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
