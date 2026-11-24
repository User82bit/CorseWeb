using System.Globalization;
using System.Text;
using System.Text.Json;

namespace CorseWeb.Server.CorseLight;

public sealed record ClDiagnostic(
    string Code,
    string Message,
    int Line,
    int Column,
    int EndLine,
    int EndColumn,
    string Severity = "error");

public sealed record ClParseResult(ClProgram? Program, ClDiagnostic? Diagnostic)
{
    public bool Success => Program != null && Diagnostic == null;
}

public sealed record ClProgram(IReadOnlyList<ClEventBlock> Events, int NodeCount, int MaxDepth);

public sealed record ClEventBlock(string EventName, IReadOnlyList<ClStatement> Statements, int Line, int Column);

public abstract record ClStatement(int Line, int Column);
public sealed record ClCallStatement(ClCallExpression Call, int Line, int Column) : ClStatement(Line, Column);
public sealed record ClIfStatement(ClExpression Condition, IReadOnlyList<ClStatement> Then, IReadOnlyList<ClStatement> Else, int Line, int Column) : ClStatement(Line, Column);

public abstract record ClExpression(int Line, int Column);
public sealed record ClLiteralExpression(object? Value, int Line, int Column) : ClExpression(Line, Column);
public sealed record ClCallExpression(string Name, IReadOnlyList<ClExpression> Arguments, int Line, int Column) : ClExpression(Line, Column);
public sealed record ClUnaryExpression(string Operator, ClExpression Operand, int Line, int Column) : ClExpression(Line, Column);
public sealed record ClBinaryExpression(string Operator, ClExpression Left, ClExpression Right, int Line, int Column) : ClExpression(Line, Column);

internal enum ClTokenKind
{
    Identifier, Number, String,
    LeftParen, RightParen, LeftBrace, RightBrace,
    Comma, Semicolon, Dot,
    Bang, Less, LessEqual, Greater, GreaterEqual, EqualEqual, BangEqual,
    AndAnd, OrOr, End
}

internal sealed record ClToken(ClTokenKind Kind, string Text, int Line, int Column, int EndLine, int EndColumn);

internal sealed class ClSyntaxException : Exception
{
    public ClDiagnostic Diagnostic { get; }
    public ClSyntaxException(string code, string message, ClToken token)
        : base(message)
    {
        Diagnostic = new ClDiagnostic(code, message, token.Line, token.Column, token.EndLine, token.EndColumn);
    }
}

public static class CorseLightParser
{
    public const int MaxSourceBytes = 16 * 1024;
    public const int MaxAstNodes = 1000;
    public const int MaxDepth = 16;

    public static ClParseResult Parse(string? source)
    {
        source ??= string.Empty;
        if (Encoding.UTF8.GetByteCount(source) > MaxSourceBytes)
            return new ClParseResult(null, new ClDiagnostic(
                "CL_SOURCE_TOO_LARGE", $"A fonte excede {MaxSourceBytes} bytes UTF-8.", 1, 1, 1, 1));

        try
        {
            var tokens = new ClLexer(source).Tokenize();
            var parser = new Parser(tokens);
            return new ClParseResult(parser.ParseProgram(), null);
        }
        catch (ClSyntaxException exception)
        {
            return new ClParseResult(null, exception.Diagnostic);
        }
        catch (JsonException)
        {
            return new ClParseResult(null, new ClDiagnostic(
                "CL_INVALID_STRING_ESCAPE", "A string contém um escape JSON inválido.", 1, 1, 1, 1));
        }
    }

    private sealed class Parser
    {
        private readonly IReadOnlyList<ClToken> _tokens;
        private int _current;
        private int _nodeCount;
        private int _maxDepth;

        public Parser(IReadOnlyList<ClToken> tokens) => _tokens = tokens;

