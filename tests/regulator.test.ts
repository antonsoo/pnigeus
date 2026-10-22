import assert from "node:assert/strict";
import test from "node:test";
import {
  afterRelease,
  apply,
  geometry,
  initial,
  MODEL,
  replay,
  TANKS,
  waterReading,
} from "../src/core/regulator";
import { parseSession, shareQuery } from "../src/core/session";

const close = (a: number, b: number, tolerance = 1e-10) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
test("both water surfaces conserve water and balance pressure throughout the chamber", () => {
  for (const tank of TANKS) {
    const g = geometry(tank);
    for (let i = 0; i <= 100; i++) {
      const stock = g.baseVolume + ((g.maxStock - g.baseVolume) * i) / 100;
      const r = waterReading(stock, tank);
      close(
        MODEL.bellArea * r.inside + g.outsideArea * r.outside,
        MODEL.bellArea * tank * MODEL.restLevel,
      );
      close(r.pressure, MODEL.density * MODEL.gravity * r.head);
      close(stock, r.volume * (1 + r.pressure / MODEL.atmosphere));
    }
  }
});
test("overfilling vents ambient-equivalent air and does not lose water", () => {
  const run = replay(
    6,
    Array.from({ length: 20 }, () => ({ type: "pump" })),
  );
  const g = geometry(6);
  close(run.state.waterStock, g.maxStock);
  close(run.state.waterStock - g.baseVolume + run.state.vented, 20);
  close(waterReading(run.state.waterStock, 6).inside, MODEL.rim);
});
test("release composition is independent of interval subdivision; exhaustion retains unpressurized air", () => {
  for (const tank of TANKS) {
    let state = apply(initial(tank), tank, { type: "pump" });
    state = apply(state, tank, { type: "keys", mask: 15 });
    const whole = afterRelease(state, tank, 5);
    const split = afterRelease(afterRelease(state, tank, 2), tank, 3);
    close(whole.waterStock, split.waterStock);
    close(whole.dryStock, split.dryStock);
    close(whole.waterStock, geometry(tank).baseVolume);
    close(whole.dryStock, geometry(tank).baseVolume);
  }
});
test("closed gates retain stock as experiment time advances", () => {
  const state = apply(initial(6), 6, { type: "pump" });
  const after = afterRelease(state, 6, 5);
  close(after.waterStock, state.waterStock);
  close(after.dryStock, state.dryStock);
  close(after.time, 5);
});
test("shared commands round trip and ambiguous evidence resets the whole experiment", () => {
  const commands = [
    { type: "pump" },
    { type: "keys", mask: 10 },
    { type: "wait", seconds: 5 },
  ] as const;
  assert.deepEqual(parseSession(shareQuery(12, commands)), { tank: 12, commands, warning: "" });
  for (const search of [
    "?tank=6&tank=3",
    "?compare=1&compare=0",
    "?events=P..P",
    "?events=P.K16",
    "?events=P.W3",
    `?events=${"P.".repeat(80)}`,
  ]) {
    const parsed = parseSession(search);
    assert.ok(parsed.warning);
    assert.equal(parsed.commands.length, 0);
  }
});
