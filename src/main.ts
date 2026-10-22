import "./style.css";
import "./drawing.css";
import { modelReading, sourceReading, wordNotes } from "./content";
import { releasePcm, wave } from "./core/audio";
import {
  type Command,
  commandName,
  dryPressure,
  MAX_COMMANDS,
  pipeCount,
  replay,
  type Tank,
  waterReading,
} from "./core/regulator";
import { EXAMPLES, parseSession, shareQuery } from "./core/session";
import { cutaway, trace } from "./drawing";
import { csv, download, escapeHtml, study } from "./files";
import { offline } from "./offline";
import { Player } from "./player";

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing interface element: ${selector}`);
  return element;
};
const parsed = parseSession(location.search);
let tank: Tank = parsed.tank;
let commands: Command[] = parsed.commands;
let part = "head";
const player = new Player();

$("#app").innerHTML =
  `<header><a class="wordmark" href="./">Pnigeus <span lang="grc">πνιγεύς</span></a><nav aria-label="On this page"><a href="#experiment">Experiment</a><a href="#reading">Reading</a><a href="#model">Model</a></nav></header>
<main><div class="intro"><h1>The water inside <br>a water organ</h1><p>Pump air. Open a pipe. Watch the water hold a reserve of wind. <br>This ancient instrument joins music to a remarkable piece of mechanics.</p></div>
<section id="experiment" aria-label="Water-organ experiment"><div class="experiment-heading"><h2>Work the regulator</h2><p>The experiment is paused between actions. Try three pump strokes, open a pipe, then release.</p></div><p id="warning" role="status"></p>
<div class="bench"><div class="plate"><div id="cutaway"></div><p id="water-levels" class="water-levels"></p><div class="part-picker" role="group" aria-label="Inspect a part">${[
    ["head", "Pressure head"],
    ["bell", "Air chamber"],
    ["water", "Water"],
    ["rim", "Open rim"],
    ["pump", "Pump"],
  ]
    .map(
      ([id, text]) =>
        `<button type="button" data-part="${id}" aria-pressed="${id === "head"}">${text}</button>`,
    )
    .join("")}</div><p id="part-note" class="part-note"></p></div>
