import type { CanvasConnection, CanvasNode } from "../../types/course";

function compareFallbackOrder(a: CanvasNode, b: CanvasNode): number {
  const orderA = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
  const orderB = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
  return orderA - orderB || a.y - b.y || a.x - b.x || a.id.localeCompare(b.id);
}

/**
 * Linearizes the directed lesson graph for reading.
 *
 * Branches are traversed depth-first in the order declared by each source
 * node's outputs (e.g. Quiz: Aprovado, then Reprovado). Disconnected or
 * malformed legacy nodes are appended using the previous order/y/x fallback
 * so existing content is never silently lost.
 */
export function orderLessonNodesByConnections(
  nodes: CanvasNode[],
  connections: CanvasConnection[] = [],
): CanvasNode[] {
  if (!nodes.length) return [];

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, CanvasConnection[]>();
  const incoming = new Set<string>();

  for (const connection of connections) {
    if (!byId.has(connection.sourceNode) || !byId.has(connection.targetNode)) continue;
    const list = outgoing.get(connection.sourceNode) ?? [];
    list.push(connection);
    outgoing.set(connection.sourceNode, list);
    incoming.add(connection.targetNode);
  }

  for (const [sourceId, edges] of outgoing) {
    const source = byId.get(sourceId)!;
    const edgeIndex = new Map(edges.map((edge, index) => [edge.id, index]));
    edges.sort((a, b) => {
      const portA = source.outputs.findIndex((port) => port.id === a.sourcePort);
      const portB = source.outputs.findIndex((port) => port.id === b.sourcePort);
      const rankA = portA < 0 ? Number.MAX_SAFE_INTEGER : portA;
      const rankB = portB < 0 ? Number.MAX_SAFE_INTEGER : portB;
      return rankA - rankB
        || (edgeIndex.get(a.id) ?? 0) - (edgeIndex.get(b.id) ?? 0)
        || (byId.get(a.targetNode)?.order ?? Number.MAX_SAFE_INTEGER)
          - (byId.get(b.targetNode)?.order ?? Number.MAX_SAFE_INTEGER);
    });
  }

  const visited = new Set<string>();
  const ordered: CanvasNode[] = [];
  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    const node = byId.get(nodeId);
    if (!node) return;
    visited.add(nodeId);
    ordered.push(node);
    for (const edge of outgoing.get(nodeId) ?? []) visit(edge.targetNode);
  };

  const fallbackNodes = [...nodes].sort(compareFallbackOrder);
  const startNodes = fallbackNodes.filter((node) => node.type === "start");
  const roots = fallbackNodes.filter((node) => !incoming.has(node.id) && node.type !== "start");

  for (const node of startNodes) visit(node.id);
  for (const node of roots) visit(node.id);
  for (const node of fallbackNodes) visit(node.id);

  return ordered;
}

/** Stable sibling sort that follows the graph's linearized reading sequence. */
export function sortNodesByLessonFlow(
  nodes: CanvasNode[],
  connections: CanvasConnection[] = [],
): CanvasNode[] {
  const ordered = orderLessonNodesByConnections(nodes, connections);
  const indexById = new Map(ordered.map((node, index) => [node.id, index]));
  return [...nodes].sort((a, b) =>
    (indexById.get(a.id) ?? Number.MAX_SAFE_INTEGER)
      - (indexById.get(b.id) ?? Number.MAX_SAFE_INTEGER)
      || compareFallbackOrder(a, b)
  );
}
