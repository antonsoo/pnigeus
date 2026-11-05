import {
  copyNotebook,
  NOTEBOOK_BYTES,
  notebookJson,
  readNotebook,
  type TimingNotebook,
} from "./core/notebook";
import { geometry, TANKS, type Tank } from "./core/regulator";
import {
  DEFAULT_TIMING,
  parseTiming,
  type SearchMode,
  searchTimings,
  TIMING,
  type TimingSettings,
  timingQuery,
  timingRun,
} from "./core/timing";
import { csv, download } from "./files";
import { offline } from "./offline";
import { timingPlot } from "./timing-drawing";
import { timingCsv, timingReading, timingTable } from "./timing-files";

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing interface element: ${selector}`);
  return element;
};
const parsed = parseTiming(location.search);
let current = parsed.settings;
let searchMode: SearchMode = parsed.searchMode;
let revision = 0;
let importGeneration = 0;
let previous: TimingNotebook | null = null;
let pending: TimingNotebook | null = null;
let kept: TimingSettings | null = null;
let search: ReturnType<typeof searchTimings> | null = null;
let saving: AbortController | null = null;
const compact = matchMedia("(max-width: 700px)");
const clone = (s: TimingSettings): TimingSettings => ({ ...s, strokes: [...s.strokes] });

$("#app").innerHTML =
  `<header><a class="wordmark" href="./">Pnigeus <span lang="grc">πνιγεύς</span></a><nav aria-label="Study navigation"><a href="./#experiment">Pump workshop</a><a href="shapes.html">Shape study</a><a href="#timing-source">Read the mechanism</a></nav></header>
