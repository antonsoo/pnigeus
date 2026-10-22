export const greekNotes = {
  water: {
    label: "ἐν δὲ τῷ ὕδατι",
    transliteration: "en de tōi hydati",
    note: "In the water. Here ἐν takes the dative for location; τῷ and ὕδατι are dative singular. The headword ὕδωρ changes its stem to ὑδατ- in this form. δέ connects the new instruction to the previous one.",
  },
  hollow: {
    label: "κοῖλον",
    transliteration: "koilon",
    note: "Hollow. A neuter singular adjective agreeing with ἡμισφαίριον. A solid half-ball would not hold the air pocket shown in the experiment. The identical neuter nominative and accusative forms are distinguished here by the sentence's construction.",
  },
  hemisphere: {
    label: "ἡμισφαίριον",
    transliteration: "hēmisphairion",
    note: "Hemisphere. A neuter singular noun, the subject of ἔστω. The beginning ἡμι- means half; compare English hemisphere. It tells us a form, but gives no radius, wall thickness or exact water fill.",
  },
  inverted: {
    label: "κατεστραμμένον",
    transliteration: "katestrammenon",
    note: "Turned upside down. A perfect middle/passive participle of καταστρέφω, here describing the resulting inverted state. Its neuter singular ending agrees with ἡμισφαίριον, just as κοῖλον does. The printed word continues across two lines.",
  },
  let: {
    label: "ἔστω",
    transliteration: "estō",
    note: "Let there be. Third-person singular present imperative of εἰμί, to be. Technical Greek often sets up an object this way. The instruction gives us a hollow hemisphere in an inverted position.",
  },
} as const;
export type GreekWord = keyof typeof greekNotes;
export const greekReading = `<section id="greek" class="shape-reading">
<div class="shape-section-heading"><p class="eyebrow">Read the form</p><h2>A hemisphere, in Hero’s words</h2><p>The chamber’s shape is already a small Greek lesson. Three neuter forms describe one object; the verb tells the maker to put it there.</p></div>
<div class="greek-layout"><div class="greek-text"><p class="source-tag">Hero, <cite>Pneumatics</cite> I.42 · Schmidt (1899), p. 192</p><p class="greek-line" lang="grc">${Object.entries(
  greekNotes,
)
  .map(
    ([key, note]) =>
      `<button type="button" data-greek="${key}" aria-pressed="${key === "hemisphere"}">${note.label}</button>`,
  )
  .join(
    " ",
  )}</p><p class="new-translation">In the water let there be a hollow hemisphere, turned upside down.</p><p class="hint">New English translation of this excerpt. Select a phrase for its grammar. Transliteration is a reading aid; no pronunciation is inferred.</p><div id="greek-note" class="greek-note" role="status"></div><p><strong>What the words establish:</strong> water, a hollow hemisphere, and its inverted position. The radius and fill controls above are modern choices.</p><p><strong>What “funnel” leaves open:</strong> Vitruvius calls his chamber <span lang="la">uti infundibulum inversum</span>, “like an inverted funnel”. Hagel (2023, pp. 55–60) points out that Roman funnels could be rounded. These wordings need not conflict. Our cone is a mathematical comparison, not a form recovered from Vitruvius.</p><p><a href="./#reading">Read the longer Latin passage</a> · <a href="https://doi.org/10.1163/22129758-bja10055">Hagel’s geometric investigation</a></p></div>
<figure class="greek-facsimile"><div class="scan-controls" role="group" aria-label="Source page view"><button id="source-detail" type="button" aria-pressed="true">Passage detail</button><button id="source-full" type="button" aria-pressed="false">Complete page</button></div><div id="greek-scan"></div><figcaption>Printed p. 192, opening of chapter XLII, in Wilhelm Schmidt’s Greek/German edition (1899). The printed <span lang="grc">κατεστραμμένον</span> visibly continues onto the next line. The typed reading removes that line break and the older-page marker within <span lang="grc">κοῖλον</span>. <a href="sources/hero-schmidt-192.jpg">Open the complete retained page</a>. <a href="https://archive.org/details/heronsvonalexandhero/page/n268/mode/1up">Inspect the digitized edition</a>.</figcaption></figure></div></section>`;

export const shapeBoundaries = `<section id="shape-model" class="shape-model"><p class="eyebrow">The calculation</p><h2>Water conserved. Air accounted for.</h2><p>The full chamber starts with inside water at its open rim. Withdrawing air lets that surface rise and the outside surface fall. The vertical difference supports the pressure. The comparison holds the rim radius, chamber height, tank plan and initial fill fixed; the three chambers have different volumes and full pressures.</p>
<details><summary>Read the equations and limits</summary><p>Heights are measured above the open rim. Let <i>T</i> be the tank area, <i>F(z)</i> the chamber volume below height <i>z</i>, and <i>z₀</i> the initial water level before pumping. With negligible wall thickness:</p><pre>T × outside − F(outside) + F(inside) = T × z₀
head = outside − inside
gauge pressure = 1000 × 9.80665 × head
ambient gas stock = actual air volume × (1 + gauge pressure / 101325)</pre><p>Volume integrals and monotone bisection solve the two water levels. Gas supplied is the decrease in ambient-equivalent stock. The separate decrease in actual volume is a geometric quantity; compression makes them differ.</p><p>The model is isothermal and static. It omits waves, metal thickness, neck and windchest volume, leakage, under-rim clearance, time and pipe acoustics. A high-filled chamber can empty while its last pocket still has a positive limiting head; an empty chamber supplies no wind. The selected pressure drop is a criterion for this experiment, not an ancient performance specification.</p><p>Hagel’s 80 cm hemisphere example gives about 134 L full volume and 653 mm head. Its roughly 50 L geometric release for a 30% pressure drop becomes about 54.72 ambient-equivalent L under this model’s isothermal correction. His paper labels the geometric treatment’s omission of compression (p. 65, note 21). These are reconstruction calculations, not measured ancient operating values.</p><p><a href="https://github.com/antonsoo/pnigeus/blob/main/docs/shapes-model.md">Full derivation and fixed parameters</a> · <a href="https://github.com/antonsoo/pnigeus/blob/main/THIRD_PARTY.md">Sources and rights</a>.</p></details></section>`;
export function sourceScan(full: boolean): string {
  return `<svg class="greek-scan ${full ? "whole-page" : "passage-detail"}" viewBox="${full ? "0 0 1650 2473" : "97 406 1476 194"}" role="img" aria-label="${full ? "Complete printed Greek page 192, opening chapter XLII" : "Printed lines containing the phrase about an inverted hollow hemisphere"}"><image href="sources/hero-schmidt-192.jpg" width="1650" height="2473"/></svg>`;
}
