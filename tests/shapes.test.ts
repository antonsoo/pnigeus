import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SHAPES,
  parseShapes,
  shapeComparison,
  shapeGeometry,
  shapesQuery,
} from "../src/core/shapes";

test("the 80 cm dome reproduces the published rounded geometric example", () => {
  const c = shapeComparison({ ...DEFAULT_SHAPES });
  assert.ok(Math.abs(c.geometry.full.volume - 134) < 0.05);
  assert.ok(Math.abs(c.geometry.full.head * 1000 - 653) < 0.5);
  assert.ok(Math.abs(c.geometricRelease - 50) < 0.05);
  assert.ok(c.released > c.geometricRelease);
  assert.ok(Math.abs(c.released - 54.7205552948) < 1e-8);
});

test("halving size preserves cubic geometric scaling and changes the gas correction", () => {
  const large = shapeGeometry({ ...DEFAULT_SHAPES });
  const small = shapeGeometry({ ...DEFAULT_SHAPES, radiusCm: 20 });
  assert.ok(Math.abs(large.full.volume / small.full.volume - 8) < 1e-12);
  assert.ok(Math.abs(large.full.head / small.full.head - 2) < 1e-12);
  assert.ok(large.full.stock / small.full.stock > 8);
});

test("a high-filled chamber can empty before a requested pressure is reached", () => {
  const c = shapeComparison({ ...DEFAULT_SHAPES, fill: "extra", drop: 90 });
  assert.equal(c.reachesTarget, false);
  assert.equal(c.endsEmpty, true);
  assert.equal(c.after.volume, 0);
  assert.ok(c.after.pressure > c.targetPressure);
  assert.equal(c.released, c.geometry.full.stock);
  const shallow = shapeComparison({ ...DEFAULT_SHAPES, fill: "half", drop: 90 });
  assert.equal(shallow.reachesTarget, true);
  assert.ok(shallow.geometry.rest.volume > 0);
  assert.ok(shallow.after.pressure > 0);
});

test("shared views round-trip and reject an ambiguous study as a whole", () => {
  const s = {
    ...DEFAULT_SHAPES,
    radiusCm: 25,
    form: "cone",
    fill: "extra",
    plan: "wide",
    drop: 90,
    phase: "full",
  } as const;
  assert.deepEqual(parseShapes(shapesQuery(s)), { settings: s, warning: false });
  for (const query of [
    "?r=25&r=30&form=cone",
    "?r=20&phase=full&phase=after",
    "?r=",
    "?r=2e1",
    "?r=22&fill=extra",
    "?plan=unknown",
    "?drop=99",
  ]) {
    assert.deepEqual(parseShapes(query), { settings: { ...DEFAULT_SHAPES }, warning: true });
  }
});
