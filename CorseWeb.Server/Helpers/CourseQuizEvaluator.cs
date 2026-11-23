using System.Text.Json;
using System.Text.Json.Nodes;

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
                            .Select(option => option.ValueKind == JsonValueKind.String
                                ? option.GetString()?.Trim() ?? string.Empty
                                : string.Empty)
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

    public static string? ValidatePublishedQuizzes(string? modulesJson)
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
                        if (node.ValueKind != JsonValueKind.Object || !HasString(node, "type", "quiz"))
                            continue;

                        var nodeId = TryGetProperty(node, "id", out var idElement)
                            && idElement.ValueKind == JsonValueKind.String
                                ? idElement.GetString()
                                : "sem ID";
                        if (!TryGetProperty(node, "props", out var props)
                            || props.ValueKind != JsonValueKind.Object
                            || !TryGetProperty(props, "question", out var question)
                            || question.ValueKind != JsonValueKind.String
                            || string.IsNullOrWhiteSpace(question.GetString())
                            || !TryGetProperty(props, "options", out var options)
                            || options.ValueKind != JsonValueKind.Array)
                        {
                            return $"O Quiz '{nodeId}' precisa de pergunta e opções válidas.";
                        }

                        var optionValues = options.EnumerateArray().ToArray();
                        if (optionValues.Length < 2
                            || optionValues.Any(option => option.ValueKind != JsonValueKind.String
                                || string.IsNullOrWhiteSpace(option.GetString())))
                        {
                            return $"O Quiz '{nodeId}' precisa de pelo menos duas opções de texto não vazias.";
                        }

                        if (!TryGetProperty(props, "correctIndex", out var answer)
                            || !answer.TryGetInt32(out var correctIndex)
                            || correctIndex < 0
                            || correctIndex >= optionValues.Length)
                        {
                            return $"O Quiz '{nodeId}' precisa apontar para uma opção correta existente.";
                        }
                    }
                }
            }

            return null;
        }
        catch (JsonException)
        {
            return "O conteúdo do curso contém uma definição de Quiz inválida.";
        }
    }

    public static IReadOnlyList<string> GetPublishedQuizNodeIds(
        string? modulesJson,
        string lessonId,
        IReadOnlyDictionary<string, bool>? quizResults = null)
    {
        if (string.IsNullOrWhiteSpace(modulesJson) || string.IsNullOrWhiteSpace(lessonId))
            return [];

        try
        {
            if (JsonNode.Parse(modulesJson) is not JsonArray modules) return [];
            foreach (var module in modules.OfType<JsonObject>())
            {
                if (module["isPublished"] is JsonValue modulePublished
                    && modulePublished.TryGetValue<bool>(out var moduleIsPublished)
                    && !moduleIsPublished)
                {
                    continue;
                }
                if (module["lessons"] is not JsonArray lessons) continue;

                foreach (var lesson in lessons.OfType<JsonObject>())
                {
                    var currentLessonId = ReadString(lesson, "id");
                    var isPublished = lesson["isPublished"] is JsonValue lessonPublished
                        && lessonPublished.TryGetValue<bool>(out var published)
                        && published;
                    if (!isPublished || !string.Equals(currentLessonId, lessonId, StringComparison.Ordinal))
                        continue;

                    var projectedLesson = lesson.DeepClone() as JsonObject;
                    if (projectedLesson == null) return [];
                    StudentLessonFlowProjector.Apply(
                        projectedLesson,
                        quizResults ?? new Dictionary<string, bool>(StringComparer.Ordinal));

                    if (projectedLesson["nodes"] is not JsonArray nodes) return [];
                    return nodes.OfType<JsonObject>()
                        .Where(node => string.Equals(ReadString(node, "type"), "quiz", StringComparison.Ordinal))
                        .Select(node => ReadString(node, "id"))
                        .Where(id => !string.IsNullOrWhiteSpace(id))
                        .Select(id => id!)
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

    private static string? ReadString(JsonNode? node, string propertyName)
    {
        try
        {
            return node is JsonObject obj && obj[propertyName] is JsonValue value
                ? value.GetValue<string>()
                : null;
        }
        catch (InvalidOperationException)
        {
            return null;
        }
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