<main><div class="intro"><h1>Seven strokes.<br/> Twelve seconds.</h1><p>The pipes keep taking air. You decide when to replace it. Can the same seven strokes produce a better pressure history?</p></div>
<section id="timing" aria-label="Pump timing experiment"><p class="timing-kicker">A wind supply is a timing problem</p><h2>Place the strokes. Keep the pressure.</h2><p>The chamber starts with <strong>three strokes already stored</strong>. Place up to seven more at the six marked instants. The chosen target is <strong>400–1100 Pa for all twelve seconds</strong>. This is a modern pressure exercise; it does not establish when real ancient pipes would sound.</p><p id="timing-warning" role="status"></p>
<div class="timing-bench"><div class="timing-console"><div class="timing-settings"><label for="timing-pipes">Pipes open throughout<select id="timing-pipes">${[1, 2, 3, 4].map((n) => `<option value="${n}">${n} ${n === 1 ? "pipe" : "pipes"}</option>`).join("")}</select></label><label for="timing-tank">Total tank area<select id="timing-tank">${TANKS.map((n) => `<option value="${n}">${n} × chamber area</option>`).join("")}</select></label></div>
<div class="timing-budget"><strong id="timing-budget"></strong><span>Each stroke: +1 ambient-equivalent litre. Instantaneous deliveries; no pump effort or stroke duration.</span></div>
<fieldset><legend>Strokes at the start of each two-second slot</legend><div class="timing-slots">${Array.from({ length: TIMING.slots }, (_, i) => `<label class="timing-slot" for="slot-${i}"><span>${i * 2}<small>seconds</small></span><select id="slot-${i}" data-slot="${i}" aria-label="Strokes at ${i * 2} seconds">${Array.from({ length: 8 }, (_, n) => `<option value="${n}">${n}</option>`).join("")}</select><small>strokes</small><output id="slot-result-${i}" for="slot-${i}"></output></label>`).join("")}</div></fieldset>
<div class="timing-presets" role="group" aria-label="Prepared timings"><button type="button" data-timing-preset="early">All at the start</button><button type="button" data-timing-preset="spread">Two, then one per slot</button><button type="button" data-timing-preset="late">All at the end</button><button type="button" data-timing-preset="clear">Clear strokes</button></div></div>
<div class="timing-instruments"><div class="timing-results" aria-label="Time in pressure ranges"><p><strong id="timing-below"></strong><span>seconds below 400 Pa</span></p><p><strong id="timing-within"></strong><span>seconds within target</span></p><p><strong id="timing-above"></strong><span>seconds above 1100 Pa</span></p></div><p id="timing-verdict"></p><div id="timing-plot"></div><p class="timing-legend"><span>Solid blue: current timing.</span> <span>Green: chosen pressure target.</span> <span id="kept-legend" hidden>Dashed brown: kept comparison.</span></p><p class="hint">The graph samples the curves. Time in each range uses the threshold crossings, so a short excursion still counts. The three starting strokes precede this clock.</p></div></div>
<div class="timing-comparison"><div><h3>Keep one. Change the other.</h3><p id="timing-kept">Keep a timing before moving its strokes. The comparison stays fixed while you edit.</p></div><div class="button-row"><button id="timing-keep" type="button">Keep this timing</button><button id="timing-forget" type="button" disabled>Clear comparison</button></div></div>
<p id="timing-air"></p><details><summary>Inspect every interval and crossing</summary><div id="timing-table"></div></details>
<div class="timing-inquiry"><h3>Is this target possible?</h3><p>First try moving a stroke from a high-pressure interval to a later low one. Then change the rule: must all seven strokes be spent, or may some air remain unused? Try one open pipe under each rule. The search covers the current pipe count and tank. This searches six delivery instants, not every physically possible pumping action.</p><label for="timing-rule">Air allowance<select id="timing-rule"><option value="exact">Use all seven extra strokes</option><option value="at-most">Allow zero to seven extra strokes</option></select></label><button id="timing-search" type="button">Check all allowed timings</button><p id="timing-search-result" role="status"></p><button id="timing-load-best" type="button" hidden>Load one best timing</button></div>
<label class="timing-note" for="timing-note">Explain the comparison<textarea id="timing-note" rows="3" maxlength="4000" placeholder="Why can the same supplied air leave a different pressure history?"></textarea></label><p class="hint">Save an editable notebook to reopen both timings, the search rule and your explanation. Illustrated readings also retain the source pages. Shared links contain the current settings and search rule.</p>
<div class="export-row"><button id="notebook-save" type="button">Save editable notebook</button><label for="notebook-open">Open notebook <input id="notebook-open" type="file" accept=".json,application/json"/></label><button id="notebook-previous" type="button" hidden>Switch to previous notebook</button></div><p id="notebook-status" role="status"></p><div id="notebook-conflict" hidden><p>You edited this notebook while the file was opening. Both choices preserve this work for switching back.</p><button id="notebook-accept" type="button">Open file and keep this work</button><button id="notebook-reject" type="button">Keep current work</button></div><div class="export-row"><button id="timing-share" type="button">Show timing link</button><button id="timing-csv" type="button">Save interval CSV</button><button id="timing-events" type="button">Save full action CSV</button><button id="timing-reading" type="button">Save illustrated reading</button><button id="timing-cancel" type="button" hidden>Cancel saving</button></div><p id="timing-export-status" role="status"></p><a id="timing-link" hidden></a><p id="timing-status" role="status" aria-live="polite"></p></section>
<section class="source-section" id="timing-source"><h2>What belongs to the ancient mechanism?</h2><p>Hero’s <cite>Pneumatics</cite>, section 76, describes a hand-operated piston sending air into the submerged chamber, then through a transverse tube to whichever pipes have their openings aligned. His description supplies this arrangement. It gives neither our seven-stroke allowance nor our pressure window.</p><p><a href="./#reading">Inspect the retained explanatory drawing and read Vitruvius’s Latin</a> · <a href="shapes.html#greek">Read Hero’s Greek chamber instruction beside the printed page</a> · <a href="https://www.gutenberg.org/cache/epub/77400/pg77400-images.html#Page_105">Read the complete 1851 translation, pp. 105–107</a>.</p><h3>Why does timing change the result?</h3><p>In this model the open pipes take air at a rate proportional to the square root of gauge pressure. An early excess raises that rate; leaving a delivery until later can preserve air for later demand. The water chamber buffers pressure but does not keep it constant. The separate stock, outlet and vent totals close the account.</p><pre>same delivered air ≠ same outlet rate through time
1 litre now → higher pressure now → faster model outflow now</pre><p>All geometry uses the pump workshop’s straight-sided chamber, not Hero’s hemisphere. Air stays at constant temperature and water settles instantly. Slots, starting stock, the target band, one-litre strokes and the outlet law are modern choices. No ancient pumping cadence, tolerable pitch drift or actual pipe response is reconstructed. The search optimizes only time inside this chosen band; it does not minimize human effort.</p><p><a href="./#model">Inspect the complete physical assumptions and equations</a> · <a href="https://github.com/antonsoo/pnigeus/blob/main/docs/timing-model.md">Derivation and reviewable scope</a>.</p></section></main>
<footer><p id="offline" role="status">Saving the complete edition for offline use…</p><p><a href="https://github.com/antonsoo/pnigeus">Source repository</a> · Original model and drawings: PolyForm Noncommercial © 2026 Anthony Mercer. Historical source drawing: public domain.</p></footer>`;

function update(message = ""): void {
  $<HTMLSelectElement>("#timing-rule").value = searchMode;
  const run = timingRun(current);
  const remaining = TIMING.budget - run.used;
  $<HTMLSelectElement>("#timing-pipes").value = String(current.pipes);
  $<HTMLSelectElement>("#timing-tank").value = String(current.tank);
  $("#timing-budget").textContent = `${remaining} of seven strokes left to place`;
  for (let i = 0; i < TIMING.slots; i++) {
    const select = $<HTMLSelectElement>(`#slot-${i}`);
    const count = current.strokes[i] ?? 0;
    select.value = String(count);
    for (const option of select.options) option.disabled = Number(option.value) > remaining + count;
    const slot = run.slots[i];
    if (slot) $(`#slot-result-${i}`).textContent = `${slot.within.toFixed(2)} / 2 s in target`;
  }
  $("#timing-below").textContent = run.below.toFixed(3);
  $("#timing-within").textContent = run.within.toFixed(3);
  $("#timing-above").textContent = run.above.toFixed(3);
  $("#timing-verdict").textContent = run.complete
    ? "All twelve seconds stay inside the chosen target."
    : "Some of the twelve seconds fall outside the chosen target. Inspect the intervals below.";
  $("#timing-plot").innerHTML = timingPlot(current, kept, compact.matches);
  $("#timing-table").innerHTML = timingTable(current);
  $("#timing-air").textContent =
    `Air account: ${run.state.supplied.toFixed(3)} L supplied (${TIMING.prefill} starting + ${run.used} placed), ${run.state.waterOut.toFixed(3)} L through pipes, ${run.state.vented.toFixed(3)} L vented, ${(run.state.waterStock - geometry(current.tank).baseVolume).toFixed(3)} L extra stock left. All are ambient-equivalent litres; the unpressurized air remains.`;
  $<HTMLButtonElement>("#timing-forget").disabled = !kept;
  $("#kept-legend").hidden = !kept;
  if (kept) {
    const saved = timingRun(kept);
    $("#timing-kept").textContent =
      `Kept: ${kept.strokes.join(" / ")} strokes; ${kept.pipes} pipes; tank ×${kept.tank}. ${saved.within.toFixed(3)} s within target. Current minus kept: ${(run.within - saved.within).toFixed(3)} s. Retained in editable notebooks and illustrated readings.`;
  } else
    $("#timing-kept").textContent =
      "Keep a timing before moving its strokes. The comparison stays fixed while you edit.";
  $("#timing-search-result").textContent = search
    ? `${search.count} allocations checked with ${current.pipes} pipes and tank ×${current.tank}. ${search.full} stay in target for all twelve seconds. Best time within target: ${search.bestSeconds.toFixed(6)} s. ${search.minimumCompleteStrokes === null ? "No complete timing under this rule." : `Fewest extra strokes for a complete timing: ${search.minimumCompleteStrokes}.`} Rule: ${searchMode === "exact" ? "exactly seven" : "zero to seven"}. Equal times prefer fewer strokes, then the first allocation; no unique optimum is claimed.`
    : "";
  $("#timing-load-best").hidden = !search;
  if (message) $("#timing-status").textContent = message;
}
function change(next: TimingSettings, message: string): void {
  // Validate and finish the new result before replacing the current account.
  timingRun(next);
  if (next.tank !== current.tank || next.pipes !== current.pipes) search = null;
  current = clone(next);
  revision++;
  history.pushState(null, "", `${timingQuery(current, searchMode)}#timing`);
  $("#timing-warning").textContent = "";
  $("#timing-link").hidden = true;
  update(message);
}
for (let i = 0; i < TIMING.slots; i++)
  $(`#slot-${i}`).addEventListener("change", () => {
    const strokes = [...current.strokes];
    strokes[i] = Number($<HTMLSelectElement>(`#slot-${i}`).value);
    try {
      change(
        { ...current, strokes },
        `Timing at ${i * 2} seconds changed. Pressure history recalculated.`,
      );
    } catch {
      update("Only seven strokes are available. Remove a stroke elsewhere first.");
    }
  });
