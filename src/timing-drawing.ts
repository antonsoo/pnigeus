import { pressureTrace, waterReading } from "./core/regulator";
import { TIMING, type TimingSettings, timingCommands, timingRun } from "./core/timing";

export function timingPlot(
  current: TimingSettings,
  kept: TimingSettings | null,
  compact = false,
): string {
  const sets = [current, ...(kept ? [kept] : [])].map((settings) => ({
    settings,
    points: pressureTrace(settings.tank, timingCommands(settings)).slice(TIMING.prefill + 1),
  }));
  const width = compact ? 380 : 960;
  const height = 300;
  const prefix = compact ? "timing-phone" : "timing";
  const left = 52;
  const right = width - 20;
  const top = 28;
  const bottom = 250;
  const maximum = Math.max(
    1500,
    ...sets.flatMap(({ settings, points }) =>
      points.map((p) => Math.ceil(waterReading(p.waterStock, settings.tank).pressure / 500) * 500),
    ),
  );
  const x = (t: number) => left + (t / 12) * (right - left);
  const y = (p: number) => bottom - (p / maximum) * (bottom - top);
  const path = ({ settings, points }: (typeof sets)[number]) =>
    points
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${x(p.time).toFixed(3)} ${y(waterReading(p.waterStock, settings.tank).pressure).toFixed(3)}`,
      )
      .join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${prefix}-title ${prefix}-desc" class="timing-plot${compact ? " compact" : ""}" data-maximum="${maximum}">
<title id="${prefix}-title">Pressure during twelve seconds of open pipes</title>
<desc id="${prefix}-desc">The shaded target is 400 to 1100 Pa. Solid blue is the current timing.${kept ? " Dashed brown is the kept timing, on the same axes." : ""} Vertical jumps are instantaneous deliveries; curved declines are air leaving through the pipes. The three starting strokes precede this clock.</desc>
<rect x="${left}" y="${y(TIMING.high)}" width="${right - left}" height="${y(TIMING.low) - y(TIMING.high)}" fill="#dcebdc"/>
${[0, TIMING.low, TIMING.high, maximum].map((p) => `<path d="M${left} ${y(p)}H${right}" fill="none" stroke="#a6bcb1" stroke-dasharray="3 5"/><text x="${left - 7}" y="${y(p) + 5}" text-anchor="end">${p}</text>`).join("")}
${Array.from({ length: 7 }, (_, i) => `<path d="M${x(i * 2)} ${top}V${bottom}" fill="none" stroke="#d2dce2"/><text x="${x(i * 2)}" y="273" text-anchor="middle">${i * 2}</text>`).join("")}
<text x="${left}" y="17">Pa</text><text x="${right}" y="293" text-anchor="end">seconds</text>
${sets[1] ? `<path d="${path(sets[1])}" fill="none" stroke="#936415" stroke-width="2.5" stroke-dasharray="8 5" data-timing-trace="kept"/>` : ""}
<path d="${path(sets[0] as (typeof sets)[number])}" fill="none" stroke="#235779" stroke-width="3" data-timing-trace="current"/>
${timingRun(current)
  .slots.map(
    (slot) => `<circle cx="${x(slot.start.time)}" cy="${y(slot.peak)}" r="4" fill="#235779"/>`,
  )
  .join("")}</svg>`;
}
