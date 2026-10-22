# Shape, source and usable wind

Reviewed 2026-10-22. Functional source: `f97d44806479163c739c0ed406c2600acf6b1871`.
Reviewer: `0068799d589e44deb404d31531731f2ade92ca7c`. Build edition: `02363524c4e953e9e08b8c2f874791778baf7bab30a1f918c21a4525725bcf3c`.
The [fresh archive review](shapes-clean-verification.json) installed dependencies
again and reproduced all 16 build files byte-for-byte in a second checkout.
Environment: Node.js 26.7.0, npm 12.0.1, Python 3.12.3, Playwright 1.63.0,
Chromium and Firefox on Linux/WSL. No separate Node 24 execution is claimed.

## What can be learned

A hemisphere with an 80 cm rim diameter, in a tangent octagonal tank, starts
with **134.041 L** of air space at its rim limit and **652.816 mm** of head.
Allowing a 30% pressure drop loses **49.970 actual L** of chamber space but
supplies **54.721 ambient-equivalent L** of gas. This reproduces Hagel’s rounded
geometric example while keeping the additional isothermal correction visible.

[Open that study](https://antonsoo.github.io/pnigeus/shapes.html?r=40&fill=roof&plan=octagon&drop=30&form=hemisphere&phase=after#shape-workshop).
These are reconstruction calculations under stated assumptions, not measured
ancient operating values. A cylinder and a cone of the same footprint and
height have different volumes and full pressures; this comparison does not
identify a universally optimal form. The [derivation](shapes-model.md) fixes
exactly what is held equal.

Halving the radius halves head and divides geometric space by eight. Gas stock
has a further compression factor. With water initially above the roof, the
chamber can empty before the requested percentage drop is reached. The last
pocket has a positive limiting head; **an empty chamber supplies no wind**.
The interface, CSV and saved reading distinguish that limit from available air.

## Read the source before assigning a shape

Hero’s eight-word Greek clause names a hollow hemisphere and its inverted
position. Grammar notes identify the dative after ἐν, the neuter noun and its
agreeing adjective and participle, and the imperative ἔστω. The new English
translation is beside the actual retained printed p. 192 of Schmidt’s 1899
edition. The complete page was visually inspected; a normalized TEI cross-check
also matched the clause. [Source identity](shapes-source-verification.json).

Vitruvius’s inverted-funnel comparison need not describe a cone. Hagel’s
investigation discusses rounded Roman funnels. The app therefore labels its
cone as a modern comparison, and the pump workshop’s Latin reading now points
to this distinction. It keeps that workshop’s separate constant-section model.

## Evidence and its limits

| Evidence                                                            | Observed result                                                                                              | Boundary                                                                                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| [Independent shape calculation](shapes-physics-verification.json)   | 1,215 cases; 184,194 scalar comparisons; largest raw difference below 8.3e-12                                | Simpson integration of cross-sections and a pressure-coordinate solve; no app imports; shared chosen physical assumptions |
| [Actual CSV and drawing](shapes-rendered-verification.json)         | 28 observations, 6,972 downloaded rows, 97,780 comparisons                                                   | Real drawn profiles, tank plans, water lines and curve vertices; no instrument measurements                               |
| [Shape browser workflows](shapes-browser-verification.json)         | Chromium/Firefox at 1440/375 px; no page errors, no external requests, no automated accessibility violations | Desktop engines at these widths; no physical phone or manual screen-reader study                                          |
| [Development shape workflows](shapes-development-verification.json) | Both engines and widths; computed styles, controls, actual exports and native files passed                   | The documented Vite development command, with production offline checks excluded                                          |
| [Pump geometry regression](shapes-pump-rendered-verification.json)  | 708 independent comparisons; numeric error below 7e-13                                                       | The original constant-section teaching model and actual water-line paths                                                  |
| [Pump audio regression](shapes-pump-audio-verification.json)        | Eight WAVs, eight live buffers, 1,920,000 samples per format; zero quantization disagreements                | Digital modern sine references; no ancient timbre or physical-speaker claim                                               |

For rendered coordinates the tolerance is 0.00051 SVG units; a span derived
from two rounded endpoints allows 0.00102. The largest aggregate SVG difference
was below 0.000782 and belongs to that two-endpoint span population. The
largest physical scalar difference in browser output was below 1.3e-13.

The [pump browser regression](shapes-pump-browser-verification.json) repeated
controls, histories, Latin notes, real downloads, cancellation, saved readings
and offline reloads. Its [development regression](shapes-pump-development-verification.json)
confirmed the original room’s styling and exports too. Both workshops remain
usable in the same edition.

## Actual use, exports and offline behavior

Each configuration switched between full and withdrawn states, all three
forms, a half-size chamber, shallow/wide water and a high-filled empty limit.
Native keyboard actions operated the range and retained focus. Browser history
restored the previous radius. On a small screen, keyboard scrolling reached
the comparison table’s later columns.

The reviewer downloaded all three forms’ full states, endpoints and 81 points
per curve. Every displayed table cell was checked against that actual CSV.
The independent checker then used its own pressure-coordinate water equation
and cross-section quadrature to check those rows, the actual SVG profiles,
water-line heights and widths, true plan areas and plotted path vertices.

A saved reading opened as a native file with browser networking disabled. Its
complete Greek page and embedded fonts loaded, it had no scripts or inactive
buttons, and its embedded CSV download matched the live app’s exact data.
The example PDF was printed from that actual file. Its complete source-page
image was rasterized and inspected; the text and remaining pagination were
checked in the native HTML and extracted PDF text.

With networking disabled and the local server’s sockets closed, each browser
reloaded, changed the radius, saved another reading, navigated to the pump room,
pumped three strokes to 854 Pa, and returned to the cached shape room at 4481 Pa.
Hosted networking has a separate evidence boundary.

Separate contexts refused substituted Greek-page bytes returned with HTTP 200.
Restoring the page recovered export. Duplicate radius parameters reset the
whole study visibly. An export held during asset loading preserved its original
40 cm settings while the live controls changed to 10 cm. A blocked clipboard
exposed a link that reopened the actual selected parameters.

## Cache inspection correction

The [before probe](shapes-cache-inspection-before.json) deleted the worker’s
cache and then requested inspection. Both real browsers reported incomplete
storage but also recreated an empty cache. Inspection now uses read-only named
cache lookups. Fetch lookups use the same approach; only installation opens a
cache for writing. Every production shape workflow now deletes its edition
cache and proves that inspection returns incomplete **without recreating it**.

## Retained artifacts

- [Desktop workshop](assets/shapes-chromium-1440-workshop.png) and
  [phone workshop](assets/shapes-chromium-375-workshop.png), with corresponding
  Firefox captures alongside them.
- [Greek reading](assets/shapes-chromium-1440-greek.png) and
  [phone Greek reading](assets/shapes-chromium-375-greek.png), also in both engines.
- [Standalone Greek reading](../examples/shape-reading.html),
  [nine-page A4 PDF](../examples/shape-reading.pdf) and
  [exact three-form CSV](../examples/shape-curves.csv).
- [Artifact sizes and digests](shapes-artifacts.json).

Raw review commands retain every observation’s downloads and screenshots outside
the checkout. Checked-in receipts omit local artifact paths. Shape artifacts
use a distinct prefix so pump and shape reviews can share an output parent
without overwriting one another.

## Reproduce

```sh
npm ci
npm run check
npm run verify:physics
npm run verify:shapes
npm run test:shapes -- /tmp/pnigeus-review/shapes.json
python3 scripts/shapes-oracle.py /tmp/pnigeus-review/shapes.json
npm run test:browser -- /tmp/pnigeus-review/pump.json
python3 scripts/physics_oracle.py /tmp/pnigeus-review/pump.json
python3 scripts/audio-oracle.py /tmp/pnigeus-review/pump.json
```

For development, run `npm run dev`, then use
`node scripts/shapes-browser.mjs /tmp/pnigeus-review/development-shapes.json http://127.0.0.1:4386/pnigeus/ development`
and `node scripts/development-review.mjs` in another terminal.

## Publication boundary

This review initially records the expanded local build. The [initial public
review](publication.md) identifies the earlier ten-file pump edition separately.
Publication of the new 16-file edition, hosted workflows and existing-tab
upgrades will be recorded with their own receipts after deployment. These local
checks establish neither hosted CI execution nor a registry release.
