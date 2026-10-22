export const sourceReading = `<div class="source-intro"><h2 id="reading">Read the device</h2><p>Vitruvius writes in Latin; the chamber’s name is borrowed from Greek. His description makes a useful reading exercise: find the container, the water and the object turned upside down.</p></div>
<div class="reading-layout"><figure class="source-figure"><a href="sources/hero-fig76.jpg"><img src="sources/hero-fig76.jpg" width="1100" height="1176" alt="Hero’s organ in an 1851 explanatory drawing: pipes above, piston to the left and an inverted chamber inside the water tank." loading="lazy"/></a><figcaption>Hero, <cite>Pneumatics</cite>, section 76, fig. 76. Greenwood’s translation, edited by Woodcroft (1851), pp. 105–107. This is a nineteenth-century explanatory drawing, not a surviving ancient plan. <a href="https://www.gutenberg.org/cache/epub/77400/pg77400-images.html#Page_105">Read the full description</a>.</figcaption></figure>
<div><p class="source-tag">Vitruvius, <cite>De architectura</cite> X.8.2</p><p class="latin" lang="la"><button type="button" data-word="arca">intra arcam</button>, quo loci <button type="button" data-word="aqua">aqua sustinetur</button>, inest <button type="button" data-word="pnigeus">pnigeus</button> uti <button type="button" data-word="funnel">infundibulum inversum</button></p>
<p class="translation">Inside the chest, where the water is held, there is a pnigeus, like an inverted funnel.</p><p>New English translation of this excerpt. Select a Latin phrase to inspect its grammar and find its part on the drawing.</p>
<div id="word-note" class="word-note" role="status">Select a phrase above. The words identify parts; they do not supply our model’s dimensions.</div>
<p><a href="https://www.gutenberg.org/cache/epub/51812/pg51812-images.html#vitruvius-para671">Inspect Rose’s Latin edition (1899)</a>. The model uses a straight-sided chamber; Vitruvius describes a funnel, while Hero describes a hemisphere.</p>
<h3>Greek words at the bench</h3><dl class="words"><dt lang="grc">πνιγεύς <span>pnigeus</span></dt><dd>The submerged chamber’s name in this description. Other contexts give this word other senses; this is not a universal word for “air tank.”</dd><dt lang="grc">ὕδωρ <span>hydōr</span></dt><dd>Water. Its combining form <i>hydr-</i> survives in “hydraulic.” Here it helps hold the supply of air.</dd><dt lang="grc">ἀήρ <span>aēr</span></dt><dd>Air. This is what reaches the pipes. The English word “air” shares its ancestry.</dd></dl><p>Greek headwords and transliterations are reading aids, not a reconstructed pronunciation. <a href="https://atlas.perseus.tufts.edu/lemma/28544/">πνιγεύς in LSJ</a>; <a href="https://logeion.uchicago.edu/ὕδωρ">ὕδωρ</a>; <a href="https://logeion.uchicago.edu/ἀήρ">ἀήρ</a>.</p></div></div>`;

export const wordNotes: Record<string, { part: string; text: string }> = {
  arca: {
    part: "water",
    text: "intra arcam: ‘inside the chest’. Intra takes the accusative; arcam is the accusative singular of arca. The bronze chest contains the water.",
  },
  aqua: {
    part: "water",
    text: "aqua sustinetur: ‘water is held’. Aqua is the nominative subject; sustinetur is a present passive verb. The drawing’s blue regions are connected under the rim.",
  },
  pnigeus: {
    part: "bell",
    text: "pnigeus: the chamber’s Greek loanword, nominative subject of inest (‘is inside’). Its air is connected to the pump and the pipes, while its open lower edge lets water move.",
  },
  funnel: {
    part: "bell",
    text: "infundibulum inversum: ‘an inverted funnel’. Inversum agrees with the neuter infundibulum. The shape is Vitruvius’s comparison, not the constant cross-section chosen for this experiment.",
  },
};

export const modelReading = `<h2 id="model">What the experiment assumes</h2><p>The ancient descriptions supply a pump, an inverted chamber, water and selectively opened pipes. Everything numerical here belongs to a modern, quasi-static teaching model. Water settles instantly; air has constant temperature. We omit wave motion, pump mechanics, heat, leakage, wind-chest losses and actual pipe acoustics.</p>
<div class="model-columns"><div><h3>Two surfaces, one water supply</h3><p>The chamber has a constant area of 0.04 m², its roof is 0.52 m high, its rim 0.04 m high. At rest both surfaces are 0.30 m high. If the inside surface drops by d metres, the outside rises by d/(R − 1), where R is the total tank area divided by the chamber area.</p><pre>head = d × R / (R − 1)
gauge pressure = ρ × g × head
air volume = 8.8 + 40d litres</pre><p>We use ρ = 1000 kg/m³, g = 9.80665 m/s² and atmospheric pressure 101325 Pa. The head is the difference between the two surfaces, not their height above the floor. <a href="https://www.grc.nasa.gov/WWW/K-12/WindTunnel/Activities/fluid_pressure.html">Hydrostatic pressure, NASA</a>.</p></div>
<div><h3>Count the air, then let it out</h3><p>Air stock is measured as the volume that the same amount of gas would occupy at our atmospheric pressure and temperature. One stroke delivers one of these ambient-equivalent litres. The chamber’s actual air volume is different when pressurized.</p><pre>stock = air volume × (1 + pressure / 101325)
flow = open pipes × 0.4 × √(pressure / 1000)
                          ambient litres / second</pre><p>The flow law and coefficient are chosen. An exact time integral gives the next settled state; it stops withdrawing air at zero gauge pressure. Once inside water reaches the open rim, further delivered air escapes. No water is consumed.</p></div></div>
<details><summary>Why compare a sealed dry chamber?</summary><p>It starts with the same 8.8 litres of air at atmospheric pressure and receives the same strokes and gate commands. Its volume stays fixed, its air is isothermal and it has no relief outlet. It is a separate counterfactual vessel, not the ancient chamber with its water removed. Its pressure is 101325 × (stock/8.8 − 1). A one-litre delivery produces a much larger pressure rise and the same outlet rule then removes air faster. The shared graph uses one pressure scale; the water trace can therefore appear small.</p></details>
<details><summary>What does the sound establish?</summary><p>Four modern sine test tones form an A-major chord: A3, C♯4, E4 and A4 at A4 = 440 Hz. Their frequencies stay fixed. Amplitude follows an illustrative square-root pressure mapping, with short click-suppressing edges. These sounds mark the model’s air reserve; they do not reconstruct ancient tuning, pipe timbre, loudness, voicing or pressure-dependent pitch. Live playback and WAV downloads use the same finite samples.</p></details>
<p>The experiment clock advances only with “Release.” A pump stroke is an idealized instantaneous delivery. Changing the tank replays all actions with its new geometry. Shared links and downloads record the action order, including gate changes made at the same experiment time.</p>`;
