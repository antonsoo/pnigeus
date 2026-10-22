import { modelReading, sourceReading, wordNotes } from "./content";
import { releasePcm, wave } from "./core/audio";
import {
  type Command,
  commandName,
  dryPressure,
  replay,
  type Tank,
  waterReading,
} from "./core/regulator";
import { shareQuery } from "./core/session";
import { cutaway, trace } from "./drawing";
import drawingCss from "./drawing.css?inline";

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export function csv(tank: Tank, commands: readonly Command[]): string {
  const run = replay(tank, commands);
  const rows = [{ index: 0, command: null, after: replay(tank, []).state }, ...run.rows];
  return [
    "action,command,time_s,total_tank_over_bell_area,open_pipe_mask,water_inside_m,water_outside_m,head_m,water_gauge_pa,actual_air_litres,stock_ambient_litres,supplied_ambient_litres,pipe_out_ambient_litres,vented_ambient_litres,dry_gauge_pa,dry_stock_ambient_litres,dry_pipe_out_ambient_litres",
    ...rows.map((row) => {
      const s = row.after;
      const r = waterReading(s.waterStock, tank);
      return [
        row.index,
        row.command ? commandName(row.command) : "Initial",
        s.time,
        tank,
        s.mask,
        r.inside,
        r.outside,
        r.head,
        r.pressure,
        r.volume,
        s.waterStock,
        s.supplied,
        s.waterOut,
        s.vented,
        dryPressure(s.dryStock, tank),
        s.dryStock,
        s.dryOut,
      ].join(",");
    }),
    "",
  ].join("\r\n");
}
export function download(name: string, type: string, content: BlobPart): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function dataUrl(bytes: Uint8Array<ArrayBuffer>, mime: string): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:${mime};base64,${btoa(binary)}`;
}
export async function checkedAsset(path: string): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!response.ok)
    throw new Error("A reading asset could not be loaded. Keep this page open and try again.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  if (digest !== __ASSET_HASHES__[path])
    throw new Error(
      "The source drawing or font did not match this edition. Reload online before saving the reading.",
    );
  return bytes;
}
export async function study(
  tank: Tank,
  commands: readonly Command[],
  dry: boolean,
): Promise<string> {
  // Capture immutable settings before asynchronous asset loading.
  const run = replay(tank, commands);
  const query = shareQuery(tank, commands) + (dry ? "&compare=1" : "");
  const [image, sans, serif, sansLicense, serifLicense] = await Promise.all([
    checkedAsset("sources/hero-fig76.jpg"),
    checkedAsset("fonts/IBMPlexSans-Regular.woff2"),
    checkedAsset("fonts/NotoSerif-Regular.ttf"),
    checkedAsset("fonts/IBMPlex-OFL.txt"),
    checkedAsset("fonts/NotoSerif-OFL.txt"),
  ]);
  const r = waterReading(run.state.waterStock, tank);
  const last = run.rows.findLast((row) => row.command.type === "wait");
  const audio =
    last && last.command.type === "wait"
      ? `<h2>Last release</h2><p>Action ${last.index}: ${escapeHtml(commandName(last.command))}. Modern sine reference tones; illustrative pressure-to-amplitude mapping.</p><audio controls src="${dataUrl(wave(releasePcm(last.before, tank, last.command.seconds)), "audio/wav")}"></audio>`
      : "";
  const sources = sourceReading
    .replace(
      "Select a Latin phrase to inspect its grammar and find its part on the drawing.",
      "The Latin word notes below explain the grammar and identify the corresponding parts.",
    )
    .replaceAll('loading="lazy"', "")
    .replaceAll('href="sources/hero-fig76.jpg"', `href="${dataUrl(image, "image/jpeg")}"`)
    .replaceAll('src="sources/hero-fig76.jpg"', `src="${dataUrl(image, "image/jpeg")}"`)
    .replace(/<button type="button" data-word="[^"]+">(.*?)<\/button>/g, "$1")
    .replace(/<div id="word-note".*?<\/div>/, "");
  const history = run.rows
    .map(
      (row) =>
        `<tr><td>${row.index}</td><td>${escapeHtml(commandName(row.command))}</td><td>${row.after.time}</td><td>${waterReading(row.after.waterStock, tank).pressure.toFixed(3)}</td><td>${dryPressure(row.after.dryStock, tank).toFixed(3)}</td><td>${row.after.vented.toFixed(6)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pnigeus — saved experiment</title><style>
  @font-face{font-family:Workshop;src:url('${dataUrl(sans, "font/woff2")}')}@font-face{font-family:Reading;src:url('${dataUrl(serif, "font/ttf")}')}
  body{font-family:Workshop,sans-serif;color:#193648;background:#fafbf9;max-width:1000px;margin:2rem auto;padding:0 1rem;line-height:1.65}h1,h2,.latin{font-family:Reading,serif}h1{font-size:2.8rem}h2{margin-top:3rem}a{color:#235779}svg{width:100%;height:auto}img{max-width:100%;height:auto}.source-figure{max-width:550px;margin:1rem 0}figcaption{font-size:.9rem}.words dt{font-family:Reading,serif;font-size:1.25rem;margin-top:1rem}.words dd{margin:0}.words span{font-family:Workshop,sans-serif;font-size:1rem}.latin{font-size:1.4rem}.source-tag{font-size:.9rem}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#e8eff3;padding:1rem;font-size:.9rem}table{width:100%;border-collapse:collapse;font-size:.85rem}td,th{border-bottom:1px solid #c8d4dc;text-align:left;padding:.4rem}.table-wrap{overflow-x:auto}.license{font-size:.7rem}audio{max-width:100%}${drawingCss}@media print{body{margin:0;max-width:none}h2{break-after:avoid}svg,figure{break-inside:avoid}audio{display:none}a{overflow-wrap:anywhere}.cutaway{max-height:440px}details{display:block}summary{font-weight:bold}}</style>
  <h1>The water inside a water organ</h1><p>Pnigeus · saved modern experiment · tank area ${tank} × chamber area · experiment time ${run.state.time} s.</p><p>Gauge pressure ${r.pressure.toFixed(3)} Pa; head ${(100 * r.head).toFixed(3)} cm. Supplied ${run.state.supplied.toFixed(3)} ambient-equivalent litres, released ${run.state.waterOut.toFixed(3)}, vented ${run.state.vented.toFixed(3)}. The chamber still holds ${r.volume.toFixed(3)} actual litres of air.</p>
  ${cutaway(run.state, tank)}${trace(tank, commands, dry)}<p>Solid blue: water chamber. ${dry ? "Dashed brown: the separate sealed dry chamber, on the same pressure scale." : "The dry comparison is hidden in this graph; its numerical results remain in the action table."}</p>
  <p><a href="https://antonsoo.github.io/pnigeus/${escapeHtml(query)}#experiment">Reopen this exact action sequence</a>. The reading, image, fonts and audio below are embedded and need no connection. Linked external editions require a connection.</p>${audio}
  <h2>Actions in order</h2><div class="table-wrap"><table><thead><tr><th>Action</th><th>Command</th><th>Time, s</th><th>Water, Pa</th><th>Dry, Pa</th><th>Vented, L</th></tr></thead><tbody>${history || '<tr><td colspan="6">Fresh chamber; no actions.</td></tr>'}</tbody></table></div>
  ${sources}<h3>Latin word notes</h3>${Object.values(wordNotes)
    .map((note) => `<p>${escapeHtml(note.text)}</p>`)
    .join("")}${modelReading.replaceAll("<details>", "<details open>")}
  <h2>Font notices</h2><pre class="license">${escapeHtml(new TextDecoder().decode(sansLicense))}</pre><pre class="license">${escapeHtml(new TextDecoder().decode(serifLicense))}</pre>
  <p>Original code, diagrams and English explanations: MIT, © 2026 Anton Soloviev. The 1851 source illustration is public domain in the United States. Edition ${__PNIGEUS_EDITION__}.</p></html>`;
}
