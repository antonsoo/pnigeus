import { notebookJson } from "./core/notebook";
import {
  type SearchMode,
  TIMING,
  type TimingSettings,
  timingQuery,
  timingRun,
} from "./core/timing";
import { csv, escapeHtml, study } from "./files";
import { timingPlot } from "./timing-drawing";

export function timingTable(settings: TimingSettings): string {
  return `<div class="table-wrap"><table><caption>Current timing: ${settings.pipes} open pipes; tank area ${settings.tank} × chamber area. Pressures bracket each two-second release.</caption><thead><tr><th>Time, s</th><th>Strokes</th><th>Start, Pa</th><th>End, Pa</th><th>Below, s</th><th>Within, s</th><th>Above, s</th></tr></thead><tbody>${timingRun(
    settings,
  )
    .slots.map(
      (s) =>
        `<tr><td>${s.start.time}–${s.end.time}</td><td>${s.strokes}</td><td>${s.peak.toFixed(3)}</td><td>${s.trough.toFixed(3)}</td><td>${s.below.toFixed(6)}</td><td>${s.within.toFixed(6)}</td><td>${s.above.toFixed(6)}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
export function timingCsv(settings: TimingSettings): string {
  return [
    "slot,start_s,end_s,strokes,open_pipes,tank_over_chamber_area,target_low_pa,target_high_pa,release_start_pa,release_end_pa,below_s,within_s,above_s,starting_strokes,stroke_ambient_litres,exercise_budget,model",
    ...timingRun(settings).slots.map((s) =>
      [
        s.index + 1,
        s.start.time,
        s.end.time,
        s.strokes,
        settings.pipes,
        settings.tank,
        TIMING.low,
        TIMING.high,
        s.peak,
        s.trough,
        s.below,
        s.within,
        s.above,
        TIMING.prefill,
        1,
        TIMING.budget,
        "modern_quasi_static_constant_section",
      ].join(","),
    ),
    "",
  ].join("\r\n");
}

const account = (s: TimingSettings, label: string) => {
  const run = timingRun(s);
  return `<h3>${label}</h3><p>${s.pipes} open pipes; tank area ${s.tank} × chamber area; strokes at 0, 2, 4, 6, 8, 10 s: ${s.strokes.join(", ")}. ${run.used} of seven exercise strokes placed, in addition to three starting strokes.</p><p>Below target: ${run.below.toFixed(6)} s. Within: ${run.within.toFixed(6)} s. Above: ${run.above.toFixed(6)} s. Air through pipes: ${run.state.waterOut.toFixed(6)} ambient L. Vented: ${run.state.vented.toFixed(6)} ambient L.</p>`;
};

export async function timingReading(
  current: TimingSettings,
  kept: TimingSettings | null,
  note: string,
  signal?: AbortSignal,
  searchMode: SearchMode = "exact",
): Promise<string> {
  // Everything derived from the learner's choices is rendered before the first await.
  const commands = timingRun(current).commands;
  const notebook = notebookJson(
    { current, kept, explanation: note, searchMode },
    __PNIGEUS_EDITION__,
  );
  const section = `<h1>Seven strokes. Twelve seconds.</h1><p>Modern timing exercise for Pnigeus. The target of 400–1100 Pa is chosen for this worksheet, not measured from ancient pipes. Three starting strokes precede the clock. Each exercise stroke delivers one ambient-equivalent litre instantaneously at the start of its slot. Pipes remain open throughout.</p>
<div class="timing-static-wide">${timingPlot(current, kept)}</div><div class="timing-static-narrow">${timingPlot(current, kept, true)}</div><p>Solid blue: current. Dashed brown, if present: kept comparison. Green band: the chosen target. Both traces use the same pressure and time scales.</p>
${account(current, "Current timing")}${timingTable(current)}${kept ? account(kept, "Kept comparison") + timingTable(kept).replace("Current timing:", "Kept timing:") : ""}
<p>Search rule: ${searchMode === "exact" ? "spend exactly seven extra strokes" : "allow zero to seven extra strokes"}. This choice restricts the search; it does not change either recorded pressure trace.</p><p><a download="pnigeus-timing-notebook.json" href="data:application/json;charset=utf-8,${encodeURIComponent(notebook)}">Download editable notebook</a> to reopen both timings and the explanation in the workshop.</p><h3>My explanation</h3><pre>${escapeHtml(note || "No explanation recorded.")}</pre>
<p><a href="https://antonsoo.github.io/pnigeus/timing.html${escapeHtml(timingQuery(current, searchMode))}#timing">Reopen the current timing</a>. The kept comparison is retained in this file; the link opens only the current timing.</p>
<p><a download="pnigeus-timing.csv" href="data:text/csv;charset=utf-8,${encodeURIComponent(timingCsv(current))}">Download interval account CSV</a> · <a download="pnigeus-timing-events.csv" href="data:text/csv;charset=utf-8,${encodeURIComponent(csv(current.tank, commands))}">Download full action account CSV</a></p>
<p>Time within the band is integrated at threshold crossings, not counted from the graph's samples. The window measures pressure, not audible sound quality. There is no claim that this would sustain real pipes. Finite pumping time, effort, fluid inertia and acoustics are omitted.</p><hr/>`;
  const html = await study(current.tank, commands, false, signal);
  return html
    .replace(
      "</style>",
      `.timing-plot text{font-size:14px}.timing-plot.compact text{font-size:16px}h1{font-size:clamp(2rem,6vw,2.8rem)}.timing-static-narrow{display:none}@media(max-width:700px){.timing-static-wide{display:none}.timing-static-narrow{display:block}}@media print{.timing-static-wide{display:block}.timing-static-narrow{display:none}}</style>`,
    )
    .replace(
      "<title>Pnigeus — saved experiment</title>",
      "<title>Pnigeus — saved timing investigation</title>",
    )
    .replace(
      "<h1>The water inside a water organ</h1>",
      `${section}<h2>The water inside a water organ</h2>`,
    );
}