<div class="controls"><div class="controls-top"><label for="tank">Total tank area</label><select id="tank"><option value="3">3 × chamber area</option><option value="6">6 × chamber area</option><option value="12">12 × chamber area</option></select><p class="hint">Changing area replays your actions. Depth and chamber size stay fixed.</p></div>
<button class="pump-button" id="pump" type="button">Pump one stroke <span>+1 ambient-equivalent litre</span></button>
<fieldset><legend>Open the pipes</legend><div class="keys">${["A3", "C♯4", "E4", "A4"].map((pitch, i) => `<label class="key"><input type="checkbox" id="key-${i}" data-pipe="${i}"/><span>Pipe ${i + 1}<small>${pitch}</small></span></label>`).join("")}</div><p class="hint">These modern test tones mark air supply. No ancient tuning is inferred.</p></fieldset>
<div class="release-row"><button id="release" type="button">Release for 2 s</button><label class="time-choice">Duration<select id="seconds"><option value="2">2 seconds</option><option value="5">5 seconds</option></select></label></div>
<div class="current-readings" aria-label="Current measurements"><p><strong id="pressure">0</strong><span>Pa above atmosphere</span></p><p><strong id="head">0</strong><span>cm between water levels</span></p></div><p id="supply-note"></p><div class="small-actions"><button id="undo" type="button">Undo last action</button><button id="reset" type="button">Reset</button></div><p id="status" role="status" aria-live="polite"></p></div></div>
<div class="under-bench"><div class="history-plot"><div class="plot-heading"><h3>Pressure through the experiment</h3><label><input id="dry" type="checkbox"/> Compare a sealed dry chamber</label></div><div id="trace"></div><p id="chart-note">Solid blue: water chamber. Pump strokes add air at a single experiment time.</p></div><div class="ledger"><h3>Where did the air go?</h3><dl id="ledger"></dl><p class="hint">All stock and flow totals use ambient-equivalent litres. Actual compressed volume is listed separately.</p></div></div>
<div class="audio-bar"><div><h3>Hear the last release</h3><p id="audio-note">Release air to make a finite sound example.</p></div><div class="button-row"><button id="play" type="button">Play</button><button id="stop" type="button">Stop</button><button id="wav" type="button">Save WAV</button></div></div>
<div class="export-row"><button id="share" type="button">Copy experiment link</button><button id="csv" type="button">Save measurements CSV</button><button id="study" type="button">Save illustrated reading</button></div><p id="export-status" role="status"></p><p id="share-fallback" hidden></p>
<details class="history"><summary id="history-summary">Action history</summary><div class="table-wrap"><table><thead><tr><th>Action</th><th>Command</th><th>Time, s</th><th>Water, Pa</th><th>Dry, Pa</th></tr></thead><tbody id="history"></tbody></table></div></details>
<div class="try-row"><span>Try a prepared experiment:</span><button data-example="store" type="button">Store three strokes</button><button data-example="sound" type="button">One pipe for five seconds</button><button data-example="vent" type="button">Find the rim limit</button></div></section>
<section class="source-section">${sourceReading}</section><section class="model-section">${modelReading}</section>
</main><footer><p id="offline" role="status">Saving the complete edition for offline use…</p><p>Original explanatory model and drawings. Ancient sources supply the mechanism; modern assumptions supply these numbers.</p><p><a href="https://github.com/antonsoo/pnigeus">Source repository</a> · <a href="https://github.com/antonsoo/pnigeus/blob/main/THIRD_PARTY.md">Sources and rights</a> · Code: MIT © 2026 Anton Soloviev</p></footer>`;

const partNotes: Record<string, string> = {
  head: "Pressure comes from the vertical difference between the two connected water surfaces. Neither surface’s height above the floor is the head.",
  bell: "Air enters and leaves through the chamber’s roof. Pumping pushes inside water down and outside water up. The model has straight sides; the ancient descriptions give different shapes.",
  water:
    "The blue water is connected below the rim. It changes position without being consumed. The air above the outside surface stays at atmospheric pressure.",
  rim: "The chamber is open at the bottom. When inside water reaches this rim, any further delivered air escapes beneath it. Storage has a finite limit.",
  pump: "Each click stands for an idealized delivery of one litre measured at atmospheric pressure. Valve and piston motion, stroke time and pumping effort are omitted.",
};
function update(message = ""): void {
  const run = replay(tank, commands);
  const s = run.state;
  const r = waterReading(s.waterStock, tank);
  $("#cutaway").innerHTML = cutaway(s, tank, part, matchMedia("(max-width: 700px)").matches);
  $("#water-levels").textContent =
    `Inside ${(r.inside * 100).toFixed(2)} cm; outside ${(r.outside * 100).toFixed(2)} cm above the floor.`;
  $("#part-note").textContent = partNotes[part] ?? "";
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-part]"))
    button.setAttribute("aria-pressed", String(button.dataset.part === part));
  $<HTMLSelectElement>("#tank").value = String(tank);
  for (let i = 0; i < 4; i++) $<HTMLInputElement>(`#key-${i}`).checked = Boolean(s.mask & (1 << i));
  $("#pressure").textContent = r.pressure.toFixed(0);
  $("#head").textContent = (r.head * 100).toFixed(2);
  $("#supply-note").textContent = r.atRim
    ? "Inside water has reached the rim. Further pumped air vents underneath."
    : r.pressure < 1e-8
      ? "Both water surfaces are level. Air remains in the chamber, with no useful gauge pressure."
      : `${pipeCount(s.mask)} pipe${pipeCount(s.mask) === 1 ? " is" : "s are"} open. ${r.reserve.toFixed(3)} ambient-equivalent litres remain above the unpressurized stock.`;
  const dry = $<HTMLInputElement>("#dry").checked;
  $("#trace").innerHTML = trace(tank, commands, dry);
  $("#chart-note").textContent = dry
    ? `Solid blue: water chamber. Dashed brown: sealed, fixed-volume dry chamber, currently ${dryPressure(s.dryStock, tank).toFixed(0)} Pa. Both use the same pressure scale.`
    : "Solid blue: water chamber. Pump strokes add air at a single experiment time.";
  $("#ledger").innerHTML = [
    ["Supplied", s.supplied],
    ["Out through pipes", s.waterOut],
    ["Vented at rim", s.vented],
    ["Extra stock retained", r.reserve],
    ["Actual air volume", r.volume],
  ]
    .map(([name, value]) => `<div><dt>${name}</dt><dd>${Number(value).toFixed(3)} L</dd></div>`)
    .join("");
  $("#history").innerHTML =
    run.rows
      .map(
        (row) =>
          `<tr><td>${row.index}</td><td>${escapeHtml(commandName(row.command))}</td><td>${row.after.time}</td><td>${waterReading(row.after.waterStock, tank).pressure.toFixed(3)}</td><td>${dryPressure(row.after.dryStock, tank).toFixed(3)}</td></tr>`,
      )
      .join("") || '<tr><td colspan="5">Fresh chamber; no actions yet.</td></tr>';
  $("#history-summary").textContent =
    `Action history · ${commands.length} of ${MAX_COMMANDS} actions · ${s.time} s`;
  const last = run.rows.findLast((row) => row.command.type === "wait");
  $("#audio-note").textContent = last
    ? `Action ${last.index}: ${commandName(last.command)}. Fixed modern pitches; illustrative loudness follows model pressure.`
    : "Release air to make a finite sound example.";
  for (const id of ["play", "wav"]) $<HTMLButtonElement>(`#${id}`).disabled = !last;
  $<HTMLButtonElement>("#undo").disabled = !commands.length;
  const full = commands.length >= MAX_COMMANDS;
  for (const id of ["pump", "release"]) $<HTMLButtonElement>(`#${id}`).disabled = full;
  for (let i = 0; i < 4; i++) $<HTMLInputElement>(`#key-${i}`).disabled = full;
  if (message) $("#status").textContent = message;
}
function address(push = false): void {
  const q = shareQuery(tank, commands);
  const compare = $<HTMLInputElement>("#dry").checked ? "&compare=1" : "";
  const href = `${q}${compare}${location.hash || "#experiment"}`;
  if (push) history.pushState(null, "", href);
  else history.replaceState(null, "", href);
}
function act(command: Command): void {
  if (commands.length >= MAX_COMMANDS) return;
  player.stop();
  commands = [...commands, command];
  address(true);
  update(`${commandName(command)}. Experiment time ${replay(tank, commands).state.time} seconds.`);
}
$("#warning").textContent = parsed.warning;
$<HTMLInputElement>("#dry").checked =
  !parsed.warning && new URLSearchParams(location.search).get("compare") === "1";
