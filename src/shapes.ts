import {
  DEFAULT_SHAPES,
  DROPS,
  FILLS,
  FORMS,
  type Form,
  fillNames,
  formNames,
  PLANS,
  parseShapes,
  planNames,
  type ShapeSettings,
  shapeComparison,
  shapesQuery,
} from "./core/shapes";
import { download, escapeHtml } from "./files";
import { offline } from "./offline";
import {
  type GreekWord,
  greekNotes,
  greekReading,
  shapeBoundaries,
  sourceScan,
} from "./shapes-content";
import { formColours, reservePlot, shapeSection, tankPlan } from "./shapes-drawing";
import { comparisonTable, shapesCsv, shapesReading } from "./shapes-files";

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing interface element: ${selector}`);
  return element;
};
const parsed = parseShapes(location.search);
let settings: ShapeSettings = parsed.settings;
let sourceFull = false;
let word: GreekWord = "hemisphere";
const media = matchMedia("(max-width: 1000px)");

$("#app").innerHTML =
  `<header><a class="wordmark" href="./">Pnigeus <span lang="grc">πνιγεύς</span></a><nav aria-label="Study navigation"><a href="./#experiment">Pump workshop</a><a href="#shape-workshop">Shapes</a><a href="#greek">Read Greek</a></nav></header><main>
