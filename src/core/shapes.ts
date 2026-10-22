/** Source-inspired shapes with explicitly chosen dimensions. Heights are above the open rim. */
export const FORMS = ["hemisphere", "cylinder", "cone"] as const;
export type Form = (typeof FORMS)[number];
export const FILLS = ["half", "roof", "extra"] as const;
export type Fill = (typeof FILLS)[number];
export const PLANS = ["octagon", "double", "wide"] as const;
export type Plan = (typeof PLANS)[number];
export const DROPS = [10, 20, 30, 50, 90] as const;
export type Drop = (typeof DROPS)[number];
export interface ShapeSettings {
  radiusCm: number;
  fill: Fill;
  plan: Plan;
  drop: Drop;
  form: Form;
  phase: "full" | "after";
}
export const DEFAULT_SHAPES: Readonly<ShapeSettings> = {
  radiusCm: 40,
  fill: "roof",
  plan: "octagon",
  drop: 30,
  form: "hemisphere",
  phase: "after",
};
export const SHAPE_PHYSICS = { atmosphere: 101325, rhoG: 9806.65 } as const;
export const formNames: Record<Form, string> = {
  hemisphere: "Hemisphere",
  cylinder: "Cylinder",
  cone: "Cone",
};
export const fillNames: Record<Fill, string> = {
  half: "Halfway up the chamber",
  roof: "At the chamber roof",
  extra: "One quarter-radius above the roof",
};
export const planNames: Record<Plan, string> = {
  octagon: "Octagon around the rim circle",
  double: "Round tank, twice the rim area",
  wide: "Round tank, six times the rim area",
};
function boundedRoot(low: number, high: number, increasing: (x: number) => number, target: number) {
  for (let i = 0; i < 56; i++) {
    const mid = (low + high) / 2;
    if (increasing(mid) < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}
export function validateShapes(s: ShapeSettings): void {
  if (
    !Number.isInteger(s.radiusCm) ||
    s.radiusCm < 10 ||
    s.radiusCm > 50 ||
    s.radiusCm % 5 !== 0 ||
    !FILLS.includes(s.fill) ||
    !PLANS.includes(s.plan) ||
    !DROPS.includes(s.drop) ||
    !FORMS.includes(s.form) ||
    !["full", "after"].includes(s.phase)
  )
    throw new RangeError(
      "Choose a radius from 10 to 50 cm in 5 cm steps and one of the listed settings.",
    );
}
export function shapeGeometry(settings: ShapeSettings, form: Form = settings.form) {
  validateShapes(settings);
  if (!FORMS.includes(form)) throw new RangeError("Unknown chamber form.");
  const radius = settings.radiusCm / 100;
  const rimArea = Math.PI * radius ** 2;
  const tankArea =
    settings.plan === "octagon"
      ? 8 * radius ** 2 * Math.tan(Math.PI / 8)
      : rimArea * (settings.plan === "double" ? 2 : 6);
  const restLevel = radius * (settings.fill === "half" ? 0.5 : settings.fill === "roof" ? 1 : 1.25);
  const topInside = Math.min(restLevel, radius);
  const primitive = (height: number) => {
    const t = Math.max(0, Math.min(1, height / radius));
    const f =
      form === "cylinder" ? t : form === "hemisphere" ? t - t ** 3 / 3 : t - t * t + t ** 3 / 3;
    return rimArea * radius * f;
  };
  const totalVolume = primitive(radius);
  const sectionRadius = (height: number) => {
    const t = Math.max(0, Math.min(1, height / radius));
    return (
      radius *
      (form === "cylinder" ? 1 : form === "cone" ? 1 - t : Math.sqrt(Math.max(0, 1 - t * t)))
    );
  };
  const airVolume = (height: number) => {
    const t = Math.max(0, Math.min(1, height / radius));
    const gap = 1 - t;
    // Factored cap volumes avoid cancellation as the final pocket vanishes.
    return (
      rimArea *
      radius *
      (form === "cylinder" ? gap : form === "hemisphere" ? (gap * gap * (t + 2)) / 3 : gap ** 3 / 3)
    );
  };
  const atInside = (inside: number) => {
    if (!Number.isFinite(inside) || inside < 0 || inside > topInside)
      throw new RangeError("The inside water level is outside this chamber's operating range.");
    // Conserved water: A_tank*z_out - F(z_out) + F(z_in) = A_tank*z_rest.
    // The exterior's area is always positive, including the octagon's corner channels.
    const outside = boundedRoot(
      restLevel,
      restLevel + totalVolume / tankArea,
      (z) => tankArea * z - primitive(z),
      tankArea * restLevel - primitive(inside),
    );
    const head = Math.max(0, outside - inside);
    const volume = 1000 * airVolume(inside);
    const pressure = SHAPE_PHYSICS.rhoG * head;
    const stock = volume * (1 + pressure / SHAPE_PHYSICS.atmosphere);
    return { inside, outside, head, volume, pressure, stock };
  };
  const full = atInside(0);
  const rest = atInside(topInside);
  const atPressure = (pressure: number) => {
    if (!Number.isFinite(pressure)) throw new RangeError("Pressure must be finite.");
    if (pressure >= full.pressure) return full;
    if (pressure <= rest.pressure) return rest;
    const inside = boundedRoot(0, topInside, (z) => -atInside(z).pressure, -pressure);
    return atInside(inside);
  };
  return {
    radius,
    rimArea,
    tankArea,
    restLevel,
    topInside,
    primitive,
    airVolume,
    totalVolume,
    sectionRadius,
    atInside,
    atPressure,
    full,
    rest,
  };
}
export type ShapeGeometry = ReturnType<typeof shapeGeometry>;
export type ShapeReading = ReturnType<ShapeGeometry["atInside"]>;
export function shapeComparison(settings: ShapeSettings, form: Form = settings.form) {
  const g = shapeGeometry(settings, form);
  const targetPressure = g.full.pressure * (1 - settings.drop / 100);
  const after = g.atPressure(targetPressure);
  return {
    form,
    geometry: g,
    targetPressure,
    after,
    released: g.full.stock - after.stock,
    geometricRelease: g.full.volume - after.volume,
    endsEmpty: after.volume < 1e-9,
    reachesTarget: targetPressure >= g.rest.pressure - 1e-8,
  };
}
export function shapeCurve(settings: ShapeSettings, form: Form = settings.form) {
  const g = shapeGeometry(settings, form);
  // Equal inside-level steps preserve the sharp curvature near a dome's roof.
  return Array.from({ length: 81 }, (_, i) => g.atInside((g.topInside * i) / 80));
}
export function shapesQuery(settings: ShapeSettings): string {
  validateShapes(settings);
  return `?r=${settings.radiusCm}&fill=${settings.fill}&plan=${settings.plan}&drop=${settings.drop}&form=${settings.form}&phase=${settings.phase}`;
}
export function parseShapes(search: string): { settings: ShapeSettings; warning: boolean } {
  const params = new URLSearchParams(search);
  try {
    for (const name of ["r", "fill", "plan", "drop", "form", "phase"])
      if (params.getAll(name).length > 1) throw new Error("Ambiguous setting");
    const s: ShapeSettings = {
      radiusCm: params.has("r") ? Number(params.get("r")) : DEFAULT_SHAPES.radiusCm,
      fill: (params.get("fill") ?? DEFAULT_SHAPES.fill) as Fill,
      plan: (params.get("plan") ?? DEFAULT_SHAPES.plan) as Plan,
      drop: (params.has("drop") ? Number(params.get("drop")) : DEFAULT_SHAPES.drop) as Drop,
      form: (params.get("form") ?? DEFAULT_SHAPES.form) as Form,
      phase: (params.get("phase") ?? DEFAULT_SHAPES.phase) as ShapeSettings["phase"],
    };
    // Keep numeric spelling bounded too; Number('') and exponent notation are not shared states.
    if (params.has("r") && !/^\d{2}$/.test(params.get("r") ?? "")) throw new Error("Radius syntax");
    if (params.has("drop") && !/^\d{2}$/.test(params.get("drop") ?? ""))
      throw new Error("Drop syntax");
    validateShapes(s);
    return { settings: s, warning: false };
  } catch {
    return { settings: { ...DEFAULT_SHAPES }, warning: true };
  }
}
