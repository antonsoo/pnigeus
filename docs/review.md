# Review of the water-organ workshop

Reviewed on 2026-10-22. Functional source revision:
`7cbfbbf0b7605d4bebb9eebffc7a410d7d87474b`.
The later documentation commits retain this review and do not change application inputs.

Build edition:
`471c19da39be900345eccd978c1b0c7dbb92f140ebd139699fc07a16f6044b9d`.

The edition is a SHA-256 digest of the application source, public files, entry
HTML, package metadata, lockfile and build configuration. The service worker
also records individual hashes of the finished build. The browser script
compares the entire build before and after review, so changing it during a run
cannot produce a successful receipt.

Environment used: Node.js 26.7.0, npm 12.0.1, Python 3.12.3, Playwright 1.63.0,
installed Chromium and Firefox, Linux/WSL. The documented requirement is Node 24
or newer; this review does not claim a separate execution on Node 24.

## What was checked

| Evidence                                                | Population and result                                                                                        | Boundary                                                                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [Physics](physics-verification.json)                    | 168 cases, 2520 numeric comparisons passed                                                                   | Independent pressure-coordinate RK4, rather than the application’s exact displacement integral; shared, explicitly chosen physical assumptions |
| [Rendered geometry and CSV](rendered-verification.json) | Four browser workflows, 708 comparisons; water-line coordinate error below 0.000432 SVG units                | Actual SVG path coordinates and actual downloaded CSV; not physical instrument measurements                                                    |
| [Audio](audio-verification.json)                        | Eight WAVs and eight live buffers; 1,920,000 samples per format; zero live-to-WAV quantization disagreements | Digital samples only; modern sine reference tones and an illustrative amplitude mapping                                                        |
| [Browser workflows](browser-verification.json)          | Chromium/Firefox at 1440/375 px; no page errors, no external requests, no automated accessibility violations | Desktop browser engines with these viewport widths; no physical phone or manual screen-reader study                                            |
| [Local HTTP responses](served-verification.json)        | All ten built files matched their SHA-256 hashes; root entry matched index                                   | Local Vite preview; no public hosting is established                                                                                           |
| [Source identification](source-verification.json)       | Eleven-word Latin excerpt matched Rose’s edition; Hero figure 76 matched the retained image hash             | Identifies these editions and this image; does not authenticate an ancient construction                                                        |

The largest raw numeric difference in the model sweep was below `1.9e-11`;
the declared acceptance bound was `2e-7`. For browser water-line paths, the
acceptance bound was `0.00051` SVG units because their printed coordinates have
three decimal places. These two error populations have separate fields in the receipts.

The audio oracle independently integrates pressure at millisecond intervals,
then generates the documented modern sine tones and envelope. Its largest live
Float32 difference was below `1.5e-11`. No downloaded PCM16 sample differed
from the independently rounded expected value in this reviewed population.
The last quarter-second of every four-pipe release was silent after useful
wind had run out. Physical loudspeakers and ancient pipe behaviour were not measured.

## Actual user workflows

Each browser/width combination used native keyboard actions to pump three
strokes, open a gate, release for five seconds, and preserve focus. It replayed
those actions through all three tank sizes and exported the measurements. Four
open pipes then exhausted the reserve. Undo and browser history restored the
prior sequence. Fourteen further strokes reached and exceeded the rim, with
surplus gas accounted for as vented air.

Source-word selection displayed grammatical notes. The reviewer inspected the
real screenshots of the workshop and reading in both engines at both widths.
The original layout had overlapping drawing labels and cramped phone text;
the reviewed layout separates the pressure bracket from the tank wall and
enlarges the phone reservoir detail, with numerical water levels below it.

The review downloaded real CSV, WAV and HTML files. It captured the actual
live AudioBuffer samples before playback. A deliberately delayed audio resume
was stopped before it could start a source, proving that cancellation wins.

Each standalone reading opened as a native `file:` document with network
access disabled. Its embedded source image and audio loaded, its fonts were
available, and it contained no inactive buttons. A source-reading instruction
that had depended on the removed buttons was caught during print review and
replaced with a pointer to the included static grammar notes.

The application was then reloaded with both browser networking disabled and
the origin’s sockets closed. It accepted a new pump command and exported a
new illustrated reading, including its source image and fonts, through the cache.

Separate fresh contexts returned non-source bytes with HTTP 200 at the source
image URL. Both engines refused to write a reading; restoring the correct
source allowed export. Duplicate tank parameters reset the entire experiment
with a visible warning, rather than preserving a plausible partial sequence.

## Retained artifacts

- [Desktop workshop](assets/workshop-1440.png) and [phone workshop](assets/workshop-375.png).
- [Desktop source reading](assets/reading-1440.png) and [phone source reading](assets/reading-375.png).
- Matching Firefox screenshots are retained beside them.
- [Native illustrated reading](../examples/one-pipe-reading.html),
  [nine-page A4 PDF](../examples/one-pipe-reading.pdf),
  [five-second one-pipe WAV](../examples/one-pipe-release.wav),
  [complete example CSV](../examples/one-pipe-measurements.csv).
- [Artifact sizes and hashes](artifacts.json).

The saved example contains three strokes, pipe 1 opened, and a five-second
release at tank area ratio 6. The dry comparison is visible. The HTML embeds
its font notices, diagram, source figure, complete ordered action table and
audio. The PDF was printed from that actual native reading, not recreated
separately. Its first three pages were rasterized and visually reviewed;
the remaining content was checked in the native HTML and extracted PDF text.

## Reproduce the checks

```sh
npm ci
npm run check
npm run verify:physics
npm run test:browser -- /tmp/pnigeus-review/browser.json
python3 scripts/physics_oracle.py /tmp/pnigeus-review/browser.json
python3 scripts/audio-oracle.py /tmp/pnigeus-review/browser.json
```

Browser review requires Playwright’s Chromium and Firefox installations. It
starts its own local servers and closes them for the offline checks. Review
outputs go outside the checkout. `npm run dev` and `npm run preview` use port
4386; the production output is `dist/` with base `/pnigeus/`.

## Publication boundary

This work created and committed a local repository. It did not create a GitHub
repository, push source, publish a registry package, run hosted CI or deploy a
site. The README names the intended future repository and Pages addresses.
The checked-in workflows are prepared for that future publication. The app is
private in npm metadata because it is a static exhibit, not a registry package.

Suggested GitHub description:
“An ancient water-organ experiment with moving water levels, Latin readings and inspectable physics.”

Suggested topics: `hydraulis`, `ancient-greek`, `vitruvius`, `hero-of-alexandria`,
`hydrostatics`, `music-education`, `interactive-learning`.
