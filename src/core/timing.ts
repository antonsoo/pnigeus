import {
  type Command,
  geometry,
  MODEL,
  pipeCount,
  replay,
  type State,
  TANKS,
  type Tank,
  waterReading,
} from "./regulator";

/** A discrete modern exercise, not ancient performance measurements. */
export const TIMING = {
  slots: 6,
  seconds: 2,
  budget: 7,
  prefill: 3,
  low: 400,
  high: 1100,
} as const;
export interface TimingSettings {
  tank: Tank;
  pipes: number;
  strokes: readonly number[];
}
export const DEFAULT_TIMING: TimingSettings = { tank: 6, pipes: 2, strokes: [7, 0, 0, 0, 0, 0] };

export function validateTiming(s: TimingSettings): void {
  if (
    !TANKS.includes(s.tank) ||
    !Number.isInteger(s.pipes) ||
    s.pipes < 1 ||
    s.pipes > 4 ||
    s.strokes.length !== TIMING.slots ||
    s.strokes.some((n) => !Number.isInteger(n) || n < 0 || n > TIMING.budget) ||
    s.strokes.reduce((a, b) => a + b, 0) > TIMING.budget
  )
    throw new RangeError("Choose 1–4 pipes and place at most seven strokes in six slots.");
}

export function timingCommands(s: TimingSettings): Command[] {
  validateTiming(s);
  const commands: Command[] = Array.from({ length: TIMING.prefill }, () => ({ type: "pump" }));
  commands.push({ type: "keys", mask: (1 << s.pipes) - 1 });
  for (const count of s.strokes) {
    for (let i = 0; i < count; i++) commands.push({ type: "pump" });
    commands.push({ type: "wait", seconds: TIMING.seconds });
  }
  return commands;
}

/** Integrate dS / q(P) to each threshold, rather than count plotted samples. */
export function timeAbove(state: State, tank: Tank, threshold: number, seconds: number): number {
  if (!Number.isFinite(threshold) || threshold < 0 || !Number.isFinite(seconds) || seconds < 0)
    throw new RangeError("Pressure and duration must be finite and nonnegative.");
  const p = waterReading(state.waterStock, tank).pressure;
  if (p <= threshold) return 0;
  const count = pipeCount(state.mask);
  if (!count) return seconds;
  const g = geometry(tank);
  const t =
    (Math.sqrt(MODEL.referencePressure) / (count * MODEL.pipeLitresPerSecond)) *
    (((2 * g.b) / g.k) * (Math.sqrt(p) - Math.sqrt(threshold)) +
      ((4 * g.a) / (3 * g.k * g.k)) * (p ** 1.5 - threshold ** 1.5));
  return Math.max(0, Math.min(seconds, t));
}

export function timingRun(s: TimingSettings) {
  const commands = timingCommands(s);
  const run = replay(s.tank, commands);
  const slots = run.rows
    .filter((row) => row.command.type === "wait")
    .map((row, i) => {
      const aboveLow = timeAbove(row.before, s.tank, TIMING.low, TIMING.seconds);
      const above = timeAbove(row.before, s.tank, TIMING.high, TIMING.seconds);
      return {
        index: i,
        strokes: s.strokes[i] ?? 0,
        start: row.before,
        end: row.after,
        peak: waterReading(row.before.waterStock, s.tank).pressure,
        trough: waterReading(row.after.waterStock, s.tank).pressure,
        below: TIMING.seconds - aboveLow,
        within: aboveLow - above,
        above,
      };
    });
  const within = slots.reduce((sum, slot) => sum + slot.within, 0);
  return {
    commands,
    slots,
    state: run.state,
    used: s.strokes.reduce((a, b) => a + b, 0),
    below: slots.reduce((sum, slot) => sum + slot.below, 0),
    above: slots.reduce((sum, slot) => sum + slot.above, 0),
    within,
    complete: within >= TIMING.slots * TIMING.seconds - 1e-9,
  };
}

/** All weak compositions of seven deliveries into the six allowed instants. */
export function searchTimings(tank: Tank, pipes: number) {
  const candidates: ReturnType<typeof timingRun>[] = [];
  const schedules: number[][] = [];
  function visit(prefix: number[], remaining: number): void {
    if (prefix.length === TIMING.slots - 1) {
      const strokes = [...prefix, remaining];
      candidates.push(timingRun({ tank, pipes, strokes }));
      schedules.push(strokes);
      return;
    }
    for (let n = 0; n <= remaining; n++) visit([...prefix, n], remaining - n);
  }
  visit([], TIMING.budget);
  let best = 0;
  for (let i = 1; i < candidates.length; i++)
    if ((candidates[i]?.within ?? 0) > (candidates[best]?.within ?? 0) + 1e-9) best = i;
  return {
    count: candidates.length,
    full: candidates.filter((run) => run.complete).length,
    best: { tank, pipes, strokes: schedules[best] ?? [] } satisfies TimingSettings,
    bestSeconds: candidates[best]?.within ?? 0,
  };
}

export function timingQuery(s: TimingSettings): string {
  validateTiming(s);
  return `?tank=${s.tank}&pipes=${s.pipes}&strokes=${s.strokes.join(".")}`;
}
export function parseTiming(search: string): { settings: TimingSettings; warning: string } {
  const q = new URLSearchParams(search);
  try {
    if (search.length > 300 || ["tank", "pipes", "strokes"].some((key) => q.getAll(key).length > 1))
      throw new Error("Ambiguous query");
    const tank = q.get("tank") ?? "6";
    const pipes = q.get("pipes") ?? "2";
    const strokes = q.get("strokes") ?? "7.0.0.0.0.0";
    if (!/^(3|6|12)$/.test(tank) || !/^[1-4]$/.test(pipes) || !/^[0-7](\.[0-7]){5}$/.test(strokes))
      throw new Error("Invalid timing");
    const settings = {
      tank: Number(tank) as Tank,
      pipes: Number(pipes),
      strokes: strokes.split(".").map(Number),
    };
    validateTiming(settings);
    return { settings, warning: "" };
  } catch {
    return {
      settings: { ...DEFAULT_TIMING, strokes: [...DEFAULT_TIMING.strokes] },
      warning:
        "The shared timing is invalid or ambiguous. The seven-strokes-at-once example is shown.",
    };
  }
}
