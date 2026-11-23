using System.Text.Json.Nodes;

namespace CorseWeb.Server.Helpers;

/// <summary>
/// Removes content that belongs to a Quiz branch the current student has not
/// unlocked. Quiz outcomes are loaded from persisted server attempts.
/// </summary>
public static class StudentLessonFlowProjector
{
    private sealed record Edge(string SourceNode, string SourcePort, string TargetNode);

    public static void Apply(
        JsonObject lesson,
        IReadOnlyDictionary<string, bool> quizResults)
    {
        if (lesson["nodes"] is not JsonArray nodes
            || lesson["connections"] is not JsonArray connections)
        {
            return;
        }

        var nodeById = nodes.OfType<JsonObject>()
            .Select(node => (Node: node, Id: ReadString(node, "id")))
            .Where(item => !string.IsNullOrWhiteSpace(item.Id))
            .ToDictionary(item => item.Id!, item => item.Node, StringComparer.Ordinal);

        var edges = connections.OfType<JsonObject>()
            .Select(connection => new Edge(
                ReadString(connection, "sourceNode") ?? string.Empty,
                ReadString(connection, "sourcePort") ?? string.Empty,
                ReadString(connection, "targetNode") ?? string.Empty))
            .Where(edge => nodeById.ContainsKey(edge.SourceNode)
                && nodeById.ContainsKey(edge.TargetNode))
            .ToArray();

        var outgoing = edges
            .GroupBy(edge => edge.SourceNode, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.ToArray(), StringComparer.Ordinal);

        var childrenByParent = nodeById.Values
            .Select(node => (Node: node, ParentId: ReadString(node, "parentId")))
            .Where(item => !string.IsNullOrWhiteSpace(item.ParentId))
            .GroupBy(item => item.ParentId!, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.Select(item => item.Node).ToArray(), StringComparer.Ordinal);

        var hidden = new HashSet<string>(StringComparer.Ordinal);
        foreach (var quiz in nodeById.Values.Where(node =>
            string.Equals(ReadString(node, "type"), "quiz", StringComparison.Ordinal)))
        {
            var quizId = ReadString(quiz, "id");
            if (string.IsNullOrWhiteSpace(quizId)) continue;

            var successStarts = edges
                .Where(edge => edge.SourceNode == quizId && edge.SourcePort == "success")
                .Select(edge => edge.TargetNode);
            var failedStarts = edges
                .Where(edge => edge.SourceNode == quizId && edge.SourcePort == "failed")
                .Select(edge => edge.TargetNode);

            var successNodes = CollectReachable(successStarts, nodeById, outgoing, childrenByParent);
            var failedNodes = CollectReachable(failedStarts, nodeById, outgoing, childrenByParent);

            if (successNodes.Count == 0 && failedNodes.Count == 0) continue;

            // A malformed cycle must never hide the Quiz card that owns the decision.
            successNodes.Remove(quizId);
            failedNodes.Remove(quizId);

            if (!quizResults.TryGetValue(quizId, out var passed))
            {
                hidden.UnionWith(successNodes);
                hidden.UnionWith(failedNodes);
                continue;
            }

            var unavailableBranch = passed ? failedNodes : successNodes;
            var selectedBranch = passed ? successNodes : failedNodes;
            unavailableBranch.ExceptWith(selectedBranch);
            hidden.UnionWith(unavailableBranch);
        }

        if (hidden.Count == 0) return;

        var visibleNodes = nodes
            .OfType<JsonObject>()
            .Where(node =>
            {
                var id = ReadString(node, "id");
                return id is null || !hidden.Contains(id);
            })
            .Select(node => (JsonNode?)node.DeepClone())
            .ToArray();

        var visibleIds = visibleNodes
            .OfType<JsonObject>()
            .Select(node => ReadString(node, "id"))
            .Where(id => id is not null)
            .ToHashSet(StringComparer.Ordinal);

        var visibleConnections = edges
            .Where(edge => visibleIds.Contains(edge.SourceNode)
                && visibleIds.Contains(edge.TargetNode))
            .Select(edge =>
            {
                var original = connections
                    .OfType<JsonObject>()
                    .FirstOrDefault(item =>
                        ReadString(item, "sourceNode") == edge.SourceNode
                        && ReadString(item, "sourcePort") == edge.SourcePort
                        && ReadString(item, "targetNode") == edge.TargetNode);
                return (JsonNode?)original?.DeepClone();
            })
            .Where(connection => connection is not null)
            .ToArray();

        lesson["nodes"] = new JsonArray(visibleNodes);
        lesson["connections"] = new JsonArray(visibleConnections);
    }

    private static HashSet<string> CollectReachable(
        IEnumerable<string> startIds,
        IReadOnlyDictionary<string, JsonObject> nodeById,
        IReadOnlyDictionary<string, Edge[]> outgoing,
        IReadOnlyDictionary<string, JsonObject[]> childrenByParent)
    {
        var visited = new HashSet<string>(StringComparer.Ordinal);
        var pending = new Queue<string>(startIds);

        while (pending.Count > 0)
        {
            var currentId = pending.Dequeue();
            if (!visited.Add(currentId) || !nodeById.TryGetValue(currentId, out var node))
                continue;

            // Container children are part of the container's content even when
            // authors have not drawn explicit connections between every child.
            if (string.Equals(ReadString(node, "type"), "container", StringComparison.Ordinal)
                && childrenByParent.TryGetValue(currentId, out var children))
            {
                foreach (var child in children)
                {
                    var childId = ReadString(child, "id");
                    if (!string.IsNullOrWhiteSpace(childId)) pending.Enqueue(childId);
                }
            }

            if (outgoing.TryGetValue(currentId, out var nextEdges))
            {
                foreach (var edge in nextEdges) pending.Enqueue(edge.TargetNode);
            }
        }

        return visited;
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
}