        public ClProgram ParseProgram()
        {
            var events = new List<ClEventBlock>();
            while (!Check(ClTokenKind.End))
            {
                var start = Peek();
                ExpectIdentifier("on", "Esperado 'on' antes do nome do evento.");
                var first = Expect(ClTokenKind.Identifier, "Esperado o nome do evento.");
                Expect(ClTokenKind.Dot, "O nome do evento deve ter o formato grupo.nome.");
                var second = Expect(ClTokenKind.Identifier, "Esperado o nome do evento após o ponto.");
                var eventName = $"{first.Text}.{second.Text}";
                var statements = ParseBlock(1);
                events.Add(new ClEventBlock(eventName, statements, start.Line, start.Column));
                CountNode(start);
            }

            if (events.Count == 0)
                throw Error("CL_EMPTY_PROGRAM", "O script precisa declarar pelo menos um bloco 'on event'.", Peek());

            if (_nodeCount > MaxAstNodes)
                throw Error("CL_AST_TOO_LARGE", $"A AST excede {MaxAstNodes} nós.", Peek());

            return new ClProgram(events, _nodeCount, _maxDepth);
        }

        private IReadOnlyList<ClStatement> ParseBlock(int depth)
        {
            var open = Expect(ClTokenKind.LeftBrace, "Esperado '{' para iniciar o bloco.");
            _maxDepth = Math.Max(_maxDepth, depth);
            if (depth > MaxDepth)
                throw Error("CL_DEPTH_LIMIT", $"A profundidade máxima é {MaxDepth}.", open);

            var statements = new List<ClStatement>();
            while (!Check(ClTokenKind.RightBrace) && !Check(ClTokenKind.End))
            {
                if (MatchIdentifier("if"))
                {
                    var token = Previous();
                    Expect(ClTokenKind.LeftParen, "Esperado '(' após if.");
                    var condition = ParseExpression();
                    Expect(ClTokenKind.RightParen, "Esperado ')' após condição.");
                    var thenStatements = ParseBlock(depth + 1);
                    IReadOnlyList<ClStatement> elseStatements = Array.Empty<ClStatement>();
                    if (MatchIdentifier("else"))
                        elseStatements = ParseBlock(depth + 1);
                    statements.Add(new ClIfStatement(condition, thenStatements, elseStatements, token.Line, token.Column));
                    CountNode(token);
                    continue;
                }

                var expression = ParseExpression();
                if (expression is not ClCallExpression call)
                    throw Error("CL_EXPECTED_CALL", "Uma instrução deve ser uma chamada nativa ou um bloco if.", Peek());
                Expect(ClTokenKind.Semicolon, "Esperado ';' após a chamada nativa.");
                statements.Add(new ClCallStatement(call, call.Line, call.Column));
                CountNode(Peek());
            }

            Expect(ClTokenKind.RightBrace, "Esperado '}' para encerrar o bloco.");
            CountNode(open);
            return statements;
        }

        private ClExpression ParseExpression() => ParseOr();

        private ClExpression ParseOr()
        {
            var expression = ParseAnd();
            while (Match(ClTokenKind.OrOr))
            {
                var token = Previous();
                expression = new ClBinaryExpression("||", expression, ParseAnd(), token.Line, token.Column);
                CountNode(token);
            }
            return expression;
        }

        private ClExpression ParseAnd()
        {
            var expression = ParseEquality();
            while (Match(ClTokenKind.AndAnd))
            {
                var token = Previous();
                expression = new ClBinaryExpression("&&", expression, ParseEquality(), token.Line, token.Column);
                CountNode(token);
            }
            return expression;
        }

        private ClExpression ParseEquality()
        {
            var expression = ParseComparison();
            while (Match(ClTokenKind.EqualEqual, ClTokenKind.BangEqual))
            {
                var token = Previous();
                expression = new ClBinaryExpression(token.Text, expression, ParseComparison(), token.Line, token.Column);
                CountNode(token);
            }
            return expression;
        }

