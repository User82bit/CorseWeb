import test from "node:test";
import assert from "node:assert/strict";

import {
  canAssignNodeParent,
  findContainerAtPosition,
  fitsInsideContainer,
  getNodeDescendantIds,
  getNodeHierarchyDepth,
  validateNodeHierarchy,
} from "./nodeHierarchy.ts";

function node(id, type = "paragraph", options = {}) {
  return {
    id,
    type,
    x: options.x ?? 160,
    y: options.y ?? 170,
    width: options.width ?? 120,
    height: options.height ?? 80,
    props: {},
    inputs: type === "start" ? [] : [{ id: "enter", label: "Entrada" }],
    outputs: type === "certificate" ? [] : [{ id: "complete", label: "Concluído" }],
    parentId: options.parentId ?? null,
    order: options.order ?? 1,
  };
}

const outer = () => node("outer", "container", { x: 100, y: 100, width: 620, height: 520 });
const inner = () => node("inner", "container", { x: 140, y: 170, width: 360, height: 360, parentId: "outer" });

test("allows a child fully inside a container", () => {
  const nodes = [outer(), node("text", "paragraph", { x: 140, y: 170, parentId: "outer" })];
  assert.equal(validateNodeHierarchy(nodes).valid, true);
  assert.equal(fitsInsideContainer(nodes[1], nodes[0]), true);
});

test("rejects a parent that is not a container", () => {
  const nodes = [node("text"), node("child", "paragraph", { parentId: "text" })];
  assert.equal(validateNodeHierarchy(nodes).valid, false);
});

test("rejects a missing parent reference", () => {
  const nodes = [node("child", "paragraph", { parentId: "missing" })];
  assert.equal(validateNodeHierarchy(nodes).valid, false);
});

test("rejects cyclic parent references", () => {
  const nodes = [
    node("a", "container", { parentId: "b" }),
    node("b", "container", { parentId: "a" }),
  ];
  assert.equal(validateNodeHierarchy(nodes).valid, false);
});

test("rejects children outside their parent's content bounds", () => {
  const nodes = [outer(), node("child", "paragraph", { x: 110, y: 110, parentId: "outer" })];
  assert.equal(validateNodeHierarchy(nodes).valid, false);
});

test("allows four levels and rejects a fifth", () => {
  const nodes = [
    node("level-1", "container"),
    node("level-2", "container", { parentId: "level-1" }),
    node("level-3", "container", { parentId: "level-2" }),
    node("level-4", "container", { parentId: "level-3" }),
    node("leaf", "paragraph"),
  ];

  assert.equal(getNodeHierarchyDepth(nodes, "level-4"), 4);
  assert.equal(canAssignNodeParent(nodes, "leaf", "level-4").valid, false);
});

test("prevents placing a node inside its own descendant", () => {
  const nodes = [
    node("outer", "container"),
    node("inner", "container", { parentId: "outer" }),
  ];
  assert.equal(canAssignNodeParent(nodes, "outer", "inner").valid, false);
});

test("finds the deepest eligible container for a dropped card", () => {
  const nodes = [
    outer(),
    inner(),
    node("third", "container", { x: 170, y: 220, width: 250, height: 250, parentId: "inner" }),
  ];
  const target = findContainerAtPosition(nodes, 190, 270, 100, 60);
  assert.equal(target?.id, "third");
});

test("returns every descendant when deleting or moving a container subtree", () => {
  const nodes = [
    outer(),
    inner(),
    node("paragraph", "paragraph", { x: 180, y: 220, parentId: "inner" }),
    node("callout", "callout", { x: 180, y: 320, parentId: "outer" }),
  ];
  assert.deepEqual(
    [...getNodeDescendantIds(nodes, "outer")].sort(),
    ["callout", "inner", "paragraph"]
  );
});
