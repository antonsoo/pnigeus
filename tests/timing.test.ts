import assert from "node:assert/strict";
import { test } from "node:test";
import { geometry, TANKS } from "../src/core/regulator";
import {
  DEFAULT_TIMING,
  parseTiming,
  searchTimings,
  timingQuery,
  timingRun,
} from "../src/core/timing";

test("timings conserve gas and count elapsed time, including empty and exhausted intervals", () => {
  for (const tank of TANKS)
    for (const pipes of [1, 2, 3, 4])
      for (const strokes of [
        [7, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 7],
        [0, 1, 2, 1, 1, 2],
        [0, 0, 0, 0, 0, 0],
      ]) {
        const run = timingRun({ tank, pipes, strokes });
        assert.ok(Math.abs(run.below + run.within + run.above - 12) < 1e-10);
        assert.ok(
          Math.abs(
            run.state.supplied -
              run.state.waterOut -
              run.state.vented -
              (run.state.waterStock - geometry(tank).baseVolume),
          ) < 1e-10,
        );
        for (const slot of run.slots) {
          assert.ok(slot.below >= 0 && slot.within >= 0 && slot.above >= 0);
          assert.ok(slot.peak >= slot.trough);
        }
      }
});

test("equal deliveries do not imply equal pressure histories", () => {
  const early = timingRun(DEFAULT_TIMING);
  const late = timingRun({ ...DEFAULT_TIMING, strokes: [0, 0, 0, 0, 0, 7] });
  const held = timingRun({ ...DEFAULT_TIMING, strokes: [0, 1, 2, 1, 1, 2] });
  assert.equal(early.state.supplied, held.state.supplied);
  assert.equal(late.state.supplied, held.state.supplied);
  assert.ok(held.within > early.within && held.within > late.within);
  assert.equal(held.complete, true);
  assert.ok(early.state.waterOut > held.state.waterOut);
});

test("search covers the full seven-stroke composition space, including impossible targets", () => {
  const found = searchTimings(6, 2);
  assert.equal(found.count, 792); // C(7 + 6 - 1, 6 - 1)
  assert.equal(found.full, 4);
  assert.equal(timingRun(found.best).complete, true);
  assert.equal(
    found.best.strokes.reduce((a, b) => a + b, 0),
    7,
  );
  const impossible = searchTimings(6, 4);
  assert.equal(impossible.full, 0);
  assert.ok(impossible.bestSeconds < 12);
});

test("a shared timing is all-or-nothing and round-trips all choices", () => {
  const valid = { tank: 12 as const, pipes: 4, strokes: [0, 1, 0, 1, 2, 3] };
  assert.deepEqual(parseTiming(timingQuery(valid)).settings, valid);
  for (const search of [
    "?strokes=7.7.0.0.0.0",
    "?tank=3&tank=6",
    "?pipes=2&pipes=2",
    "?strokes=1.1.1.1.1",
    "?strokes=1.1.1.1.1.1&strokes=0.0.0.0.0.7",
    "?pipes=2.0",
    "?tank=0x6",
    "?strokes=1.1.1.1.1.NaN",
  ]) {
    const parsed = parseTiming(search);
    assert.ok(parsed.warning, search);
    assert.deepEqual(parsed.settings, DEFAULT_TIMING);
  }
});

test("unused air changes feasibility, not the physical calculation", () => {
  const exact = searchTimings(6, 1);
  const flexible = searchTimings(6, 1, "at-most");
  assert.equal(exact.full, 0);
  assert.equal(flexible.count, 1716);
  assert.equal(flexible.full, 22);
  assert.equal(flexible.minimumCompleteStrokes, 3);
  assert.equal(flexible.bestUsed, 3);
  assert.equal(timingRun(flexible.best).complete, true);
  assert.equal(parseTiming(timingQuery(flexible.best, "at-most")).searchMode, "at-most");
  for (const query of ["?allow=unknown", "?allow=unspent&allow=unspent"]) {
    assert.ok(parseTiming(query).warning);
    assert.equal(parseTiming(query).searchMode, "exact");
  }
});