        private ClExpression ParseComparison()
        {
            var expression = ParseUnary();
            while (Match(ClTokenKind.Less, ClTokenKind.LessEqual, ClTokenKind.Greater, ClTokenKind.GreaterEqual))
            {
                var token = Previous();
                expression = new ClBinaryExpression(token.Text, expression, ParseUnary(), token.Line, token.Column);
                CountNode(token);
            }
            return expression;
        }

        private ClExpression ParseUnary()
        {
            if (Match(ClTokenKind.Bang))
            {
                var token = Previous();
                var operand = ParseUnary();
                CountNode(token);
                return new ClUnaryExpression("!", operand, token.Line, token.Column);
            }
            return ParsePrimary();
        }

        private ClExpression ParsePrimary()
        {
            if (Match(ClTokenKind.LeftParen))
            {
                var expression = ParseExpression();
                Expect(ClTokenKind.RightParen, "Esperado ')' para encerrar a expressão.");
                return expression;
            }

            if (Match(ClTokenKind.String))
            {
                var token = Previous();
                var value = JsonSerializer.Deserialize<string>(token.Text)
                    ?? throw Error("CL_INVALID_STRING", "String inválida.", token);
                CountNode(token);
                return new ClLiteralExpression(value, token.Line, token.Column);
            }

            if (Match(ClTokenKind.Number))
            {
                var token = Previous();
                if (!double.TryParse(token.Text, NumberStyles.Float, CultureInfo.InvariantCulture, out var value)
                    || !double.IsFinite(value))
                    throw Error("CL_INVALID_NUMBER", "O número deve ser decimal finito e usar ponto como separador.", token);
                CountNode(token);
                return new ClLiteralExpression(value, token.Line, token.Column);
            }

            if (MatchIdentifier("true"))
            {
                var token = Previous();
                CountNode(token);
                return new ClLiteralExpression(true, token.Line, token.Column);
            }
            if (MatchIdentifier("false"))
            {
                var token = Previous();
                CountNode(token);
                return new ClLiteralExpression(false, token.Line, token.Column);
            }
            if (MatchIdentifier("null"))
            {
                var token = Previous();
                CountNode(token);
                return new ClLiteralExpression(null, token.Line, token.Column);
            }

            if (Match(ClTokenKind.Identifier))
            {
                var start = Previous();
                var parts = new List<string> { start.Text };
                while (Match(ClTokenKind.Dot))
                    parts.Add(Expect(ClTokenKind.Identifier, "Esperado identificador após '.'.").Text);
                Expect(ClTokenKind.LeftParen, "Identificadores só podem aparecer como chamadas nativas.");
                var arguments = new List<ClExpression>();
                if (!Check(ClTokenKind.RightParen))
                {
                    do { arguments.Add(ParseExpression()); }
                    while (Match(ClTokenKind.Comma));
                }
                Expect(ClTokenKind.RightParen, "Esperado ')' após os argumentos.");
                CountNode(start);
                return new ClCallExpression(string.Join('.', parts), arguments, start.Line, start.Column);
            }

            throw Error("CL_EXPECTED_EXPRESSION", "Esperada uma expressão literal, chamada nativa ou expressão entre parênteses.", Peek());
        }

        private void ExpectIdentifier(string identifier, string message)
        {
            if (Check(ClTokenKind.Identifier) && string.Equals(Peek().Text, identifier, StringComparison.Ordinal))
                Advance();
            else
                throw Error("CL_EXPECTED_KEYWORD", message, Peek());
        }

        private bool MatchIdentifier(string identifier)
        {
            if (!Check(ClTokenKind.Identifier) || !string.Equals(Peek().Text, identifier, StringComparison.Ordinal))
                return false;
            Advance();
            return true;
        }

        private bool Match(params ClTokenKind[] kinds)
        {
            foreach (var kind in kinds)
            {
                if (Check(kind))
                {
                    Advance();
                    return true;
                }
            }
            return false;
        }

