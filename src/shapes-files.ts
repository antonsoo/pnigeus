import {
  FORMS,
  fillNames,
  formNames,
  planNames,
  type ShapeSettings,
  shapeComparison,
  shapeCurve,
  shapesQuery,
} from "./core/shapes";
import { checkedAsset, dataUrl, escapeHtml } from "./files";
import shapesCss from "./shapes.css?inline";
import { greekNotes, shapeBoundaries } from "./shapes-content";
import { reservePlot, shapeSection } from "./shapes-drawing";
import baseCss from "./style.css?inline";

export function shapesCsv(s: ShapeSettings): string {
  const header =
    "form,radius_cm,fill,plan,allowed_drop_percent,kind,point,tank_area_m2,rest_level_m,inside_m,outside_m,head_m,gauge_pa,actual_air_litres,stock_ambient_litres,delivered_ambient_litres,geometric_release_litres,target_pressure_pa,target_reached,pressure_kind";
  const rows = FORMS.flatMap((form) => {
    const c = shapeComparison(s, form);
    const values = [
      { kind: "full", point: 0, reading: c.geometry.full },
      { kind: "endpoint", point: -1, reading: c.after },
      ...shapeCurve(s, form).map((reading, point) => ({ kind: "curve", point, reading })),
    ];
    return values.map(({ kind, point, reading: r }) =>
      [
        form,
        s.radiusCm,
        s.fill,
        s.plan,
        s.drop,
        kind,
        point,
        c.geometry.tankArea,
        c.geometry.restLevel,
        r.inside,
        r.outside,
        r.head,
        r.pressure,
        r.volume,
        r.stock,
        c.geometry.full.stock - r.stock,
        c.geometry.full.volume - r.volume,
        c.targetPressure,
        c.reachesTarget,
        r.volume < 1e-9 ? "limiting-empty" : "air-pocket",
      ].join(","),
    );
  });
  return [header, ...rows, ""].join("\r\n");
}
export function comparisonTable(s: ShapeSettings, interactive = true): string {
  return `<table class="shape-comparison"><caption>Same rim and height, same initial fill and tank. Endpoint: ${s.drop}% below each form’s own full pressure.</caption><thead><tr><th scope="col">Chamber form</th><th scope="col">Full air space<br><small>actual L</small></th><th scope="col">Full head<br><small>mm water</small></th><th scope="col">Air supplied<br><small>ambient L</small></th><th scope="col">Space lost<br><small>actual L</small></th></tr></thead><tbody>${FORMS.map(
    (form) => {
      const c = shapeComparison(s, form);
      const name = formNames[form];
      return `<tr data-form-row="${form}" data-active="${s.form === form}"><th scope="row">${interactive ? `<button type="button" data-form-choice="${form}" aria-pressed="${s.form === form}">${name}</button>` : name}<small>${form === "hemisphere" ? "Hero’s stated form" : "Modern comparison"}</small></th><td data-metric="full-volume">${c.geometry.full.volume.toFixed(2)}</td><td data-metric="full-head">${(c.geometry.full.head * 1000).toFixed(2)}</td><td data-metric="delivered">${c.released.toFixed(2)}${!c.reachesTarget ? "*" : ""}</td><td data-metric="space-lost">${c.geometricRelease.toFixed(2)}</td></tr>`;
    },
  ).join("")}</tbody></table>`;
}
export async function shapesReading(s: ShapeSettings): Promise<string> {
  const c = shapeComparison(s);
  const current = s.phase === "full" ? c.geometry.full : c.after;
  const pressureText =
    current.volume < 1e-9
      ? `Empty chamber: no wind is available. The last pocket’s limiting pressure is ${current.pressure.toFixed(3)} Pa`
      : `Current gauge pressure ${current.pressure.toFixed(3)} Pa`;
  const [scan, sans, bold, serif, sansNotice, serifNotice] = await Promise.all([
    checkedAsset("sources/hero-schmidt-192.jpg"),
    checkedAsset("fonts/IBMPlexSans-Regular.woff2"),
    checkedAsset("fonts/IBMPlexSans-SemiBold.woff2"),
    checkedAsset("fonts/NotoSerif-Regular.ttf"),
    checkedAsset("fonts/IBMPlex-OFL.txt"),
    checkedAsset("fonts/NotoSerif-OFL.txt"),
  ]);
  const fonts = `@font-face{font-family:Workshop;src:url('${dataUrl(sans, "font/woff2")}');font-weight:400}@font-face{font-family:Workshop;src:url('${dataUrl(bold, "font/woff2")}');font-weight:600}@font-face{font-family:Reading;src:url('${dataUrl(serif, "font/ttf")}')}`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pnigeus — saved shape study</title><style>${fonts}${baseCss.replace(/@font-face\s*\{[^}]+\}/g, "")}${shapesCss}