$("#pump").addEventListener("click", () => act({ type: "pump" }));
$("#release").addEventListener("click", () =>
  act({ type: "wait", seconds: Number($<HTMLSelectElement>("#seconds").value) as 2 | 5 }),
);
$("#seconds").addEventListener("change", () => {
  $("#release").textContent = `Release for ${$<HTMLSelectElement>("#seconds").value} s`;
});
for (let i = 0; i < 4; i++)
  $(`#key-${i}`).addEventListener("change", () => {
    const mask = [0, 1, 2, 3].reduce(
      (bits, index) => bits | ($<HTMLInputElement>(`#key-${index}`).checked ? 1 << index : 0),
      0,
    );
    act({ type: "keys", mask });
  });
$("#tank").addEventListener("change", () => {
  player.stop();
  tank = Number($<HTMLSelectElement>("#tank").value) as Tank;
  address(true);
  update("Your actions have been replayed with the new tank area.");
});
$("#dry").addEventListener("change", () => {
  address(true);
  update();
});
$("#undo").addEventListener("click", () => {
  player.stop();
  commands = commands.slice(0, -1);
  address(true);
  update("The last action has been undone.");
});
$("#reset").addEventListener("click", () => {
  player.stop();
  commands = [];
  address(true);
  update("A fresh chamber is ready. No experiment time has passed.");
});
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-part]"))
  button.addEventListener("click", () => {
    part = button.dataset.part ?? "head";
    update();
  });
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-word]"))
  button.addEventListener("click", () => {
    const note = wordNotes[button.dataset.word ?? ""];
    if (!note) return;
    part = note.part;
    $("#word-note").textContent = note.text;
    update();
  });
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-example]"))
  button.addEventListener("click", () => {
    player.stop();
    commands = [...(EXAMPLES[button.dataset.example ?? ""] ?? [])];
    address(true);
    update("Prepared actions loaded. Every action is listed below the graph.");
  });
