import test from "node:test";
import assert from "node:assert/strict";
import { orderLessonNodesByConnections, sortNodesByLessonFlow } from "./lessonFlow.ts";

function node(id, type = "paragraph", order = 1, outputs = [{ id: "complete", label: "Concluído" }]) {
  return { id, type, order, x: order * 10, y: order * 10, width: 120, height: 80,
    props: {}, inputs: type === "start" ? [] : [{ id: "enter", label: "Entrada" }], outputs };
}
function edge(id, sourceNode, sourcePort, targetNode) {
  return { id, sourceNode, sourcePort, targetNode, targetPort: "enter" };
}

test("follows connected flow instead of canvas insertion/order values", () => {
  const nodes = [
    node("list", "list", 1), node("heading", "heading", 2),
    node("certificate", "certificate", 3, []),
    node("quiz", "quiz", 4, [{ id: "success", label: "Aprovado" }, { id: "failed", label: "Reprovado" }]),
    node("exercise", "exercise", 5), node("start", "start", 6),
  ];
  const connections = [
    edge("e5", "list", "complete", "certificate"),
    edge("e3", "quiz", "failed", "exercise"),
    edge("e1", "start", "complete", "heading"),
    edge("e4", "quiz", "success", "list"),
    edge("e2", "heading", "complete", "quiz"),
  ];
  assert.deepEqual(orderLessonNodesByConnections(nodes, connections).map(item => item.id),
    ["start", "heading", "quiz", "list", "certificate", "exercise"]);
});

test("traverses quiz branches in declared output-port order, not connection insertion order", () => {
  const nodes = [
    node("start", "start", 1),
    node("quiz", "quiz", 2, [{ id: "success", label: "Aprovado" }, { id: "failed", label: "Reprovado" }]),
    node("failed", "exercise", 3), node("success", "list", 4),
  ];
  const connections = [
    edge("failed-edge", "quiz", "failed", "failed"),
    edge("success-edge", "quiz", "success", "success"),
    edge("start-edge", "start", "complete", "quiz"),
  ];
  assert.deepEqual(orderLessonNodesByConnections(nodes, connections).map(item => item.id),
    ["start", "quiz", "success", "failed"]);
});

test("appends disconnected legacy nodes after connected flow using fallback order", () => {
  const nodes = [
    node("orphan-b", "paragraph", 8), node("start", "start", 2),
    node("connected", "heading", 9), node("orphan-a", "list", 3),
  ];
  const connections = [edge("start-edge", "start", "complete", "connected")];
  assert.deepEqual(sortNodesByLessonFlow(nodes, connections).map(item => item.id),
    ["start", "connected", "orphan-a", "orphan-b"]);
});

test("cycles and duplicate paths never render a node more than once", () => {
  const nodes = [node("start", "start", 1), node("a", "heading", 2), node("b", "paragraph", 3)];
  const connections = [
    edge("start-a", "start", "complete", "a"),
    edge("a-b", "a", "complete", "b"),
    edge("b-a", "b", "complete", "a"),
  ];
  const ordered = orderLessonNodesByConnections(nodes, connections);
  assert.deepEqual(ordered.map(item => item.id), ["start", "a", "b"]);
  assert.equal(new Set(ordered.map(item => item.id)).size, ordered.length);
});