$("#timing-pipes").addEventListener("change", () =>
  change(
    { ...current, pipes: Number($<HTMLSelectElement>("#timing-pipes").value) },
    "Pipe demand changed; your strokes stay at the same times.",
  ),
);
$("#timing-tank").addEventListener("change", () =>
  change(
    { ...current, tank: Number($<HTMLSelectElement>("#timing-tank").value) as Tank },
    "Tank area changed; your strokes stay at the same times.",
  ),
);
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-timing-preset]"))
  button.addEventListener("click", () => {
    const presets = {
      early: DEFAULT_TIMING.strokes,
      spread: [2, 1, 1, 1, 1, 1],
      late: [0, 0, 0, 0, 0, 7],
      clear: [0, 0, 0, 0, 0, 0],
    };
    const strokes = presets[button.dataset.timingPreset as keyof typeof presets];
    change(
      { ...current, strokes },
      "Prepared timing loaded. Starting stock, pipe count and tank area are unchanged.",
    );
  });
$("#timing-keep").addEventListener("click", () => {
  revision++;
  kept = clone(current);
  update("Current timing kept for comparison. Later edits leave it fixed.");
});
$("#timing-forget").addEventListener("click", () => {
  revision++;
  kept = null;
  update("Comparison cleared.");
});
$("#timing-search").addEventListener("click", () => {
  search = searchTimings(current.tank, current.pipes, searchMode);
  update();
});
$("#timing-load-best").addEventListener("click", () => {
  if (search)
    change(
      search.best,
      "One timing with the best time in target is loaded. Inspect how it spends the strokes.",
    );
});
$("#timing-csv").addEventListener("click", () =>
  download("pnigeus-timing.csv", "text/csv;charset=utf-8", timingCsv(current)),
);
$("#timing-events").addEventListener("click", () =>
  download(
    "pnigeus-timing-events.csv",
    "text/csv;charset=utf-8",
    csv(current.tank, timingRun(current).commands),
  ),
);
$("#timing-share").addEventListener("click", () => {
  const link = $<HTMLAnchorElement>("#timing-link");
  link.href = `https://antonsoo.github.io/pnigeus/timing.html${timingQuery(current, searchMode)}#timing`;
  link.textContent = link.href;
  link.hidden = false;
});
$("#timing-reading").addEventListener("click", () => {
  const button = $<HTMLButtonElement>("#timing-reading");
  const controller = new AbortController();
  saving = controller;
  $("#timing-cancel").hidden = false;
  button.disabled = true;
  $("#timing-export-status").textContent =
    "Preparing the timing comparison, source drawing, Latin reading and fonts…";
  void timingReading(
    clone(current),
    kept ? clone(kept) : null,
    $<HTMLTextAreaElement>("#timing-note").value,
    controller.signal,
    searchMode,
  )
    .then((html) => {
      download("pnigeus-timing-reading.html", "text/html;charset=utf-8", html);
      $("#timing-export-status").textContent =
        "Illustrated timing reading saved with the settings captured when saving began.";
    })
    .catch((error: unknown) => {
      $("#timing-export-status").textContent = controller.signal.aborted
        ? "Saving cancelled. Your timing and explanation are unchanged."
        : error instanceof Error
          ? error.message
          : "Could not save the reading. Try again.";
    })
    .finally(() => {
      button.disabled = false;
      saving = null;
      $("#timing-cancel").hidden = true;
    });
});
$("#timing-cancel").addEventListener("click", () => saving?.abort());
window.addEventListener("pagehide", () => saving?.abort());
window.addEventListener("popstate", () => {
  const parsed = parseTiming(location.search);
  if (parsed.settings.tank !== current.tank || parsed.settings.pipes !== current.pipes)
    search = null;
  if (searchMode !== parsed.searchMode) search = null;
  searchMode = parsed.searchMode;
  current = parsed.settings;
  revision++;
  $("#timing-warning").textContent = parsed.warning;
  $("#timing-link").hidden = true;
  update("Timing restored from the address. The kept comparison stays fixed.");
});