        private ClToken Expect(ClTokenKind kind, string message)
        {
            if (Check(kind)) return Advance();
            throw Error("CL_UNEXPECTED_TOKEN", message, Peek());
        }

        private bool Check(ClTokenKind kind) => Peek().Kind == kind;
        private ClToken Advance() { if (!Check(ClTokenKind.End)) _current++; return Previous(); }
        private ClToken Peek() => _tokens[Math.Min(_current, _tokens.Count - 1)];
        private ClToken Previous() => _tokens[Math.Max(0, _current - 1)];
        private void CountNode(ClToken token)
        {
            _nodeCount++;
            if (_nodeCount > MaxAstNodes)
                throw Error("CL_AST_TOO_LARGE", $"A AST excede {MaxAstNodes} nós.", token);
        }
        private static ClSyntaxException Error(string code, string message, ClToken token) => new(code, message, token);
    }
}

internal sealed class ClLexer
{
    private readonly string _source;
    private readonly List<ClToken> _tokens = [];
    private int _offset;
    private int _line = 1;
    private int _column = 1;

    public ClLexer(string source) => _source = source;

    public IReadOnlyList<ClToken> Tokenize()
    {
        while (!AtEnd)
        {
            SkipWhitespaceAndComments();
            if (AtEnd) break;
            var line = _line;
            var column = _column;
            var current = Advance();
            switch (current)
            {
                case '(': Add(ClTokenKind.LeftParen, "(", line, column); break;
                case ')': Add(ClTokenKind.RightParen, ")", line, column); break;
                case '{': Add(ClTokenKind.LeftBrace, "{", line, column); break;
                case '}': Add(ClTokenKind.RightBrace, "}", line, column); break;
                case ',': Add(ClTokenKind.Comma, ",", line, column); break;
                case ';': Add(ClTokenKind.Semicolon, ";", line, column); break;
                case '.': Add(ClTokenKind.Dot, ".", line, column); break;
                case '!':
                    Add(Match('=') ? ClTokenKind.BangEqual : ClTokenKind.Bang, MatchWas('=') ? "!=" : "!", line, column);
                    break;
                case '<':
                    if (Match('=')) Add(ClTokenKind.LessEqual, "<=", line, column);
                    else Add(ClTokenKind.Less, "<", line, column);
                    break;
                case '>':
                    if (Match('=')) Add(ClTokenKind.GreaterEqual, ">=", line, column);
                    else Add(ClTokenKind.Greater, ">", line, column);
                    break;
                case '=':
                    if (Match('=')) Add(ClTokenKind.EqualEqual, "==", line, column);
                    else throw Error("CL_UNEXPECTED_CHARACTER", "O operador '=' não existe; use '=='.", line, column);
                    break;
                case '&':
                    if (Match('&')) Add(ClTokenKind.AndAnd, "&&", line, column);
                    else throw Error("CL_UNEXPECTED_CHARACTER", "Use '&&' para AND.", line, column);
                    break;
                case '|':
                    if (Match('|')) Add(ClTokenKind.OrOr, "||", line, column);
                    else throw Error("CL_UNEXPECTED_CHARACTER", "Use '||' para OR.", line, column);
                    break;
                case '"':
                    ReadString(line, column);
                    break;
                default:
                    if (IsIdentifierStart(current))
                    {
                        ReadIdentifier(current, line, column);
                    }
                    else if (char.IsAsciiDigit(current) || ((current == '-' || current == '+') && char.IsAsciiDigit(Peek())))
                    {
                        ReadNumber(current, line, column);
                    }
                    else
                    {
                        throw Error("CL_UNEXPECTED_CHARACTER", $"Caractere '{current}' não permitido na v0.1.", line, column);
                    }
                    break;
            }
        }
        _tokens.Add(new ClToken(ClTokenKind.End, string.Empty, _line, _column, _line, _column));
        return _tokens;
    }

