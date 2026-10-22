import {
  type Command,
  dryPressure,
  pressureTrace,
  type State,
  type Tank,
  waterReading,
} from "./core/regulator";

const n = (value: number) => value.toFixed(3);
export function cutaway(state: State, tank: Tank, part = "head", compact = false): string {
  const r = waterReading(state.waterStock, tank);
  const y = (metres: number) => 520 - 600 * metres;
  const left = 380 - 60 * Math.sqrt(tank);
  const right = 760 - left;
  const inside = y(r.inside);
  const outside = y(r.outside);
  const pressure = r.pressure.toFixed(0);
  const chosen = (id: string) => (part === id ? "selected-part" : "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${compact ? "130 15 620 550" : "0 0 760 580"}" role="img" aria-labelledby="cut-title cut-desc" class="cutaway${compact ? " compact" : ""}" data-inside="${r.inside}" data-outside="${r.outside}" data-pressure="${r.pressure}">
  <title id="cut-title">Water-organ pressure chamber at ${pressure} pascals gauge pressure</title>
  <desc id="cut-desc">Outside water is ${(r.outside * 100).toFixed(2)} centimetres high; inside water is ${(r.inside * 100).toFixed(2)} centimetres. Their difference is ${(r.head * 100).toFixed(2)} centimetres. The open rim lets water pass. Air goes from the pump to the chamber, then to the pipes.</desc>
  <defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto-start-reverse"><path d="M0 0L6 3L0 6" fill="none" stroke="#936415"/></marker></defs>
  <g class="pipework" fill="none" stroke="#936415" stroke-width="9" stroke-linejoin="round"><path d="M91 262V115H350V211"/><path d="M410 211V70H626"/></g>
  <path d="M126 115H228" class="air-direction" marker-end="url(#arrow)"/><path d="M454 70H538" class="air-direction" marker-end="url(#arrow)"/>
  <text class="from-pump" x="178" y="96" text-anchor="middle">air from pump</text><text x="530" y="45" text-anchor="middle">air to pipes</text>
  <g class="pump-diagram ${chosen("pump")}"><rect x="56" y="255" width="70" height="153" rx="3" class="pump-body"/><path d="M62 335H120M91 338V451M58 451H124" class="mechanism"/><text x="91" y="483" text-anchor="middle">pump</text><path d="M91 293V269" class="air-direction" marker-end="url(#arrow)"/></g>
  <g class="${chosen("water")}"><path d="M${n(left)} 130V520H${n(right)}V130" class="tank-wall"/><rect x="${n(left + 3)}" y="${n(outside)}" width="${n(right - left - 6)}" height="${n(518 - outside)}" class="water-fill"/>
  <path d="M${n(left + 3)} ${n(outside)}H318M442 ${n(outside)}H${n(right - 3)}" class="water-line" data-surface="outside"/>
  <text x="${n(left - 12)}" y="${n(outside - 10)}" text-anchor="end" class="surface-label">outside</text></g>
  <g class="${chosen("bell")}"><path d="M320 496V208H440V496" class="bell-body"/><rect x="324" y="212" width="112" height="${n(inside - 212)}" class="trapped-air"/>
  <path d="M324 ${n(inside)}H436" class="water-line" data-surface="inside"/>
  <text x="380" y="244" text-anchor="middle" class="bell-label">trapped</text><text x="380" y="270" text-anchor="middle" class="bell-label">air</text>
  <text x="380" y="${n(Math.max(302, inside - 12))}" text-anchor="middle" class="surface-label">inside</text></g>
  <g class="${chosen("head")}"><path d="M551 ${n(outside)}H579M551 ${n(inside)}H579M565 ${n(outside)}V${n(inside)}" class="head-line"/>
  <text x="592" y="${n((outside + inside) / 2 + 6)}" class="head-label">${(r.head * 100).toFixed(1)} cm</text></g>
  <g class="${chosen("rim")}"><path d="M315 496H330M430 496H445" class="rim-line"/><path d="M382 501V537H488" class="annotation"/><text x="496" y="543">open rim</text></g>
  ${r.atRim ? '<g class="bubbles" fill="none" stroke="#936415" stroke-width="2"><circle cx="307" cy="475" r="5"/><circle cx="299" cy="449" r="7"/><circle cx="290" cy="416" r="9"/></g>' : ""}
  <text x="380" y="574" text-anchor="middle" class="plate-note">Modern constant-section model; vertical scale in metres</text>
  <path class="annotation scale-axis" d="M709 130V520M704 520H714M704 340H714M704 220H714"/><text class="scale-number" x="725" y="526">0</text><text class="scale-number" x="725" y="346">0.3</text><text class="scale-number" x="725" y="226">0.5</text>
  </svg>`;
}

export function trace(tank: Tank, commands: readonly Command[], dry: boolean): string {
  const points = pressureTrace(tank, commands);
  const last = points.at(-1);
  const duration = Math.max(5, last?.time ?? 0);
  const maximum = Math.max(
    1000,
    ...points.map((s) => waterReading(s.waterStock, tank).pressure),
    ...(dry ? points.map((s) => dryPressure(s.dryStock, tank)) : []),
  );
  const path = (kind: "water" | "dry") =>
    points
      .map(
        (s, i) =>
          `${i ? "L" : "M"}${n(56 + (s.time / duration) * 650)} ${n(196 - ((kind === "water" ? waterReading(s.waterStock, tank).pressure : dryPressure(s.dryStock, tank)) / maximum) * 164)}`,
      )
      .join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 250" role="img" aria-labelledby="trace-title"><title id="trace-title">Gauge pressure across ${duration} seconds of experiment time${dry ? ", water and dry chambers on one pressure scale" : ""}</title><path d="M56 28V196H706" class="chart-axis"/><path d="M56 114H706M56 32H706" class="chart-grid"/>
  <text x="47" y="201" text-anchor="end">0</text><text x="47" y="120" text-anchor="end">${(maximum / 2000).toFixed(1)}</text><text x="47" y="38" text-anchor="end">${(maximum / 1000).toFixed(1)}</text><text x="56" y="17">kPa</text>
  <path d="${path("water")}" class="trace-water" data-trace="water"/>${dry ? `<path d="${path("dry")}" class="trace-dry" data-trace="dry"/>` : ""}
  <text x="56" y="225">0</text><text x="706" y="225" text-anchor="end">${duration} s</text><text x="380" y="243" text-anchor="middle">experiment time; vertical jumps are pump strokes</text></svg>`;
}