const capture = (): TimingNotebook =>
  copyNotebook({
    current,
    kept,
    explanation: $<HTMLTextAreaElement>("#timing-note").value,
    searchMode,
  });
function openNotebook(book: TimingNotebook): void {
  previous = capture();
  const next = copyNotebook(book);
  current = next.current;
  kept = next.kept;
  searchMode = next.searchMode;
  $<HTMLTextAreaElement>("#timing-note").value = next.explanation;
  revision++;
  search = null;
  pending = null;
  $("#notebook-conflict").hidden = true;
  $("#notebook-previous").hidden = false;
  $("#timing-link").hidden = true;
  $("#timing-warning").textContent = "";
  history.pushState(null, "", `${timingQuery(current, searchMode)}#timing`);
  $("#notebook-status").textContent =
    "Notebook opened. Use Switch to previous notebook to recover the other work.";
  update("Notebook opened. Previous work is available with Switch to previous notebook.");
}
$("#timing-note").addEventListener("input", () => revision++);
$("#timing-rule").addEventListener("change", () => {
  searchMode = $<HTMLSelectElement>("#timing-rule").value as SearchMode;
  revision++;
  search = null;
  history.pushState(null, "", `${timingQuery(current, searchMode)}#timing`);
  $("#timing-link").hidden = true;
  update("Air allowance changed. Check the timings again under this rule.");
});
$("#notebook-save").addEventListener("click", () => {
  download(
    "pnigeus-timing-notebook.json",
    "application/json;charset=utf-8",
    notebookJson(capture(), __PNIGEUS_EDITION__),
  );
  $("#notebook-status").textContent =
    "Editable notebook saved with both timings and your explanation.";
});
$("#notebook-open").addEventListener("change", () => {
  const input = $<HTMLInputElement>("#notebook-open");
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  const started = revision;
  const generation = ++importGeneration;
  pending = null;
  $("#notebook-conflict").hidden = true;
  if (file.size > NOTEBOOK_BYTES) {
    $("#notebook-status").textContent =
      "Choose a notebook under 32 KiB. Your current work is unchanged.";
    return;
  }
  void file
    .text()
    .then((text) => {
      if (generation !== importGeneration) return;
      const book = readNotebook(text);
      if (revision !== started) {
        pending = book;
        $("#notebook-conflict").hidden = false;
        $("#notebook-status").textContent = "File checked; waiting for your choice.";
      } else {
        openNotebook(book);
        $("#notebook-status").textContent =
          "Notebook opened. Both accounts were recomputed with the recorded model assumptions.";
      }
    })
    .catch((error: unknown) => {
      if (generation !== importGeneration) return;
      $("#notebook-status").textContent =
        `${error instanceof Error ? error.message : "Could not read the file."} Current work is unchanged.`;
    });
});
$("#notebook-accept").addEventListener("click", () => {
  if (pending) openNotebook(pending);
});
$("#notebook-reject").addEventListener("click", () => {
  pending = null;
  $("#notebook-conflict").hidden = true;
  $("#notebook-status").textContent = "Current work kept.";
});
$("#notebook-previous").addEventListener("click", () => {
  if (previous) openNotebook(previous);
});

compact.addEventListener("change", () => update());
$("#timing-warning").textContent = parsed.warning;
update();
void offline($("#offline"));
