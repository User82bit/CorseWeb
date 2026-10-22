import assert from "node:assert/strict";
import test from "node:test";
import { formatEstimatedDuration } from "./formatEstimatedDuration.ts";

test("keeps short durations in minutes", () => {
  assert.equal(formatEstimatedDuration(6, "pt-BR"), "6 min");
  assert.equal(formatEstimatedDuration(30, "pt-BR"), "30 min");
});

test("formats exact hours without rounding", () => {
  assert.equal(formatEstimatedDuration(60, "pt-BR"), "1 h");
  assert.equal(formatEstimatedDuration(120, "pt-BR"), "2 h");
});

test("formats remaining minutes alongside hours", () => {
  assert.equal(formatEstimatedDuration(75, "pt-BR"), "1 h 15 min");
  assert.equal(formatEstimatedDuration(125, "pt-BR"), "2 h 5 min");
});

test("supports all configured locales", () => {
  assert.equal(formatEstimatedDuration(75, "en"), "1 hr 15 min");
  assert.equal(formatEstimatedDuration(60, "es"), "1 h");
});

test("handles non-positive and invalid values safely", () => {
  assert.equal(formatEstimatedDuration(0, "pt-BR"), "0 min");
  assert.equal(formatEstimatedDuration(-5, "pt-BR"), "0 min");
  assert.equal(formatEstimatedDuration(Number.NaN, "pt-BR"), "0 min");
});
