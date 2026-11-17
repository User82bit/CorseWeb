using System.Text.Json;

namespace CorseWeb.Server.Helpers;

/// <summary>
/// Validates the nested-node hierarchy stored inside lesson modules JSON.
/// The editor is allowed to provide the UI, but the API remains authoritative.
/// </summary>
public static class CourseContentValidator
{
    private const int MaxNodesPerLesson = 500;
    private const int MaxHierarchyDepth = 4;
    private const double MinNodeWidth = 80;
    private const double MinNodeHeight = 60;
    private const double MaxNodeDimension = 5000;
    private const double ContainerInset = 20;
    private const double ContainerHeaderHeight = 48;

    private sealed record NodeInfo(
        string Id,
        string Type,
        double X,
        double Y,
        double Width,
        double Height,
        string? ParentId,
        HashSet<string> InputPorts,
        HashSet<string> OutputPorts
    );

    public static string? Validate(JsonElement? modules)
    {
        if (modules is null || modules.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            return null;

        if (modules.Value.ValueKind != JsonValueKind.Array)
            return "O conteúdo do curso precisa ser uma lista de módulos.";

        var moduleIndex = 0;
        foreach (var module in modules.Value.EnumerateArray())
        {
            moduleIndex++;
            if (module.ValueKind != JsonValueKind.Object)
                return $"O módulo {moduleIndex} possui uma estrutura inválida.";

            if (!module.TryGetProperty("lessons", out var lessons))
                continue;
            if (lessons.ValueKind != JsonValueKind.Array)
                return $"O módulo {moduleIndex} possui uma lista de aulas inválida.";

            var lessonIndex = 0;
            foreach (var lesson in lessons.EnumerateArray())
            {
                lessonIndex++;
                var location = $"Módulo {moduleIndex}, aula {lessonIndex}";
                if (lesson.ValueKind != JsonValueKind.Object)
                    return $"{location}: estrutura inválida.";

                var validation = ValidateLesson(lesson, location);
                if (validation is not null) return validation;
            }
        }

        return null;
    }

    public static string? ValidateJson(string? modulesJson)
    {
        if (string.IsNullOrWhiteSpace(modulesJson)) return null;
        try
        {
            using var document = JsonDocument.Parse(modulesJson);
            return Validate(document.RootElement);
        }
        catch (JsonException)
        {
            return "O conteúdo do curso contém JSON inválido.";
        }
    }

    private static string? ValidateLesson(JsonElement lesson, string location)
    {
        if (!lesson.TryGetProperty("nodes", out var nodesElement))
            nodesElement = default;
        if (nodesElement.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            nodesElement = default;
        else if (nodesElement.ValueKind != JsonValueKind.Array)
            return $"{location}: a lista de elementos é inválida.";

        var nodes = new Dictionary<string, NodeInfo>(StringComparer.Ordinal);
        if (nodesElement.ValueKind == JsonValueKind.Array)
        {
            if (nodesElement.GetArrayLength() > MaxNodesPerLesson)
                return $"{location}: o limite é de {MaxNodesPerLesson} elementos.";

            foreach (var node in nodesElement.EnumerateArray())
            {
                if (node.ValueKind != JsonValueKind.Object)
                    return $"{location}: existe um elemento com estrutura inválida.";

                var id = ReadString(node, "id");
                var type = ReadString(node, "type");
                if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(type))
                    return $"{location}: todos os elementos precisam de ID e tipo.";
                if (nodes.ContainsKey(id))
                    return $"{location}: o identificador de elemento '{id}' está duplicado.";

                if (!ReadFiniteNumber(node, "x", out var x)
                    || !ReadFiniteNumber(node, "y", out var y)
                    || !ReadFiniteNumber(node, "width", out var width)
                    || !ReadFiniteNumber(node, "height", out var height)
                    || x < 0 || y < 0
                    || width < MinNodeWidth || height < MinNodeHeight
                    || width > MaxNodeDimension || height > MaxNodeDimension)
                {
                    return $"{location}: o elemento '{id}' possui posição ou dimensões inválidas.";
                }

                var parentId = ReadString(node, "parentId");
                if (string.IsNullOrWhiteSpace(parentId)) parentId = null;
                var inputs = ReadPortIds(node, "inputs");
                var outputs = ReadPortIds(node, "outputs");
                nodes.Add(id, new NodeInfo(id, type, x, y, width, height, parentId, inputs, outputs));
            }
        }

        foreach (var node in nodes.Values)
        {
            if (node.ParentId is null) continue;
            if (node.Type == "start")
                return $"{location}: o marcador de início precisa permanecer no nível principal.";
            if (!nodes.TryGetValue(node.ParentId, out var parent))
                return $"{location}: o elemento '{node.Id}' referencia um container pai inexistente.";
            if (parent.Type != "container")
                return $"{location}: o elemento '{node.Id}' só pode ter um container como pai.";

            var left = parent.X + ContainerInset;
            var top = parent.Y + ContainerHeaderHeight;
            var right = parent.X + parent.Width - ContainerInset;
            var bottom = parent.Y + parent.Height - ContainerInset;
            if (node.X < left || node.Y < top
                || node.X + node.Width > right
                || node.Y + node.Height > bottom)
            {
                return $"{location}: o elemento '{node.Id}' está fora dos limites internos do container pai.";
            }

            var ancestors = new HashSet<string>(StringComparer.Ordinal);
            var current = node;
            var depth = 0;
            while (true)
            {
                if (!ancestors.Add(current.Id))
                    return $"{location}: a hierarquia contém um ciclo.";
                depth++;
                if (depth > MaxHierarchyDepth)
                    return $"{location}: a hierarquia pode ter no máximo {MaxHierarchyDepth} níveis.";
                if (current.ParentId is null) break;
                if (!nodes.TryGetValue(current.ParentId, out var ancestor))
                    return $"{location}: a hierarquia contém uma referência de pai inválida.";
                if (ancestor.Type != "container")
                    return $"{location}: somente containers podem receber elementos filhos.";
                current = ancestor;
            }
        }

        if (!lesson.TryGetProperty("connections", out var connections))
            return null;
        if (connections.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            return null;
        if (connections.ValueKind != JsonValueKind.Array)
            return $"{location}: a lista de conexões é inválida.";

        var occupiedInputs = new HashSet<string>(StringComparer.Ordinal);
        foreach (var connection in connections.EnumerateArray())
        {
            if (connection.ValueKind != JsonValueKind.Object)
                return $"{location}: existe uma conexão com estrutura inválida.";

            var sourceId = ReadString(connection, "sourceNode");
            var sourcePort = ReadString(connection, "sourcePort");
            var targetId = ReadString(connection, "targetNode");
            var targetPort = ReadString(connection, "targetPort");
            if (string.IsNullOrWhiteSpace(sourceId) || string.IsNullOrWhiteSpace(sourcePort)
                || string.IsNullOrWhiteSpace(targetId) || string.IsNullOrWhiteSpace(targetPort)
                || !nodes.TryGetValue(sourceId, out var source)
                || !nodes.TryGetValue(targetId, out var target))
            {
                return $"{location}: uma conexão referencia um elemento inexistente.";
            }

            if (!source.OutputPorts.Contains(sourcePort) || !target.InputPorts.Contains(targetPort))
                return $"{location}: uma conexão referencia uma porta inexistente.";

            if (!occupiedInputs.Add($"{targetId}:{targetPort}"))
                return $"{location}: uma entrada não pode receber mais de uma conexão.";
        }

        return null;
    }

    private static string? ReadString(JsonElement element, string property)
    {
        return element.ValueKind == JsonValueKind.Object
            && element.TryGetProperty(property, out var value)
            && value.ValueKind == JsonValueKind.String
                ? value.GetString()
                : null;
    }

    private static bool ReadFiniteNumber(JsonElement element, string property, out double number)
    {
        number = 0;
        return element.ValueKind == JsonValueKind.Object
            && element.TryGetProperty(property, out var value)
            && value.ValueKind == JsonValueKind.Number
            && value.TryGetDouble(out number)
            && double.IsFinite(number);
    }

    private static HashSet<string> ReadPortIds(JsonElement node, string property)
    {
        var ids = new HashSet<string>(StringComparer.Ordinal);
        if (!node.TryGetProperty(property, out var ports) || ports.ValueKind != JsonValueKind.Array)
            return ids;
        foreach (var port in ports.EnumerateArray())
        {
            var id = ReadString(port, "id");
            if (!string.IsNullOrWhiteSpace(id)) ids.Add(id);
        }
        return ids;
    }
}
