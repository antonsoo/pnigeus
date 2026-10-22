/** Modern teaching geometry, not dimensions transcribed from an ancient object. */
export const MODEL = {
  atmosphere: 101325,
  density: 1000,
  gravity: 9.80665,
  bellArea: 0.04,
  roof: 0.52,
  rim: 0.04,
  restLevel: 0.3,
  strokeLitres: 1,
  pipeLitresPerSecond: 0.4,
  referencePressure: 1000,
} as const;
export const TANKS = [3, 6, 12] as const;
export type Tank = (typeof TANKS)[number];
export type Command =
  | { type: "pump" }
  | { type: "keys"; mask: number }
  | { type: "wait"; seconds: 2 | 5 };
export const MAX_COMMANDS = 64;
export interface State {
  time: number;
  mask: number;
  waterStock: number;
  dryStock: number;
  supplied: number;
  waterOut: number;
  dryOut: number;
  vented: number;
}

export function geometry(tank: Tank) {
  if (!TANKS.includes(tank)) throw new RangeError("Choose a tank area of 3, 6 or 12 bell areas.");
  const outsideArea = MODEL.bellArea * (tank - 1);
  const baseVolume = 1000 * MODEL.bellArea * (MODEL.roof - MODEL.restLevel);
  const k = MODEL.density * MODEL.gravity * (1 + MODEL.bellArea / outsideArea);
  // stock(d) = baseVolume + b*d + a*d², in ambient-equivalent litres.
  const a = (1000 * MODEL.bellArea * k) / MODEL.atmosphere;
  const b = 1000 * MODEL.bellArea + (k * baseVolume) / MODEL.atmosphere;
  const maxDrop = MODEL.restLevel - MODEL.rim;
  const stockAt = (drop: number) => baseVolume + b * drop + a * drop * drop;
  return { outsideArea, baseVolume, k, a, b, maxDrop, stockAt, maxStock: stockAt(maxDrop) };
}

export function waterReading(stock: number, tank: Tank) {
  const g = geometry(tank);
  if (!Number.isFinite(stock) || stock < g.baseVolume - 1e-10 || stock > g.maxStock + 1e-10)
    throw new RangeError("The air stock is outside the water chamber's operating range.");
  const excess = Math.max(0, Math.min(stock, g.maxStock) - g.baseVolume);
  // The rationalized quadratic root avoids cancellation close to zero pressure.
  const drop = (2 * excess) / (g.b + Math.sqrt(g.b * g.b + 4 * g.a * excess));
  const inside = MODEL.restLevel - drop;
  const outside = MODEL.restLevel + (MODEL.bellArea / g.outsideArea) * drop;
  const head = outside - inside;
  const volume = 1000 * MODEL.bellArea * (MODEL.roof - inside);
  return {
    inside,
    outside,
    head,
    volume,
    pressure: g.k * drop,
    drop,
    reserve: excess,
    atRim: g.maxDrop - drop < 1e-10,
  };
}

export function dryPressure(stock: number, tank: Tank): number {
  return MODEL.atmosphere * Math.max(0, stock / geometry(tank).baseVolume - 1);
}
export function pipeCount(mask: number): number {
  if (!Number.isInteger(mask) || mask < 0 || mask > 15) throw new RangeError("Unknown pipe gates.");
  return [1, 2, 4, 8].filter((bit) => mask & bit).length;
}
export function initial(tank: Tank): State {
  const stock = geometry(tank).baseVolume;
  return {
    time: 0,
    mask: 0,
    waterStock: stock,
    dryStock: stock,
    supplied: 0,
    waterOut: 0,
    dryOut: 0,
    vented: 0,
  };
}

/** Exact time integral of the chosen square-root outflow law; no time stepping. */
export function afterRelease(state: State, tank: Tank, seconds: number): State {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 5)
    throw new RangeError("A release must last from zero to five seconds.");
  const count = pipeCount(state.mask);
  const g = geometry(tank);
  const start = waterReading(state.waterStock, tank);
  const flow = count * MODEL.pipeLitresPerSecond;
  const primitive = (u: number) => 2 * g.b * u + ((4 * g.a) / 3) * u ** 3;
  const target = Math.max(
    0,
    primitive(Math.sqrt(start.drop)) - seconds * flow * Math.sqrt(g.k / MODEL.referencePressure),
  );
  let low = 0;
  let high = Math.sqrt(start.drop);
  if (flow > 0 && seconds > 0) {
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      if (primitive(mid) < target) low = mid;
      else high = mid;
    }
  } else low = high;
  const waterStock = Math.min(state.waterStock, g.stockAt(((low + high) / 2) ** 2));
  const root = Math.max(
    0,
    Math.sqrt(Math.max(0, state.dryStock - g.baseVolume)) -
      (seconds * flow * Math.sqrt(MODEL.atmosphere / (g.baseVolume * MODEL.referencePressure))) / 2,
  );
  const dryStock = Math.min(state.dryStock, g.baseVolume + root * root);
  return {
    ...state,
    time: state.time + seconds,
    waterStock,
    dryStock,
    waterOut: state.waterOut + state.waterStock - waterStock,
    dryOut: state.dryOut + state.dryStock - dryStock,
  };
}

export function apply(state: State, tank: Tank, command: Command): State {
  if (command.type === "keys") {
    pipeCount(command.mask);
    return { ...state, mask: command.mask };
  }
  if (command.type === "wait") {
    if (command.seconds !== 2 && command.seconds !== 5)
      throw new RangeError("Choose two or five seconds.");
    return afterRelease(state, tank, command.seconds);
  }
  const g = geometry(tank);
  const delivered = state.waterStock + MODEL.strokeLitres;
  return {
    ...state,
    waterStock: Math.min(g.maxStock, delivered),
    dryStock: state.dryStock + MODEL.strokeLitres,
    supplied: state.supplied + MODEL.strokeLitres,
    vented: state.vented + Math.max(0, delivered - g.maxStock),
  };
}

export function replay(tank: Tank, commands: readonly Command[]) {
  if (commands.length > MAX_COMMANDS)
    throw new RangeError("An experiment holds at most 64 actions. Undo or reset to continue.");
  let state = initial(tank);
  const rows = commands.map((command, index) => {
    const before = state;
    state = apply(state, tank, command);
    return { index: index + 1, command, before, after: state };
  });
  return { state, rows };
}

export function commandName(command: Command): string {
  if (command.type === "pump") return "Pump 1 litre";
  if (command.type === "keys")
    return `Open ${pipeCount(command.mask)} pipe${pipeCount(command.mask) === 1 ? "" : "s"} (gates ${command.mask.toString(16)})`;
  return `Release for ${command.seconds} s`;
}

export function pressureTrace(tank: Tank, commands: readonly Command[]) {
  const points = [initial(tank)];
  for (const row of replay(tank, commands).rows) {
    if (row.command.type === "wait") {
      for (let i = 1; i <= row.command.seconds * 10; i++)
        points.push(afterRelease(row.before, tank, i / 10));
    } else points.push(row.after);
  }
  return points;
}