    private bool AtEnd => _offset >= _source.Length;
    private char Peek(int lookahead = 0) => _offset + lookahead < _source.Length ? _source[_offset + lookahead] : '\0';
    private char Advance()
    {
        var value = _source[_offset++];
        if (value == '\n') { _line++; _column = 1; }
        else _column++;
        return value;
    }
    private bool Match(char expected)
    {
        if (Peek() != expected) return false;
        Advance();
        return true;
    }
    private bool MatchWas(char expected) => _tokens.Count > 0 || _source[_offset - 1] == expected;

    private void SkipWhitespaceAndComments()
    {
        while (!AtEnd)
        {
            if (char.IsWhiteSpace(Peek())) { Advance(); continue; }
            if (Peek() == '/' && Peek(1) == '/')
            {
                while (!AtEnd && Peek() != '\n') Advance();
                continue;
            }
            break;
        }
    }

    private void ReadIdentifier(char first, int line, int column)
    {
        var builder = new StringBuilder().Append(first);
        while (char.IsAsciiLetterOrDigit(Peek()) || Peek() == '_')
            builder.Append(Advance());
        Add(ClTokenKind.Identifier, builder.ToString(), line, column);
    }

    private void ReadNumber(char first, int line, int column)
    {
        var builder = new StringBuilder().Append(first);
        while (char.IsAsciiDigit(Peek())) builder.Append(Advance());
        if (Peek() == '.' && char.IsAsciiDigit(Peek(1)))
        {
            builder.Append(Advance());
            while (char.IsAsciiDigit(Peek())) builder.Append(Advance());
        }
        if (Peek() is 'e' or 'E')
        {
            builder.Append(Advance());
            if (Peek() is '+' or '-') builder.Append(Advance());
            if (!char.IsAsciiDigit(Peek()))
                throw Error("CL_INVALID_NUMBER", "Expoente numérico incompleto.", line, column);
            while (char.IsAsciiDigit(Peek())) builder.Append(Advance());
        }
        Add(ClTokenKind.Number, builder.ToString(), line, column);
    }

    private void ReadString(int line, int column)
    {
        var builder = new StringBuilder().Append('"');
        var closed = false;
        while (!AtEnd)
        {
            var value = Advance();
            builder.Append(value);
            if (value == '"') { closed = true; break; }
            if (value == '\n' || value == '\r')
                throw Error("CL_UNTERMINATED_STRING", "Strings não podem atravessar linhas.", line, column);
            if (value == '\\')
            {
                if (AtEnd) break;
                var escaped = Advance();
                builder.Append(escaped);
                if (escaped == 'u')
                {
                    for (var index = 0; index < 4; index++)
                    {
                        if (AtEnd || !Uri.IsHexDigit(Peek()))
                            throw Error("CL_INVALID_STRING_ESCAPE", "Escape Unicode deve conter quatro dígitos hexadecimais.", line, column);
                        builder.Append(Advance());
                    }
                }
                else if (escaped is not ('\\' or '"' or 'n' or 'r' or 't'))
                {
                    throw Error("CL_INVALID_STRING_ESCAPE", "Escape de string não suportado.", line, column);
                }
            }
        }
        if (!closed)
            throw Error("CL_UNTERMINATED_STRING", "String não terminada.", line, column);
        try { _ = JsonSerializer.Deserialize<string>(builder.ToString()); }
        catch (JsonException) { throw Error("CL_INVALID_STRING_ESCAPE", "Escape JSON inválido.", line, column); }
        Add(ClTokenKind.String, builder.ToString(), line, column);
    }

    private void Add(ClTokenKind kind, string text, int line, int column)
    {
        _tokens.Add(new ClToken(kind, text, line, column, _line, _column));
    }

    private ClSyntaxException Error(string code, string message, int line, int column)
    {
        return new ClSyntaxException(code, message, new ClToken(ClTokenKind.End, string.Empty, line, column, _line, _column));
    }

    private static bool IsIdentifierStart(char value) => char.IsAsciiLetter(value) || value == '_';
}