function lastAudio() {
  const row = replay(tank, commands).rows.findLast((r) => r.command.type === "wait");
  if (row?.command.type !== "wait") return null;
  return releasePcm(row.before, tank, row.command.seconds);
}
$("#play").addEventListener("click", () => {
  const pcm = lastAudio();
  if (!pcm) return;
  $("#audio-note").textContent = "Playing the last release’s finite sound. Stop cancels playback.";
  void player
    .play(pcm, () => update())
    .catch(() => {
      $("#audio-note").textContent =
        "Audio could not start. Save the WAV to hear this release in another player.";
    });
});
$("#stop").addEventListener("click", () => {
  player.stop();
  update();
});
$("#wav").addEventListener("click", () => {
  const pcm = lastAudio();
  if (pcm) download("pnigeus-release.wav", "audio/wav", wave(pcm));
});
$("#csv").addEventListener("click", () =>
  download("pnigeus-measurements.csv", "text/csv;charset=utf-8", csv(tank, commands)),
);
$("#share").addEventListener("click", () => {
  const url = `https://antonsoo.github.io/pnigeus/${shareQuery(tank, commands)}${$<HTMLInputElement>("#dry").checked ? "&compare=1" : ""}#experiment`;
  void navigator.clipboard
    ?.writeText(url)
    .then(() => {
      $("#export-status").textContent = "Experiment link copied.";
    })
    .catch(() => {
      $("#share-fallback").hidden = false;
      $("#share-fallback").textContent = url;
      $("#export-status").textContent = "Select and copy the experiment link below.";
    });
  if (!navigator.clipboard) {
    $("#share-fallback").hidden = false;
    $("#share-fallback").textContent = url;
  }
});
$("#study").addEventListener("click", () => {
  const savedTank = tank;
  const savedCommands = [...commands];
  const dry = $<HTMLInputElement>("#dry").checked;
  const button = $<HTMLButtonElement>("#study");
  button.disabled = true;
  $("#export-status").textContent =
    "Preparing the illustrated reading, source drawing, fonts and last release audio…";
  void study(savedTank, savedCommands, dry)
    .then((html) => {
      download("pnigeus-reading.html", "text/html;charset=utf-8", html);
      $("#export-status").textContent =
        "Illustrated reading saved. Open it offline or print it to PDF.";
    })
    .catch((error: unknown) => {
      $("#export-status").textContent =
        error instanceof Error ? error.message : "The reading could not be prepared. Try again.";
    })
    .finally(() => {
      button.disabled = false;
    });
});
window.addEventListener("popstate", () => {
  player.stop();
  const s = parseSession(location.search);
  tank = s.tank;
  commands = s.commands;
  $("#warning").textContent = s.warning;
  $<HTMLInputElement>("#dry").checked =
    !s.warning && new URLSearchParams(location.search).get("compare") === "1";
  update("Shared experiment restored.");
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    player.stop();
    update();
  }
});
window.addEventListener("pagehide", () => player.stop());
matchMedia("(max-width: 700px)").addEventListener("change", () => update());
update();
void offline($("#offline"));
