using System.Text;
using System.Text.Json;

namespace CorseWeb.Server.CorseLight;

public sealed record ClExecutionContext(
    IReadOnlyDictionary<string, object?> Values,
    string EventName,
    string LessonId,
    string? ActivityId = null,
    object? ActivityAnswer = null,
    bool? ActivityIsCorrect = null);

public sealed record ClFeedbackEffect(string Message, string Tone);
public sealed record ClNodeVisibilityEffect(string NodeId, bool Visible);
public sealed record ClNodeTextEffect(string NodeId, string Field, string Value);
public sealed record ClEffects(
    IReadOnlyList<ClFeedbackEffect> Feedback,
    IReadOnlyList<ClNodeVisibilityEffect> NodeVisibility,
    IReadOnlyList<ClNodeTextEffect> NodeText)
{
    public static ClEffects Empty { get; } = new([], [], []);
}

public sealed record ClExecutionResult(
    bool Success,
    IReadOnlyDictionary<string, object?> State,
    ClEffects Effects,
    ClDiagnostic? Diagnostic);

internal sealed class ClRuntimeException : Exception
{
    public ClDiagnostic Diagnostic { get; }

    public ClRuntimeException(string code, string message, int line, int column)
        : base(message)
    {
        Diagnostic = new ClDiagnostic(code, message, line, column, line, column + 1);
    }
}

public static class CorseLightRuntime
{
    public const int MaxNativeCalls = 256;
    public const int MaxEffects = 64;
    public const int MaxEffectsBytes = 16 * 1024;
    public const int MaxStateKeys = 64;
    public const int MaxStateValueBytes = 4 * 1024;
    public const int MaxStateBytes = 64 * 1024;
    public const int MaxFeedbackBytes = 1024;
    public const int MaxTextBytes = 4 * 1024;
    private const int MaxOperations = 4096;

    public static ClExecutionResult Execute(
        ClEventBlock eventBlock,
        IReadOnlyDictionary<string, object?> initialState,
        ClExecutionContext executionContext,
        IReadOnlyDictionary<string, string> currentLessonNodeTypes)
    {
        var state = new Dictionary<string, object?>(initialState, StringComparer.Ordinal);
        var context = new RuntimeContext(executionContext, state, currentLessonNodeTypes);
        try
        {
            ExecuteStatements(eventBlock.Statements, context, 1);
            context.ValidateLimits();
            return new ClExecutionResult(true, state, context.ToEffects(), null);
        }
        catch (ClRuntimeException exception)
        {
            // The copy is discarded on failure, so a script cannot leave partial state or effects.
            return new ClExecutionResult(false, initialState, ClEffects.Empty, exception.Diagnostic);
        }
    }

