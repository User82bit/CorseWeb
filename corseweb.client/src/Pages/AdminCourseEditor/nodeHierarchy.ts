import type { CanvasNode } from "../../types/course";

export const MAX_NODE_HIERARCHY_DEPTH = 4;
export const CONTAINER_CONTENT_INSET = 20;
export const CONTAINER_HEADER_HEIGHT = 48;

export interface ContainerContentBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface HierarchyValidation {
  valid: boolean;
  error?: string;
}

export function isContainerNode(node: CanvasNode | undefined): node is CanvasNode {
  return node?.type === "container";
}

export function getNodeDescendantIds(nodes: CanvasNode[], nodeId: string): Set<string> {
  const descendants = new Set<string>();
  const pending = [nodeId];

  while (pending.length) {
    const parentId = pending.pop()!;
    for (const node of nodes) {
      if (node.parentId === parentId && !descendants.has(node.id)) {
        descendants.add(node.id);
        pending.push(node.id);
      }
    }
  }

  return descendants;
}

/** Number of hierarchy levels including the node itself. Root nodes have depth 1. */
export function getNodeHierarchyDepth(nodes: CanvasNode[], nodeId: string): number {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  let current = byId.get(nodeId);
  let depth = 0;

  while (current) {
    if (visited.has(current.id)) return -1;
    visited.add(current.id);
    depth += 1;
    if (!current.parentId) return depth;
    const parent = byId.get(current.parentId);
    if (!isContainerNode(parent)) return -1;
    current = parent;
  }

  return -1;
}

/** Longest path from this node down to a leaf, counting this node. */
export function getNodeSubtreeHeight(nodes: CanvasNode[], nodeId: string, path = new Set<string>()): number {
  if (path.has(nodeId)) return MAX_NODE_HIERARCHY_DEPTH + 1;
  const nextPath = new Set(path);
  nextPath.add(nodeId);
  const descendants = nodes.filter((node) => node.parentId === nodeId);
  if (!descendants.length) return 1;
  return 1 + Math.max(...descendants.map((node) => getNodeSubtreeHeight(nodes, node.id, nextPath)));
}

export function getContainerContentBounds(container: CanvasNode): ContainerContentBounds {
  return {
    left: container.x + CONTAINER_CONTENT_INSET,
    top: container.y + CONTAINER_HEADER_HEIGHT,
    right: container.x + container.width - CONTAINER_CONTENT_INSET,
    bottom: container.y + container.height - CONTAINER_CONTENT_INSET,
  };
}

export function fitsInsideContainer(node: CanvasNode, container: CanvasNode): boolean {
  const bounds = getContainerContentBounds(container);
  return node.x >= bounds.left
    && node.y >= bounds.top
    && node.x + node.width <= bounds.right
    && node.y + node.height <= bounds.bottom;
}

export function canAssignNodeParent(
  nodes: CanvasNode[],
  nodeId: string,
  parentId: string | null | undefined
): HierarchyValidation {
  const node = nodes.find((item) => item.id === nodeId);
  if (!node) return { valid: false, error: "O elemento selecionado não existe." };
  if (node.type === "start" && parentId) {
    return { valid: false, error: "O marcador de início precisa permanecer no nível principal da aula." };
  }
  if (!parentId) {
    const subtreeHeight = getNodeSubtreeHeight(nodes, nodeId);
    return subtreeHeight <= MAX_NODE_HIERARCHY_DEPTH
      ? { valid: true }
      : { valid: false, error: `A hierarquia pode ter no máximo ${MAX_NODE_HIERARCHY_DEPTH} níveis.` };
  }

  const parent = nodes.find((item) => item.id === parentId);
  if (!isContainerNode(parent)) return { valid: false, error: "O elemento pai precisa ser um container existente." };
  if (parentId === nodeId || getNodeDescendantIds(nodes, nodeId).has(parentId)) {
    return { valid: false, error: "Um elemento não pode ser colocado dentro de si mesmo ou de um descendente." };
  }

  const parentDepth = getNodeHierarchyDepth(nodes, parentId);
  const subtreeHeight = getNodeSubtreeHeight(nodes, nodeId);
  if (parentDepth < 1 || parentDepth + subtreeHeight > MAX_NODE_HIERARCHY_DEPTH) {
    return { valid: false, error: `A hierarquia pode ter no máximo ${MAX_NODE_HIERARCHY_DEPTH} níveis.` };
  }

  return { valid: true };
}

export function getEligibleContainerParents(nodes: CanvasNode[], nodeId: string): CanvasNode[] {
  const forbidden = getNodeDescendantIds(nodes, nodeId);
  forbidden.add(nodeId);
  return nodes
    .filter((node) => isContainerNode(node) && !forbidden.has(node.id))
    .filter((node) => canAssignNodeParent(nodes, nodeId, node.id).valid)
    .sort((a, b) => getNodeHierarchyDepth(nodes, a.id) - getNodeHierarchyDepth(nodes, b.id) || (a.order ?? 0) - (b.order ?? 0));
}

export function findContainerDropTarget(
  nodes: CanvasNode[],
  nodeId: string,
  centerX: number,
  centerY: number
): CanvasNode | null {
  const forbidden = getNodeDescendantIds(nodes, nodeId);
  forbidden.add(nodeId);
  return nodes
    .filter((node) => isContainerNode(node) && !forbidden.has(node.id))
    .filter((container) => {
      const bounds = getContainerContentBounds(container);
      return centerX >= bounds.left && centerX <= bounds.right
        && centerY >= bounds.top && centerY <= bounds.bottom
        && canAssignNodeParent(nodes, nodeId, container.id).valid;
    })
    .sort((a, b) => getNodeHierarchyDepth(nodes, b.id) - getNodeHierarchyDepth(nodes, a.id))[0] ?? null;
}

export function validateNodeHierarchy(nodes: CanvasNode[]): HierarchyValidation {
  const ids = new Set(nodes.map((node) => node.id));
  for (const node of nodes) {
    if (!node.parentId) continue;
    if (!ids.has(node.parentId)) return { valid: false, error: `O elemento "${node.id}" referencia um container pai inexistente.` };
    const parent = nodes.find((item) => item.id === node.parentId);
    if (!isContainerNode(parent)) return { valid: false, error: `O elemento "${node.id}" possui um pai que não é um container.` };
    const hierarchy = canAssignNodeParent(nodes, node.id, node.parentId);
    if (!hierarchy.valid) return hierarchy;
    if (!fitsInsideContainer(node, parent)) {
      return { valid: false, error: `O elemento "${node.id}" está fora dos limites internos do container pai.` };
    }
  }

  // Detect cycles even when every node in the cycle has a syntactically valid parent.
  for (const node of nodes) {
    if (getNodeHierarchyDepth(nodes, node.id) < 1) {
      return { valid: false, error: "A hierarquia contém um ciclo ou uma referência de pai inválida." };
    }
  }

  return { valid: true };
}