body{max-width:1100px;margin:2rem auto;padding:0 1.2rem;background:#fafbf9}main,footer{width:100%;margin:0}h1{font-size:2.7rem}.saved-section{max-width:760px;margin:1rem auto}.saved-section svg{display:block;width:100%;height:auto}.saved-scan{max-width:760px;margin:1rem auto}.saved-scan img{width:100%;height:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere}.license{font-size:.7rem}table{font-size:.9rem}button{display:none}.shape-comparison th small{display:block}@media print{body{margin:0;max-width:none}h2,h3{break-after:avoid}.saved-section{max-width:600px;break-inside:avoid}.saved-section:first-of-type{max-width:500px}figure,table{break-inside:avoid}.shape-model{margin-top:2rem}a{overflow-wrap:anywhere}.license{font-size:.6rem}}</style><body class="shapes-page"><main>
<h1>The shape of stored wind</h1><p>Pnigeus · saved geometric study · ${formNames[s.form].toLowerCase()} · ${2 * s.radiusCm} cm rim diameter and ${s.radiusCm} cm chamber height.</p><p>${escapeHtml(planNames[s.plan])}. Initial water: ${escapeHtml(fillNames[s.fill].toLowerCase())}. Chosen permitted pressure drop: ${s.drop}%. This drawing shows ${s.phase === "full" ? "the full rim limit" : "the withdrawal endpoint"}.</p><p>${pressureText}; head ${(current.head * 1000).toFixed(3)} mm; actual air volume ${current.volume.toFixed(6)} L; gas stock ${current.stock.toFixed(6)} ambient-equivalent L. At the withdrawal endpoint, ${c.released.toFixed(6)} ambient-equivalent L have been supplied and ${c.geometricRelease.toFixed(6)} actual L of chamber space have been lost. ${c.reachesTarget ? "The chosen pressure endpoint is reached." : "The chamber empties before the requested pressure endpoint."}</p>
<div class="saved-section">${shapeSection(s)}</div><p>The chamber profile and water heights share a scale. Tank width is schematic; the plan choice supplies the actual tank area. Heights start at the open rim; omitted under-rim water is not included.</p><div class="table-wrap">${comparisonTable(s, false)}</div><div class="saved-section">${reservePlot(s)}</div><p>Solid blue: hemisphere. Dashed brown: cylinder. Dotted green: cone. Dots mark the endpoint in the table. Air supplied includes isothermal compression.</p>
<p><a href="https://antonsoo.github.io/pnigeus/shapes.html${escapeHtml(shapesQuery(s))}#shape-workshop">Reopen this exact study</a>. This document embeds its diagrams, complete source page and fonts. Linked external editions need a connection.</p><p><a download="pnigeus-shape-curves.csv" href="${dataUrl(new TextEncoder().encode(shapesCsv(s)), "text/csv;charset=utf-8")}">Save the exact curves and comparison CSV from this reading</a>. This embedded download also works offline.</p>
<section><h2>Read Hero’s Greek</h2><p>Hero, <cite>Pneumatics</cite> I.42, Schmidt (1899), p. 192:</p><p class="greek-line" lang="grc">ἐν δὲ τῷ ὕδατι κοῖλον ἡμισφαίριον κατεστραμμένον ἔστω</p><p>In the water let there be a hollow hemisphere, turned upside down.</p><p>New English translation. The transcription rejoins a printed word across lines and removes an older-page marker within κοῖλον.</p>${Object.values(
    greekNotes,
  )
    .map(
      (note) =>
        `<h3 lang="grc">${note.label}</h3><p><i>${note.transliteration}</i> — ${escapeHtml(note.note)}</p>`,
    )
    .join(
      "",
    )}<p>Vitruvius’s “inverted funnel” need not mean a cone: Roman funnels could be rounded. Hagel (2023, pp. 55–60) discusses the two descriptions together. The cone in this study is a mathematical comparison. <a href="https://doi.org/10.1163/22129758-bja10055">Read the research paper</a>.</p>
<figure class="saved-scan"><img src="${dataUrl(scan, "image/jpeg")}" width="1650" height="2473" alt="Complete Greek printed page 192, chapter XLII, beginning the construction of a water organ."/><figcaption>Wilhelm Schmidt (ed.), <cite>Herons von Alexandria Druckwerke und Automatentheater</cite>, vol. I, Teubner, 1899, p. 192. Public-domain edition; scan supplied by the Internet Archive. <a href="https://archive.org/details/heronsvonalexandhero/page/n268/mode/1up">Inspect the digitized edition</a>.</figcaption></figure></section>
${shapeBoundaries.replace("<details>", "<details open>")}<h2>Font notices</h2><pre class="license">${escapeHtml(new TextDecoder().decode(sansNotice))}</pre><pre class="license">${escapeHtml(new TextDecoder().decode(serifNotice))}</pre><p>Original model, diagrams and English explanations: PolyForm Noncommercial, © 2026 Anthony Mercer. The source page is from a public-domain 1899 edition. Edition ${__PNIGEUS_EDITION__}.</p></main></body></html>`;
}
