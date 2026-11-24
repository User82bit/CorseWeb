using System.Text.Json;
using CorseWeb.Server.CorseLight;

namespace CorseWeb.Server.Helpers;

public sealed record ClScriptDefinition(
    string Id,
    string Name,
    bool Enabled,
    string Source,
    ClProgram Program);

public static class CorseLightValidator
{
    private static readonly HashSet<string> AllowedEvents = new(StringComparer.Ordinal)
    {
        "lesson.start", "lesson.finish", "activity.submit"
    };

    private static readonly HashSet<string> ContextKeys = new(StringComparer.Ordinal)
    {
        "course.id", "lesson.id", "activity.id", "event.name", "student.locale"
    };

    private static readonly HashSet<string> PassiveNodeTypes = new(StringComparer.Ordinal)
    {
        "heading", "paragraph", "list", "image", "video", "code", "callout", "divider", "embed"
    };

    public static IReadOnlyList<ClDiagnostic> ValidateScriptsJson(string? scriptsJson, string? modulesJson)
    {
        var diagnostics = new List<ClDiagnostic>();
        JsonDocument? document = null;
        try
        {
            document = JsonDocument.Parse(string.IsNullOrWhiteSpace(scriptsJson) ? "[]" : scriptsJson);
            if (document.RootElement.ValueKind != JsonValueKind.Array)
            {
                diagnostics.Add(Diagnostic("CL_SCRIPTS_NOT_ARRAY", "scripts precisa ser um array.", 1, 1));
                return diagnostics;
            }

            var scripts = document.RootElement;
            if (scripts.GetArrayLength() > 100)
                diagnostics.Add(Diagnostic("CL_SCRIPT_COUNT_LIMIT", "Um curso pode conter até 100 scripts.", 1, 1));

            var nodeTypes = ReadNodeTypes(modulesJson);
            var ids = new HashSet<string>(StringComparer.Ordinal);
            var index = 0;
            foreach (var script in scripts.EnumerateArray())
            {
                index++;
                if (script.ValueKind != JsonValueKind.Object)
                {
                    diagnostics.Add(Diagnostic("CL_SCRIPT_INVALID", $"O script #{index} precisa ser um objeto.", 1, 1));
                    continue;
                }

                var id = ReadString(script, "id");
                var name = ReadString(script, "name");
                var language = ReadString(script, "language");
                var languageVersion = ReadString(script, "languageVersion");
                var source = ReadString(script, "source");
                var enabled = TryGet(script, "enabled", out var enabledElement)
                    && enabledElement.ValueKind is JsonValueKind.True or JsonValueKind.False;

                if (string.IsNullOrWhiteSpace(id))
                    diagnostics.Add(Diagnostic("CL_SCRIPT_ID_REQUIRED", $"O script #{index} precisa de um id.", 1, 1));
                else if (!ids.Add(id))
                    diagnostics.Add(Diagnostic("CL_DUPLICATE_SCRIPT_ID", $"O id '{id}' está duplicado no curso.", 1, 1));

                if (string.IsNullOrWhiteSpace(name) || name.Length > 120)
                    diagnostics.Add(Diagnostic("CL_SCRIPT_NAME_INVALID", $"O nome do script #{index} deve ter de 1 a 120 caracteres.", 1, 1));
                if (!string.Equals(language, "CL", StringComparison.Ordinal))
                    diagnostics.Add(Diagnostic("CL_LANGUAGE_UNSUPPORTED", $"O script '{id ?? index.ToString()}' precisa usar language 'CL'.", 1, 1));
                if (!string.Equals(languageVersion, "0.1", StringComparison.Ordinal))
                    diagnostics.Add(Diagnostic("CL_VERSION_UNSUPPORTED", $"A versão do script '{id ?? index.ToString()}' precisa ser '0.1'.", 1, 1));
                if (!enabled)
                    diagnostics.Add(Diagnostic("CL_ENABLED_REQUIRED", $"O campo enabled do script '{id ?? index.ToString()}' precisa ser boolean.", 1, 1));
                if (source == null)
                {
                    diagnostics.Add(Diagnostic("CL_SOURCE_REQUIRED", $"O script '{id ?? index.ToString()}' precisa ter source string.", 1, 1));
                    continue;
                }

                var parsed = CorseLightParser.Parse(source);
                if (!parsed.Success || parsed.Program == null)
                {
                    if (parsed.Diagnostic != null) diagnostics.Add(parsed.Diagnostic);
                    continue;
                }

                var eventNames = new HashSet<string>(StringComparer.Ordinal);
                foreach (var eventBlock in parsed.Program.Events)
                {
                    if (!AllowedEvents.Contains(eventBlock.EventName))
                    {
                        diagnostics.Add(new ClDiagnostic(
                            "CL_UNKNOWN_EVENT",
                            $"O evento '{eventBlock.EventName}' não existe na v0.1.",
                            eventBlock.Line, eventBlock.Column, eventBlock.Line, eventBlock.Column + eventBlock.EventName.Length + 3));
                        continue;
                    }

                    if (!eventNames.Add(eventBlock.EventName))
                    {
                        diagnostics.Add(new ClDiagnostic(
                            "CL_DUPLICATE_EVENT",
                            $"O evento '{eventBlock.EventName}' aparece mais de uma vez neste script.",
                            eventBlock.Line, eventBlock.Column, eventBlock.Line, eventBlock.Column + eventBlock.EventName.Length + 3));
                    }

                    ValidateStatements(eventBlock.Statements, eventBlock.EventName, nodeTypes, diagnostics);
                }
            }
        }
        catch (JsonException)
        {
            diagnostics.Add(Diagnostic("CL_SCRIPTS_INVALID_JSON", "scripts contém JSON inválido.", 1, 1));
        }
        finally
        {
            document?.Dispose();
        }

        return diagnostics;
    }