    public static object? FromJson(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.String => element.GetString(),
        JsonValueKind.Number => element.GetDouble(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Null => null,
        _ => throw new InvalidOperationException("CorseLight state only accepts primitive JSON values.")
    };

    public static string ToJson(object? value) => JsonSerializer.Serialize(value);

    private static void ExecuteStatements(IReadOnlyList<ClStatement> statements, RuntimeContext context, int depth)
    {
        if (depth > CorseLightParser.MaxDepth)
            throw context.Error("CL_DEPTH_LIMIT", $"A profundidade máxima é {CorseLightParser.MaxDepth}.", 1, 1);

        foreach (var statement in statements)
        {
            context.Step(statement.Line, statement.Column);
            switch (statement)
            {
                case ClCallStatement call:
                    _ = EvaluateCall(call.Call, context);
                    break;
                case ClIfStatement conditional:
                    var condition = RequireBoolean(
                        Evaluate(conditional.Condition, context),
                        conditional.Line,
                        conditional.Column,
                        "A condição de if precisa resultar em boolean.");
                    ExecuteStatements(condition ? conditional.Then : conditional.Else, context, depth + 1);
                    break;
                default:
                    throw context.Error("CL_INVALID_AST", "Instrução desconhecida na AST.", statement.Line, statement.Column);
            }
        }
    }

    private static object? Evaluate(ClExpression expression, RuntimeContext context)
    {
        context.Step(expression.Line, expression.Column);
        return expression switch
        {
            ClLiteralExpression literal => literal.Value,
            ClCallExpression call => EvaluateCall(call, context),
            ClUnaryExpression unary => EvaluateUnary(unary, context),
            ClBinaryExpression binary => EvaluateBinary(binary, context),
            _ => throw context.Error("CL_INVALID_AST", "Expressão desconhecida na AST.", expression.Line, expression.Column)
        };
    }

    private static object? EvaluateUnary(ClUnaryExpression expression, RuntimeContext context)
    {
        var value = Evaluate(expression.Operand, context);
        return expression.Operator switch
        {
            "!" => !RequireBoolean(value, expression.Line, expression.Column, "O operador ! exige boolean."),
            _ => throw context.Error("CL_INVALID_OPERATOR", "Operador unário inválido.", expression.Line, expression.Column)
        };
    }

    private static object? EvaluateBinary(ClBinaryExpression expression, RuntimeContext context)
    {
        var left = Evaluate(expression.Left, context);
        if (expression.Operator == "&&")
        {
            var leftBoolean = RequireBoolean(left, expression.Line, expression.Column, "O operador && exige boolean.");
            return leftBoolean && RequireBoolean(
                Evaluate(expression.Right, context), expression.Line, expression.Column, "O operador && exige boolean.");
        }
        if (expression.Operator == "||")
        {
            var leftBoolean = RequireBoolean(left, expression.Line, expression.Column, "O operador || exige boolean.");
            return leftBoolean || RequireBoolean(
                Evaluate(expression.Right, context), expression.Line, expression.Column, "O operador || exige boolean.");
        }

        var right = Evaluate(expression.Right, context);
        return expression.Operator switch
        {
            "==" => AreEqual(left, right, expression),
            "!=" => !AreEqual(left, right, expression),
            "<" => RequireNumber(left, expression) < RequireNumber(right, expression),
            "<=" => RequireNumber(left, expression) <= RequireNumber(right, expression),
            ">" => RequireNumber(left, expression) > RequireNumber(right, expression),
            ">=" => RequireNumber(left, expression) >= RequireNumber(right, expression),
            _ => throw context.Error("CL_INVALID_OPERATOR", "Operador binário inválido.", expression.Line, expression.Column)
        };
    }

    private static bool AreEqual(object? left, object? right, ClExpression expression)
    {
        if (left == null || right == null)
            return left == null && right == null;
        if (left.GetType() != right.GetType())
            throw new ClRuntimeException("CL_TYPE_MISMATCH", "Igualdade exige valores do mesmo tipo.", expression.Line, expression.Column);
        return left switch
        {
            string text when right is string other => string.Equals(text, other, StringComparison.Ordinal),
            bool boolean when right is bool other => boolean == other,
            double number when right is double other => number.Equals(other),
            _ => throw new ClRuntimeException("CL_TYPE_MISMATCH", "Somente valores primitivos podem ser comparados.", expression.Line, expression.Column)
        };
    }

    private static double RequireNumber(object? value, ClExpression expression)
    {
        return value is double number && double.IsFinite(number)
            ? number
            : throw new ClRuntimeException("CL_TYPE_MISMATCH", "Comparações relacionais exigem dois números.", expression.Line, expression.Column);
    }

    private static bool RequireBoolean(object? value, int line, int column, string message)
    {
        return value is bool boolean
            ? boolean
            : throw new ClRuntimeException("CL_TYPE_MISMATCH", message, line, column);
    }

    private static object? EvaluateCall(ClCallExpression call, RuntimeContext context)
    {
        context.NativeCall(call.Line, call.Column);
        var arguments = call.Arguments.Select(argument => Evaluate(argument, context)).ToArray();

        switch (call.Name)
        {
            case "context.get":
                RequireArity(call, arguments, 1, context);
                var contextKey = RequireString(arguments[0], call, context);
                return context.Execution.Values.TryGetValue(contextKey, out var contextValue)
                    ? contextValue
                    : null;

            case "state.get":
                RequireArity(call, arguments, 1, context);
                var getKey = RequireStateKey(arguments[0], call, context);
                return context.State.TryGetValue(getKey, out var existingValue) ? existingValue : null;

            case "state.set":
                RequireArity(call, arguments, 2, context);
                var setKey = RequireStateKey(arguments[0], call, context);
                ValidatePrimitive(arguments[1], call, context);
                var valueJson = ToJson(arguments[1]);
                if (Encoding.UTF8.GetByteCount(valueJson) > MaxStateValueBytes)
                    throw context.Error("CL_STATE_VALUE_LIMIT", $"O valor de estado excede {MaxStateValueBytes} bytes.", call.Line, call.Column);
                context.State[setKey] = arguments[1];
                context.ValidateStateLimits(call.Line, call.Column);
                return null;

            case "state.reset":
                RequireArity(call, arguments, 1, context);
                var resetKey = RequireStateKey(arguments[0], call, context);
                context.State.Remove(resetKey);
                return null;

            case "activity.getAnswer":
                RequireArity(call, arguments, 0, context);
                context.RequireActivityEvent(call);
                return context.Execution.ActivityAnswer;

            case "activity.isCorrect":
                RequireArity(call, arguments, 0, context);
                context.RequireActivityEvent(call);
                return context.Execution.ActivityIsCorrect
                    ?? throw context.Error("CL_CONTEXT_MISSING", "O resultado da atividade não está disponível.", call.Line, call.Column);

            case "activity.feedback":
                RequireArity(call, arguments, 2, context);
                var message = RequireString(arguments[0], call, context);
                var tone = RequireString(arguments[1], call, context);
                if (tone is not ("info" or "success" or "warning" or "error"))
                    throw context.Error("CL_INVALID_FEEDBACK_TONE", "Tom de feedback inválido.", call.Line, call.Column);
                if (Encoding.UTF8.GetByteCount(message) > MaxFeedbackBytes)
                    throw context.Error("CL_FEEDBACK_LIMIT", $"O feedback excede {MaxFeedbackBytes} bytes.", call.Line, call.Column);
                if (context.Execution.EventName is not ("activity.submit" or "lesson.finish"))
                    throw context.Error("CL_FUNCTION_EVENT", "activity.feedback não está disponível neste evento.", call.Line, call.Column);
                context.Feedback.Add(new ClFeedbackEffect(message, tone));
                context.ValidateLimits();
                return null;

            case "content.show":
            case "content.hide":
                RequireArity(call, arguments, 1, context);
                var nodeId = RequireString(arguments[0], call, context);
                context.RequirePassiveNode(nodeId, call);
                context.Visibility.RemoveAll(item => item.NodeId == nodeId);
                context.Visibility.Add(new ClNodeVisibilityEffect(nodeId, call.Name == "content.show"));
                context.ValidateLimits();
                return null;

            case "content.setText":
                RequireArity(call, arguments, 3, context);
                var textNodeId = RequireString(arguments[0], call, context);
                var field = RequireString(arguments[1], call, context);
                var text = RequireString(arguments[2], call, context);
                context.RequireTextField(textNodeId, field, call);
                if (Encoding.UTF8.GetByteCount(text) > MaxTextBytes)
                    throw context.Error("CL_TEXT_LIMIT", $"O texto excede {MaxTextBytes} bytes.", call.Line, call.Column);
                context.Text.RemoveAll(item => item.NodeId == textNodeId && item.Field == field);
                context.Text.Add(new ClNodeTextEffect(textNodeId, field, text));
                context.ValidateLimits();
                return null;

            default:
                throw context.Error("CL_UNKNOWN_FUNCTION", $"Função '{call.Name}' não existe na v0.1.", call.Line, call.Column);
        }
    }

    private static void RequireArity(ClCallExpression call, object?[] arguments, int expected, RuntimeContext context)
    {
        if (arguments.Length != expected)
            throw context.Error("CL_ARGUMENT_COUNT", $"'{call.Name}' espera {expected} argumento(s).", call.Line, call.Column);
    }

    private static string RequireString(object? value, ClCallExpression call, RuntimeContext context)
    {
        return value as string
            ?? throw context.Error("CL_TYPE_MISMATCH", $"'{call.Name}' exige argumento string.", call.Line, call.Column);
    }

    private static string RequireStateKey(object? value, ClCallExpression call, RuntimeContext context)
    {
        var key = RequireString(value, call, context);
        var bytes = Encoding.UTF8.GetByteCount(key);
        if (bytes is < 1 or > 64)
            throw context.Error("CL_STATE_KEY_LIMIT", "A chave de estado deve ter de 1 a 64 bytes UTF-8.", call.Line, call.Column);
        return key;
    }

    private static void ValidatePrimitive(object? value, ClCallExpression call, RuntimeContext context)
    {
        if (value is not null and not string and not bool and not double)
            throw context.Error("CL_INVALID_STATE_VALUE", "Estado aceita somente string, number, boolean ou null.", call.Line, call.Column);
        if (value is double number && !double.IsFinite(number))
            throw context.Error("CL_INVALID_STATE_VALUE", "O estado não aceita números não finitos.", call.Line, call.Column);
    }

    private sealed class RuntimeContext(
        ClExecutionContext execution,
        Dictionary<string, object?> state,
        IReadOnlyDictionary<string, string> nodeTypes)
    {
        public ClExecutionContext Execution { get; } = execution;
        public Dictionary<string, object?> State { get; } = state;
        public List<ClFeedbackEffect> Feedback { get; } = [];
        public List<ClNodeVisibilityEffect> Visibility { get; } = [];
        public List<ClNodeTextEffect> Text { get; } = [];
        private int _nativeCalls;
        private int _operations;

        public void Step(int line, int column)
        {
            _operations++;
            if (_operations > MaxOperations)
                throw Error("CL_INSTRUCTION_LIMIT", "O limite de instruções desta invocação foi excedido.", line, column);
        }

        public void NativeCall(int line, int column)
        {
            _nativeCalls++;
            if (_nativeCalls > MaxNativeCalls)
                throw Error("CL_NATIVE_CALL_LIMIT", $"O limite é {MaxNativeCalls} chamadas nativas por evento.", line, column);
        }

        public void RequireActivityEvent(ClCallExpression call)
        {
            if (!string.Equals(Execution.EventName, "activity.submit", StringComparison.Ordinal))
                throw Error("CL_FUNCTION_EVENT", $"{call.Name} só está disponível em activity.submit.", call.Line, call.Column);
        }

        public void RequirePassiveNode(string nodeId, ClCallExpression call)
        {
            if (!nodeTypes.TryGetValue(nodeId, out var type)
                || type is not ("heading" or "paragraph" or "list" or "image" or "video" or "code" or "callout" or "divider" or "embed"))
            {
                throw Error("CL_INVALID_NODE_TARGET", "O alvo não existe nesta aula ou não é um nó passivo.", call.Line, call.Column);
            }
        }

        public void RequireTextField(string nodeId, string field, ClCallExpression call)
        {
            if (!nodeTypes.TryGetValue(nodeId, out var type))
                throw Error("CL_INVALID_NODE_TARGET", "O alvo não existe nesta aula.", call.Line, call.Column);
            var allowed = (type, field) switch
            {
                ("heading", "content") => true,
                ("paragraph", "content") => true,
                ("callout", "title") => true,
                ("callout", "content") => true,
                _ => false
            };
            if (!allowed)
                throw Error("CL_INVALID_NODE_FIELD", "Campo de texto incompatível com o tipo do nó.", call.Line, call.Column);
        }

        public void ValidateStateLimits(int line = 1, int column = 1)
        {
            if (State.Count > MaxStateKeys)
                throw Error("CL_STATE_KEY_COUNT_LIMIT", $"O estado aceita até {MaxStateKeys} chaves.", line, column);
            var bytes = Encoding.UTF8.GetByteCount(JsonSerializer.Serialize(State));
            if (bytes > MaxStateBytes)
                throw Error("CL_STATE_TOTAL_LIMIT", $"O estado excede {MaxStateBytes} bytes.", line, column);
        }

        public void ValidateLimits()
        {
            var count = Feedback.Count + Visibility.Count + Text.Count;
            if (count > MaxEffects)
                throw Error("CL_EFFECT_LIMIT", $"O máximo é {MaxEffects} efeitos por script/evento.", 1, 1);
            var json = JsonSerializer.Serialize(ToEffects());
            if (Encoding.UTF8.GetByteCount(json) > MaxEffectsBytes)
                throw Error("CL_EFFECT_PAYLOAD_LIMIT", $"O payload de efeitos excede {MaxEffectsBytes} bytes.", 1, 1);
            ValidateStateLimits();
        }

        public ClEffects ToEffects() => new(Feedback.ToArray(), Visibility.ToArray(), Text.ToArray());
        public ClRuntimeException Error(string code, string message, int line, int column) =>
            new(code, message, line, column);
    }
}
