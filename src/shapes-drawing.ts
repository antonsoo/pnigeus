import { FORMS, formNames, type ShapeSettings, shapeComparison, shapeCurve } from "./core/shapes";

const n = (value: number) => value.toFixed(3);
export const formColours = { hemisphere: "#235f81", cylinder: "#8c4c2c", cone: "#466e45" } as const;
export function shapeSection(s: ShapeSettings, compact = false): string {
  const c = shapeComparison(s);
  const g = c.geometry;
  const reading = s.phase === "full" ? g.full : c.after;
  const width = compact ? 420 : 760;
  const height = compact ? 470 : 590;
  const pixelRadius = compact ? 130 : 180;
  const centre = compact ? 190 : 310;
  const bottom = compact ? 410 : 520;
  const left = centre - pixelRadius;
  const right = centre + pixelRadius;
  const tankLeft = compact ? 40 : 80;
  const tankRight = compact ? 360 : 610;
  const brace = compact ? 385 : 650;
  const y = (z: number) => bottom - (z / g.radius) * pixelRadius;
  const profile =
    s.form === "hemisphere"
      ? `M${left} ${bottom} A${pixelRadius} ${pixelRadius} 0 0 1 ${right} ${bottom}`
      : s.form === "cylinder"
        ? `M${left} ${bottom} V${bottom - pixelRadius} H${right} V${bottom}`
        : `M${left} ${bottom} L${centre} ${bottom - pixelRadius} L${right} ${bottom}`;
  const innerHalf = (g.sectionRadius(reading.inside) / g.radius) * pixelRadius;
  const outerHalf =
    reading.outside < g.radius ? (g.sectionRadius(reading.outside) / g.radius) * pixelRadius : 0;
  const outsidePath =
    reading.outside >= g.radius
      ? `M${tankLeft} ${n(y(reading.outside))} H${tankRight}`
      : `M${tankLeft} ${n(y(reading.outside))} H${n(centre - outerHalf)} M${n(centre + outerHalf)} ${n(y(reading.outside))} H${tankRight}`;
  const insidePath = `M${n(centre - innerHalf)} ${n(y(reading.inside))} H${n(centre + innerHalf)}`;
  const empty = reading.volume < 1e-9;
  const capHeight = y(reading.inside) - y(g.radius);
  const airLabel = empty
    ? `<text x="${centre}" y="${bottom - pixelRadius - 20}" text-anchor="middle" class="section-caption">chamber empty</text>`
    : capHeight > 35
      ? `<text x="${centre}" y="${n((y(reading.inside) + y(g.radius)) / 2 + 7)}" text-anchor="middle" class="pocket-label">air</text>`
      : "";
  const ticks = [0, 0.5, 1, 1.5, 2]
    .map(
      (t) =>
        `<path d="M${tankLeft - 8} ${y(t * g.radius)} h6"/><text x="${tankLeft - 14}" y="${y(t * g.radius) + 5}" text-anchor="end">${Number((t * s.radiusCm).toFixed(1))}</text>`,
    )
    .join("");
  return `<svg class="shape-section" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="shape-section-title shape-section-desc" data-form="${s.form}" data-inside="${reading.inside}" data-outside="${reading.outside}" data-pressure="${reading.pressure}" data-stock="${reading.stock}" data-scale="${pixelRadius / g.radius}" data-zero="${bottom}">
<title id="shape-section-title">${formNames[s.form]} ${empty ? "empty before the chosen endpoint" : s.phase === "full" ? "at the rim limit" : "at the chosen pressure endpoint"}</title><desc id="shape-section-desc">Water inside ${(reading.inside * 100).toFixed(3)} cm; outside ${(reading.outside * 100).toFixed(3)} cm above the rim. ${empty ? "The chamber is empty and supplies no wind. Its last pocket's limiting head was" : "Head"} ${(reading.head * 100).toFixed(3)} cm. The tank width is schematic. Chamber profile and all vertical heights share a scale.</desc>
<defs><clipPath id="shape-pocket"><path d="${profile} Z"/></clipPath></defs>
<g class="shape-ruler">${ticks}</g>
<text x="${tankLeft}" y="${compact ? 80 : 85}" class="section-caption">height above rim, cm</text>
<rect x="${tankLeft}" y="${n(y(reading.outside))}" width="${tankRight - tankLeft}" height="${n(bottom + 12 - y(reading.outside))}" class="section-water"/>
<rect x="${left - 1}" y="0" width="${2 * pixelRadius + 2}" height="${n(y(reading.inside))}" class="section-air" clip-path="url(#shape-pocket)"/>
<path d="M${tankLeft} ${compact ? 100 : 95} V${bottom + 12} H${tankRight} V${compact ? 100 : 95}" class="section-tank"/>
<path d="${profile}" class="section-bronze"/>
<path d="${outsidePath}" class="section-surface" data-surface="outside"/>
<path d="${insidePath}" class="section-surface" data-surface="inside"/>
<path d="M${brace} ${n(y(reading.outside))} V${n(y(reading.inside))} M${brace - 8} ${n(y(reading.outside))} H${brace + 8} M${brace - 8} ${n(y(reading.inside))} H${brace + 8}" class="section-head"/>
${compact ? "" : `<text x="${brace + 16}" y="${n((y(reading.outside) + y(reading.inside)) / 2 + 5)}" class="head-label">${(100 * reading.head).toFixed(1)} cm</text>`}
${airLabel}
${empty ? "" : `<path d="M${centre} ${bottom - pixelRadius + 4} V${bottom - pixelRadius - 32} m-5 7 5-7 5 7" class="section-outlet"/><text x="${centre}" y="${bottom - pixelRadius - 43}" text-anchor="middle" class="section-caption">to the windchest</text>`}
<text x="${centre}" y="${bottom + (compact ? 42 : 44)}" text-anchor="middle" class="section-caption">open rim · ${s.radiusCm * 2} cm diameter</text>
</svg>`;
}
export function tankPlan(s: ShapeSettings): string {
  const r = s.plan === "octagon" ? 44 : 50 / Math.sqrt(s.plan === "double" ? 2 : 6);
  const shape =
    s.plan === "octagon"
      ? `<polygon points="${Array.from({ length: 8 }, (_, i) => {
          const a = ((i + 0.5) * Math.PI) / 4;
          const q = r / Math.cos(Math.PI / 8);
          return `${64 + q * Math.cos(a)},${64 + q * Math.sin(a)}`;
        }).join(" ")}"/>`
      : '<circle cx="64" cy="64" r="50"/>';
  return `<svg class="tank-plan" viewBox="0 0 128 128" role="img" aria-label="Tank plan: ${s.plan === "octagon" ? "eight sides tangent to the circular chamber rim; water channels occupy the corners" : `${s.plan === "double" ? "two" : "six"} times the area of the chamber rim`}"><g fill="#a9cedd" stroke="#193648" stroke-width="2">${shape}</g><circle cx="64" cy="64" r="${r}" fill="#fff2cf" stroke="#936415" stroke-width="2.5"/><text x="64" y="68" text-anchor="middle" font-size="13" fill="#193648">rim</text></svg>`;
}
export function reservePlot(s: ShapeSettings, compact = false): string {
  const curves = FORMS.map((form) => ({
    form,
    c: shapeComparison(s, form),
    points: shapeCurve(s, form),
  }));
  const maxStock = Math.max(
    ...curves.map(({ c }) => c.geometry.full.stock - c.geometry.rest.stock),
  );
  const maxHead = Math.max(...curves.map(({ c }) => c.geometry.full.head * 1000));
  const axisStock = Math.ceil(maxStock / 5) * 5;
  const axisHead = Math.ceil(maxHead / 50) * 50;
  const width = compact ? 420 : 760;
  const left = compact ? 58 : 74;
  const right = width - 24;
  const top = 50;
  const bottom = compact ? 310 : 360;
  const x = (stock: number) => left + (stock / axisStock) * (right - left);
  const y = (head: number) => bottom - ((1000 * head) / axisHead) * (bottom - top);
  const grid = Array.from({ length: 5 }, (_, i) => {
    const f = i / 4;
    const stock = axisStock * f;
    const head = axisHead * f;
    return `<path d="M${left} ${y(head / 1000)} H${right}"/><text x="${left - 10}" y="${y(head / 1000) + 5}" text-anchor="end">${Number(head.toFixed(1))}</text><text x="${x(stock)}" y="${bottom + 25}" text-anchor="middle">${Number(stock.toFixed(1))}</text>`;
  }).join("");
  const paths = curves
    .map(({ form, c, points }) => {
      const d = points
        .map((p, i) => `${i ? "L" : "M"}${n(x(c.geometry.full.stock - p.stock))} ${n(y(p.head))}`)
        .join(" ");
      return `<path d="${d}" class="reserve-curve ${form}" data-form="${form}" stroke="${formColours[form]}"/><circle cx="${n(x(c.released))}" cy="${n(y(c.after.head))}" r="${form === s.form ? 6 : 4}" fill="${formColours[form]}" stroke="#fafbf9" stroke-width="2" data-endpoint="${form}"/>`;
    })
    .join("");
  return `<svg class="reserve-plot" viewBox="0 0 ${width} ${compact ? 400 : 450}" role="img" aria-labelledby="reserve-title reserve-desc" data-stock-axis="${axisStock}" data-head-axis="${axisHead}" data-left="${left}" data-right="${right}" data-top="${top}" data-bottom="${bottom}"><title id="reserve-title">Pressure as the full chamber supplies air</title><desc id="reserve-desc">Each curve uses the same footprint, chamber height, tank plan and initial fill. Points mark the chosen ${s.drop}% pressure drop relative to each form's own full pressure. Air supplied uses ambient-equivalent litres, including compression.</desc><text x="${left}" y="24" class="plot-axis-label">pressure head, mm water</text><g class="reserve-grid">${grid}</g>${paths}<text x="${(left + right) / 2}" y="${bottom + 61}" text-anchor="middle" class="plot-axis-label">air supplied since full, ambient L</text></svg>`;
}