<div class="intro"><h1>The shape <br>of stored wind</h1><p>Hero calls the air chamber a hollow hemisphere. How much wind does that shape hold? Compare three forms, change the water fill, then read the Greek behind the dome.</p></div>
<section id="shape-workshop" aria-label="Shape and wind reserve experiment"><div class="shape-section-heading"><p class="eyebrow">Geometry at work</p><h2>How much air before pressure falls?</h2><p>Start with inside water at the open rim: the chamber’s storage limit. Choose an acceptable pressure drop, then compare the air each form supplies.</p></div><p id="shape-warning" role="status"></p>
<div class="shape-workbench"><div class="shape-plate"><div class="phase-buttons" role="group" aria-label="Chamber state"><button type="button" data-phase="full">At the rim limit</button><button type="button" data-phase="after">After supplying air</button></div><div id="shape-section"></div><p id="shape-levels" class="level-pair"></p><p id="section-note" class="section-note">Chamber profile and water heights share a scale. Tank width is schematic; the plan on the right supplies the actual area. Heights begin at the open rim.</p></div>
<div class="shape-controls"><fieldset><legend>Common dimensions</legend><label for="radius" class="radius-label">Rim radius <output id="radius-output" for="radius"></output></label><input id="radius" type="range" min="10" max="50" step="5"/><p id="radius-help" class="hint">The chamber’s height equals its radius. All three forms use the same footprint and height.</p></fieldset>
<fieldset><legend>Water and tank</legend><label for="fill">Before pumping, water is…</label><select id="fill">${FILLS.map((fill) => `<option value="${fill}">${fillNames[fill]}</option>`).join("")}</select><label for="plan">Tank plan</label><select id="plan">${PLANS.map((plan) => `<option value="${plan}">${planNames[plan]}</option>`).join("")}</select><div class="plan-choice"><div id="tank-plan"></div><p id="plan-note"></p></div></fieldset>
<label for="drop">Permitted pressure drop</label><select id="drop">${DROPS.map((drop) => `<option value="${drop}">${drop}% below each form’s full pressure${drop === 90 ? " (near empty)" : ""}</option>`).join("")}</select><p class="hint">A criterion for this experiment. No ancient tolerance is known from these passages.</p>
<div class="shape-current" aria-label="Selected chamber measurements"><p><strong id="shape-pressure"></strong><span>Pa above atmosphere now</span></p><p><strong id="shape-volume"></strong><span>actual litres in the chamber</span></p><p><strong id="shape-delivered"></strong><span>ambient litres supplied since full</span></p><p><strong id="shape-head"></strong><span>mm water head now</span></p></div><p id="shape-status" role="status"></p></div></div>
<div class="shape-inspection"><h3>Inspect a form</h3><div class="form-selector" role="group" aria-label="Form in section drawing">${FORMS.map((form) => `<button type="button" class="form-choice" data-form-choice="${form}">${formNames[form]}</button>`).join("")}</div></div>
<div class="table-wrap shape-table" tabindex="0" role="region" aria-label="Chamber comparison table; scroll horizontally on a small screen">${comparisonTable(settings)}</div><p class="table-scroll-hint">Scroll the table sideways for supplied gas and space lost.</p><p id="table-help" class="table-help">Actual chamber volume and ambient-equivalent gas are different quantities. The gas column includes isothermal compression. Each endpoint uses its own form’s full pressure.</p>
<div class="reserve-layout"><div><div id="reserve-plot"></div><ul class="curve-legend">${FORMS.map((form) => `<li><svg viewBox="0 0 24 12" aria-hidden="true"><path d="M1 6 H23" class="reserve-curve ${form}" stroke="${formColours[form]}"/></svg>${formNames[form]}</li>`).join("")}</ul><p class="hint">Dots mark the chosen pressure endpoints. All curves start full. Their different full pressures are part of this comparison.</p></div><div class="reserve-aside"><h3>Half the radius. One eighth the space.</h3><p id="scaling-note"></p><div class="radius-actions"><button id="half-radius" type="button">Halve the radius</button><button id="published-case" type="button">Open the 80 cm study case</button></div><p class="hint">The 80 cm case follows a geometric example discussed by Hagel (2023). Its dimensions and operating interpretation are a scholarly reconstruction.</p></div></div>
<div class="export-row"><button id="shape-share" type="button">Copy study link</button><button id="shape-csv" type="button">Save curves and comparison CSV</button><button id="shape-reading" type="button">Save illustrated Greek reading</button></div><p id="shape-export-status" role="status"></p><p id="shape-share-fallback" hidden></p></section>
${greekReading}${shapeBoundaries}</main><footer><p id="offline" role="status">Saving the complete edition for offline use…</p><p><a href="./#experiment">Return to the pump and listening workshop</a> · <a href="https://github.com/antonsoo/pnigeus">Source repository</a> · Code: PolyForm Noncommercial © 2026 Anthony Mercer</p></footer>`;

function update(): void {
  const c = shapeComparison(settings);
  const g = c.geometry;
  const current = settings.phase === "full" ? g.full : c.after;
  $("#shape-section").innerHTML = shapeSection(settings, media.matches);
  $("#shape-levels").innerHTML =
    `<span>Inside <b>${(current.inside * 100).toFixed(2)} cm</b></span><span>Outside <b>${(current.outside * 100).toFixed(2)} cm</b></span>`;
  const empty = current.volume < 1e-9;
  $("#shape-pressure").textContent = empty ? "Empty" : current.pressure.toFixed(0);
  $("#shape-pressure + span").textContent = empty
    ? "no air pocket to supply wind"
    : "Pa above atmosphere now";
  $("#shape-head + span").textContent = empty
    ? "mm: last pocket’s limiting head"
    : "mm water head now";
  $("#shape-volume").textContent = current.volume.toFixed(2);
  $("#shape-delivered").textContent = (settings.phase === "full" ? 0 : c.released).toFixed(2);
  $("#shape-head").textContent = (current.head * 1000).toFixed(2);
  $("#shape-status").textContent =
    settings.phase === "full"
      ? `${formNames[settings.form]}: inside water is at the open rim. Further air would escape underneath.`
      : c.reachesTarget
        ? `${settings.drop}% below this form’s full pressure. ${c.released.toFixed(2)} ambient L supplied; ${c.geometricRelease.toFixed(2)} actual L of chamber space lost.`
        : `The chamber empties before a ${settings.drop}% pressure drop is reached. The last pocket’s limiting head is ${(1000 * g.rest.head).toFixed(2)} mm; an empty chamber supplies no wind.`;
  $<HTMLInputElement>("#radius").value = String(settings.radiusCm);
  $("#radius-output").textContent = `${settings.radiusCm} cm`;
  $<HTMLSelectElement>("#fill").value = settings.fill;
  $<HTMLSelectElement>("#plan").value = settings.plan;
  $<HTMLSelectElement>("#drop").value = String(settings.drop);
  $("#tank-plan").innerHTML = tankPlan(settings);
  $("#plan-note").textContent =
    settings.plan === "octagon"
      ? `The circle touches eight sides. Corner channels leave water ${((g.tankArea / g.rimArea - 1) * 100).toFixed(2)}% of the rim area outside it at rim height.`
      : `The round tank has ${settings.plan === "double" ? "twice" : "six times"} the rim circle’s area. Walls and plumbing have no volume in this model.`;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-phase]"))
    button.setAttribute("aria-pressed", String(button.dataset.phase === settings.phase));
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-form-choice]"))
    button.setAttribute("aria-pressed", String(button.dataset.formChoice === settings.form));
  for (const form of FORMS) {
    const row = $(`[data-form-row="${form}"]`);
    const r = shapeComparison(settings, form);
    row.dataset.active = String(form === settings.form);
    $(`[data-form-row="${form}"] [data-metric="full-volume"]`).textContent =
      r.geometry.full.volume.toFixed(2);
    $(`[data-form-row="${form}"] [data-metric="full-head"]`).textContent = (
      1000 * r.geometry.full.head
    ).toFixed(2);
    $(`[data-form-row="${form}"] [data-metric="delivered"]`).textContent =
      r.released.toFixed(2) + (r.reachesTarget ? "" : "*");
    $(`[data-form-row="${form}"] [data-metric="space-lost"]`).textContent =
      r.geometricRelease.toFixed(2);
  }
  $(".shape-comparison caption").textContent =
    `Same rim and height, same initial fill and tank. Endpoint: ${settings.drop}% below each form’s own full pressure.`;
  $("#table-help").textContent =
    `Actual chamber volume and ambient-equivalent gas are different quantities. The gas column includes isothermal compression. ${FORMS.some((f) => !shapeComparison(settings, f).reachesTarget) ? "* Chamber empties before the requested pressure is reached." : "Each endpoint uses its own form’s full pressure."}`;
  $("#reserve-plot").innerHTML = reservePlot(settings, media.matches);
  const halfRadius = settings.radiusCm / 2;
  const halfSettings = { ...settings, radiusCm: halfRadius };
  const canHalve = Number.isInteger(halfRadius) && halfRadius >= 10 && halfRadius % 5 === 0;
  $<HTMLButtonElement>("#half-radius").disabled = !canHalve;
  if (canHalve) {
    const half = shapeComparison(halfSettings);
    $("#scaling-note").textContent =
      `For this ${formNames[settings.form].toLowerCase()}, reducing the radius from ${settings.radiusCm} to ${halfRadius} cm changes full air space from ${g.full.volume.toFixed(2)} to ${half.geometry.full.volume.toFixed(2)} L, and full head from ${(g.full.head * 1000).toFixed(2)} to ${(half.geometry.full.head * 1000).toFixed(2)} mm. Ambient gas stock changes by ${(g.full.stock / half.geometry.full.stock).toFixed(3)} times, rather than exactly eight, because compression changes too.`;
  } else
    $("#scaling-note").textContent =
      `At unchanged fill proportions and tank plan, halving a dimension halves the pressure head and divides geometric air volume by eight. Ambient gas stock has a further pressure correction. Choose a 20, 30, 40 or 50 cm radius to try halving within this control’s 5 cm steps.`;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-greek]"))
    button.setAttribute("aria-pressed", String(button.dataset.greek === word));
  const note = greekNotes[word];
  $("#greek-note").innerHTML =
    `<p><span class="transliteration">${note.transliteration}</span>${escapeHtml(note.note)}</p>`;
  $("#greek-scan").innerHTML = sourceScan(sourceFull);
  $("#source-detail").setAttribute("aria-pressed", String(!sourceFull));
  $("#source-full").setAttribute("aria-pressed", String(sourceFull));
}
function commit(): void {
  const next = `${location.pathname}${shapesQuery(settings)}${location.hash}`;
  if (next !== `${location.pathname}${location.search}${location.hash}`)
    history.pushState(null, "", next);
  $("#shape-warning").textContent = "";
  update();
}
for (const key of ["fill", "plan", "drop"] as const) {
  $<HTMLSelectElement>(`#${key}`).addEventListener("change", () => {
    const value = $<HTMLSelectElement>(`#${key}`).value;
    settings = { ...settings, [key]: key === "drop" ? Number(value) : value } as ShapeSettings;
    commit();
  });
}
$("#radius").addEventListener("input", () => {
  settings = { ...settings, radiusCm: Number($<HTMLInputElement>("#radius").value) };
  update();
});
$("#radius").addEventListener("change", commit);
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-form-choice]"))
  button.addEventListener("click", () => {
    settings = { ...settings, form: button.dataset.formChoice as Form };
    commit();
  });
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-phase]"))
  button.addEventListener("click", () => {
    settings = { ...settings, phase: button.dataset.phase as ShapeSettings["phase"] };
    commit();
  });
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-greek]"))
  button.addEventListener("click", () => {
    word = button.dataset.greek as GreekWord;
    update();
  });
