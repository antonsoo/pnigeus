import assert from "node:assert/strict";
import { test } from "node:test";
import {
  copyNotebook,
  notebookJson,
  readNotebook,
  type TimingNotebook,
} from "../src/core/notebook";
import { DEFAULT_TIMING } from "../src/core/timing";

const book: TimingNotebook = {
  current: { tank: 6, pipes: 2, strokes: [0, 1, 2, 1, 1, 2] },
  kept: DEFAULT_TIMING,
  searchMode: "exact",
  explanation: "An argument with <img> & Greek πνιγεύς.",
};

test("editable notebooks preserve both independent accounts and learner text", () => {
  assert.deepEqual(readNotebook(notebookJson(book, "development")), book);
  const copy = copyNotebook(book);
  assert.notEqual(copy.current.strokes, book.current.strokes);
  assert.notEqual(copy.kept?.strokes, book.kept?.strokes);
});

test("changed assumptions, malformed accounts and oversized text reject the whole notebook", () => {
  const original = JSON.parse(notebookJson(book, "development"));
  for (const mutate of [
    (r: typeof original) => {
      r.parameters.regulator.gravity = 10;
    },
    (r: typeof original) => {
      r.parameters.exercise.high = 1000;
    },
    (r: typeof original) => {
      r.kept.strokes = [7, 7, 0, 0, 0, 0];
    },
    (r: typeof original) => {
      r.current.strokes[1] = null;
    },
    (r: typeof original) => {
      r.explanation = "x".repeat(4001);
    },
    (r: typeof original) => {
      r.version = 2;
    },
    (r: typeof original) => {
      r.unrecognized = true;
    },
  ]) {
    const input = structuredClone(original);
    mutate(input);
    assert.throws(() => readNotebook(JSON.stringify(input)));
  }
  assert.throws(() => readNotebook(" ".repeat(32769)), /32 KiB/);
  assert.throws(() => readNotebook("{"), /not valid/);
});

test("JSON key order is immaterial; unchanged models from another edition reopen", () => {
  const input = JSON.parse(notebookJson(book, "a".repeat(64)));
  input.parameters.exercise = Object.fromEntries(
    Object.entries(input.parameters.exercise).reverse(),
  );
  assert.deepEqual(readNotebook(JSON.stringify(input)), book);
});