    public static IReadOnlyList<ClScriptDefinition> ReadEnabledScripts(string? scriptsJson)
    {
        var definitions = new List<ClScriptDefinition>();
        try
        {
            using var document = JsonDocument.Parse(string.IsNullOrWhiteSpace(scriptsJson) ? "[]" : scriptsJson);
            if (document.RootElement.ValueKind != JsonValueKind.Array) return definitions;

            foreach (var item in document.RootElement.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object
                    || !TryGet(item, "enabled", out var enabled)
                    || enabled.ValueKind != JsonValueKind.True
                    || ReadString(item, "id") is not { Length: > 0 } id
                    || ReadString(item, "name") is not { Length: > 0 } name
                    || !string.Equals(ReadString(item, "language"), "CL", StringComparison.Ordinal)
                    || !string.Equals(ReadString(item, "languageVersion"), "0.1", StringComparison.Ordinal)
                    || ReadString(item, "source") is not { } source)
                {
                    continue;
                }

                var parsed = CorseLightParser.Parse(source);
                if (parsed.Program != null && parsed.Diagnostic == null)
                    definitions.Add(new ClScriptDefinition(id, name, true, source, parsed.Program));
            }
        }
        catch (JsonException)
        {
            // Invalid drafts and legacy data never execute.
        }
        return definitions;
    }

    public static IReadOnlyDictionary<string, string> GetLessonNodeTypes(string? modulesJson, string lessonId)
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        try
        {
            using var document = JsonDocument.Parse(string.IsNullOrWhiteSpace(modulesJson) ? "[]" : modulesJson);
            if (document.RootElement.ValueKind != JsonValueKind.Array) return result;
            foreach (var module in document.RootElement.EnumerateArray())
            {
                if (!TryGet(module, "lessons", out var lessons) || lessons.ValueKind != JsonValueKind.Array) continue;
                foreach (var lesson in lessons.EnumerateArray())
                {
                    if (!string.Equals(ReadString(lesson, "id"), lessonId, StringComparison.Ordinal)
                        || !TryGet(lesson, "nodes", out var nodes)
                        || nodes.ValueKind != JsonValueKind.Array) continue;
                    foreach (var node in nodes.EnumerateArray())
                    {
                        var id = ReadString(node, "id");
                        var type = ReadString(node, "type");
                        if (!string.IsNullOrWhiteSpace(id) && !string.IsNullOrWhiteSpace(type))
                            result[id] = type;
                    }
                    return result;
                }
            }
        }
        catch (JsonException) { }
        return result;
    }

    private static Dictionary<string, HashSet<string>> ReadNodeTypes(string? modulesJson)
    {
        var result = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
        try
        {
            using var document = JsonDocument.Parse(string.IsNullOrWhiteSpace(modulesJson) ? "[]" : modulesJson);
            if (document.RootElement.ValueKind != JsonValueKind.Array) return result;
            foreach (var module in document.RootElement.EnumerateArray())
            {
                if (!TryGet(module, "lessons", out var lessons) || lessons.ValueKind != JsonValueKind.Array) continue;
                foreach (var lesson in lessons.EnumerateArray())
                {
                    if (!TryGet(lesson, "nodes", out var nodes) || nodes.ValueKind != JsonValueKind.Array) continue;
                    foreach (var node in nodes.EnumerateArray())
                    {
                        var id = ReadString(node, "id");
                        var type = ReadString(node, "type");
                        if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(type)) continue;
                        if (!result.TryGetValue(id, out var types))
                        {
                            types = new HashSet<string>(StringComparer.Ordinal);
                            result[id] = types;
                        }
                        types.Add(type);
                    }
                }
            }
        }
        catch (JsonException) { }
        return result;
    }

    private static void ValidateStatements(
        IReadOnlyList<ClStatement> statements,
        string eventName,
        IReadOnlyDictionary<string, HashSet<string>> nodeTypes,
        List<ClDiagnostic> diagnostics)
    {
        foreach (var statement in statements)
        {
            switch (statement)
            {
                case ClCallStatement call:
                    _ = ValidateCall(call.Call, eventName, nodeTypes, diagnostics);
                    break;
                case ClIfStatement conditional:
                    var conditionType = ValidateExpression(conditional.Condition, eventName, nodeTypes, diagnostics);
                    RequireType(conditionType, ValueType.Boolean, conditional.Condition, diagnostics,
                        "A condição de if precisa resultar em boolean.");
                    ValidateStatements(conditional.Then, eventName, nodeTypes, diagnostics);
                    ValidateStatements(conditional.Else, eventName, nodeTypes, diagnostics);
                    break;
            }
        }
    }

    private static ValueType ValidateExpression(
        ClExpression expression,
        string eventName,
        IReadOnlyDictionary<string, HashSet<string>> nodeTypes,
        List<ClDiagnostic> diagnostics)
    {
        switch (expression)
        {
            case ClLiteralExpression literal:
                return literal.Value switch
                {
                    string => ValueType.String,
                    double => ValueType.Number,
                    bool => ValueType.Boolean,
                    null => ValueType.Null,
                    _ => ValueType.Unknown
                };
            case ClCallExpression call:
                return ValidateCall(call, eventName, nodeTypes, diagnostics);
            case ClUnaryExpression unary:
                var operandType = ValidateExpression(unary.Operand, eventName, nodeTypes, diagnostics);
                RequireType(operandType, ValueType.Boolean, unary.Operand, diagnostics, "O operador ! exige boolean.");
                return ValueType.Boolean;
            case ClBinaryExpression binary:
                var left = ValidateExpression(binary.Left, eventName, nodeTypes, diagnostics);
                var right = ValidateExpression(binary.Right, eventName, nodeTypes, diagnostics);
                if (binary.Operator is "&&" or "||")
                {
                    RequireType(left, ValueType.Boolean, binary.Left, diagnostics, $"O operador {binary.Operator} exige boolean.");
                    RequireType(right, ValueType.Boolean, binary.Right, diagnostics, $"O operador {binary.Operator} exige boolean.");
                    return ValueType.Boolean;
                }
                if (binary.Operator is "<" or "<=" or ">" or ">=")
                {
                    RequireType(left, ValueType.Number, binary.Left, diagnostics, "Comparações relacionais exigem números.");
                    RequireType(right, ValueType.Number, binary.Right, diagnostics, "Comparações relacionais exigem números.");
                    return ValueType.Boolean;
                }
                if (binary.Operator is "==" or "!=")
                {
                    if (left != ValueType.Dynamic && right != ValueType.Dynamic
                        && left != right && !(left == ValueType.Null && right == ValueType.Null))
                    {
                        diagnostics.Add(At("CL_TYPE_MISMATCH", "Igualdade exige valores do mesmo tipo.", binary));
                    }
                    return ValueType.Boolean;
                }
                return ValueType.Unknown;
            default:
                return ValueType.Unknown;
        }
    }

    private static ValueType ValidateCall(
        ClCallExpression call,
        string eventName,
        IReadOnlyDictionary<string, HashSet<string>> nodeTypes,
        List<ClDiagnostic> diagnostics)
    {
        var argumentTypes = call.Arguments
            .Select(argument => ValidateExpression(argument, eventName, nodeTypes, diagnostics))
            .ToArray();

        bool Arity(int expected)
        {
            if (argumentTypes.Length == expected) return true;
            diagnostics.Add(At("CL_ARGUMENT_COUNT", $"'{call.Name}' espera {expected} argumento(s).", call));
            return false;
        }

        void RequireArgument(int index, ValueType required, string message)
        {
            if (index < argumentTypes.Length)
                RequireType(argumentTypes[index], required, call.Arguments[index], diagnostics, message);
        }

        string? Literal(int index)
        {
            if (index >= call.Arguments.Count) return null;
            return call.Arguments[index] is ClLiteralExpression { Value: string value } ? value : null;
        }

        switch (call.Name)
        {
            case "context.get":
                if (!Arity(1)) return ValueType.Unknown;
                RequireArgument(0, ValueType.String, "context.get exige uma chave string literal.");
                var contextKey = Literal(0);
                if (contextKey == null || !ContextKeys.Contains(contextKey)
                    || (contextKey == "activity.id" && eventName != "activity.submit"))
                    diagnostics.Add(At("CL_CONTEXT_KEY", "Chave context.get não permitida neste evento.", call));
                return ValueType.Dynamic;

            case "state.get":
                if (!Arity(1)) return ValueType.Unknown;
                RequireArgument(0, ValueType.String, "state.get exige chave string literal.");
                if (Literal(0) is not { Length: > 0 } getKey || System.Text.Encoding.UTF8.GetByteCount(getKey) > 64)
                    diagnostics.Add(At("CL_STATE_KEY", "A chave de estado deve ser string literal de 1 a 64 bytes.", call));
                return ValueType.Dynamic;

            case "state.set":
                if (!Arity(2)) return ValueType.Unknown;
                RequireArgument(0, ValueType.String, "state.set exige chave string literal.");
                if (Literal(0) is not { Length: > 0 } setKey || System.Text.Encoding.UTF8.GetByteCount(setKey) > 64)
                    diagnostics.Add(At("CL_STATE_KEY", "A chave de estado deve ser string literal de 1 a 64 bytes.", call));
                if (argumentTypes.Length > 1 && argumentTypes[1] == ValueType.Unknown)
                    diagnostics.Add(At("CL_STATE_VALUE_TYPE", "state.set aceita somente valores primitivos.", call));
                return ValueType.Null;

            case "state.reset":
                if (!Arity(1)) return ValueType.Unknown;
                RequireArgument(0, ValueType.String, "state.reset exige chave string literal.");
                if (Literal(0) is not { Length: > 0 } resetKey || System.Text.Encoding.UTF8.GetByteCount(resetKey) > 64)
                    diagnostics.Add(At("CL_STATE_KEY", "A chave de estado deve ser string literal de 1 a 64 bytes.", call));
                return ValueType.Null;

            case "activity.getAnswer":
                if (!Arity(0)) return ValueType.Unknown;
                RequireEvent(eventName, "activity.submit", call, diagnostics);
                return ValueType.Dynamic;

            case "activity.isCorrect":
                if (!Arity(0)) return ValueType.Unknown;
                RequireEvent(eventName, "activity.submit", call, diagnostics);
                return ValueType.Boolean;

            case "activity.feedback":
                if (!Arity(2)) return ValueType.Unknown;
                RequireArgument(0, ValueType.String, "activity.feedback exige mensagem string.");
                RequireArgument(1, ValueType.String, "activity.feedback exige tom string literal.");
                if (eventName is not ("activity.submit" or "lesson.finish"))
                    RequireEvent(eventName, "activity.submit ou lesson.finish", call, diagnostics);
                if (Literal(1) is not ("info" or "success" or "warning" or "error"))
                    diagnostics.Add(At("CL_FEEDBACK_TONE", "O tom deve ser info, success, warning ou error.", call));
                return ValueType.Null;

            case "content.show":
            case "content.hide":
                if (!Arity(1)) return ValueType.Unknown;
                RequireArgument(0, ValueType.String, $"{call.Name} exige nodeId string literal.");
                ValidatePassiveTarget(Literal(0), call, nodeTypes, diagnostics);
                return ValueType.Null;

            case "content.setText":
                if (!Arity(3)) return ValueType.Unknown;
                RequireArgument(0, ValueType.String, "content.setText exige nodeId string literal.");
                RequireArgument(1, ValueType.String, "content.setText exige field string literal.");
                RequireArgument(2, ValueType.String, "content.setText exige texto string.");
                ValidateTextTarget(Literal(0), Literal(1), call, nodeTypes, diagnostics);
                return ValueType.Null;

            default:
                diagnostics.Add(At("CL_UNKNOWN_FUNCTION", $"A função '{call.Name}' não existe na v0.1.", call));
                return ValueType.Unknown;
        }
    }

    private static void ValidatePassiveTarget(
        string? nodeId,
        ClCallExpression call,
        IReadOnlyDictionary<string, HashSet<string>> nodeTypes,
        List<ClDiagnostic> diagnostics)
    {
        if (string.IsNullOrWhiteSpace(nodeId)
            || !nodeTypes.TryGetValue(nodeId, out var types)
            || types.Any(type => !PassiveNodeTypes.Contains(type)))
        {
            diagnostics.Add(At("CL_INVALID_NODE_TARGET", "O alvo precisa ser um nó passivo existente no curso.", call));
        }
    }

    private static void ValidateTextTarget(
        string? nodeId,
        string? field,
        ClCallExpression call,
        IReadOnlyDictionary<string, HashSet<string>> nodeTypes,
        List<ClDiagnostic> diagnostics)
    {
        if (string.IsNullOrWhiteSpace(nodeId)
            || string.IsNullOrWhiteSpace(field)
            || !nodeTypes.TryGetValue(nodeId, out var types))
        {
            diagnostics.Add(At("CL_INVALID_NODE_TARGET", "O alvo de texto precisa existir no curso.", call));
            return;
        }

        var valid = types.All(type =>
            (type == "heading" && field == "content")
            || (type == "paragraph" && field == "content")
            || (type == "callout" && field is "title" or "content"));
        if (!valid)
            diagnostics.Add(At("CL_INVALID_NODE_FIELD", "Campo não permitido para o tipo de nó.", call));
    }

    private static void RequireEvent(string actual, string expected, ClExpression expression, List<ClDiagnostic> diagnostics)
    {
        if (expected == "activity.submit ou lesson.finish"
            ? actual is "activity.submit" or "lesson.finish"
            : string.Equals(actual, expected, StringComparison.Ordinal))
            return;
        diagnostics.Add(At("CL_FUNCTION_EVENT", $"A função exige o evento {expected}.", expression));
    }

    private static void RequireType(
        ValueType actual,
        ValueType expected,
        ClExpression expression,
        List<ClDiagnostic> diagnostics,
        string message)
    {
        if (actual is ValueType.Dynamic or ValueType.Unknown || actual == expected)
        {
            if (actual != ValueType.Unknown) return;
        }
        diagnostics.Add(At("CL_TYPE_MISMATCH", message, expression));
    }

    private static ClDiagnostic At(string code, string message, ClExpression expression) =>
        new(code, message, expression.Line, expression.Column, expression.Line, expression.Column + 1);

    private static ClDiagnostic Diagnostic(string code, string message, int line, int column) =>
        new(code, message, line, column, line, column + 1);

    private static string? ReadString(JsonElement element, string name) =>
        TryGet(element, name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static bool TryGet(JsonElement element, string name, out JsonElement value)
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

    private enum ValueType { Unknown, Dynamic, String, Number, Boolean, Null }
}