$("#half-radius").addEventListener("click", () => {
  settings = { ...settings, radiusCm: settings.radiusCm / 2 };
  commit();
});
$("#published-case").addEventListener("click", () => {
  settings = { ...DEFAULT_SHAPES };
  commit();
});
$("#source-detail").addEventListener("click", () => {
  sourceFull = false;
  update();
});
$("#source-full").addEventListener("click", () => {
  sourceFull = true;
  update();
});
$("#shape-csv").addEventListener("click", () => {
  download("pnigeus-shape-curves.csv", "text/csv;charset=utf-8", shapesCsv({ ...settings }));
  $("#shape-export-status").textContent =
    "Saved all three forms, their endpoints and 81 curve points each. Actual volume and ambient gas have separate columns.";
});
$("#shape-reading").addEventListener("click", async () => {
  const button = $<HTMLButtonElement>("#shape-reading");
  const snapshot = { ...settings };
  button.disabled = true;
  $("#shape-export-status").textContent =
    "Checking the complete Greek page and fonts before saving…";
  try {
    download(
      "pnigeus-shape-reading.html",
      "text/html;charset=utf-8",
      await shapesReading(snapshot),
    );
    $("#shape-export-status").textContent =
      "Saved the illustrated reading with its Greek page, diagrams, grammar and fonts embedded. It opens offline.";
  } catch (error) {
    $("#shape-export-status").textContent =
      error instanceof Error ? error.message : "The reading could not be saved. Please try again.";
  } finally {
    button.disabled = false;
  }
});
$("#shape-share").addEventListener("click", async () => {
  const url = new URL(
    `shapes.html${shapesQuery(settings)}#shape-workshop`,
    new URL(import.meta.env.BASE_URL, location.origin),
  ).href;
  try {
    await navigator.clipboard.writeText(url);
    $("#shape-export-status").textContent =
      "Copied this study’s dimensions, fill, form, phase and pressure criterion.";
    $("#shape-share-fallback").hidden = true;
  } catch {
    $("#shape-share-fallback").hidden = false;
    $("#shape-share-fallback").textContent = url;
    $("#shape-export-status").textContent = "Copy this study link:";
  }
});
addEventListener("popstate", () => {
  const result = parseShapes(location.search);
  settings = result.settings;
  update();
  $("#shape-warning").textContent = result.warning
    ? "The shared settings were invalid or ambiguous. The whole study was reset to the 80 cm example."
    : "";
});
media.addEventListener("change", update);
update();
$("#shape-warning").textContent = parsed.warning
  ? "The shared settings were invalid or ambiguous. The whole study was reset to the 80 cm example."
  : "";
void offline($("#offline"));
