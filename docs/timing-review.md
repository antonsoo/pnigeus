# Timing investigation: direct local review

Reviewed 2026-11-04. Implementation: `54bb5f0`. This is a **local production
review**. No source push, Pages deployment, registry release or hosted CI run
is established by these receipts. Earlier public reviews describe other editions.

## What the learner can discover

Two timings can supply the same ten ambient-equivalent litres, including the
three starting strokes, and leave different outlet totals and pressure histories.
With two pipes and tank area ratio 6:

| Exercise strokes at 0 / 2 / 4 / 6 / 8 / 10 seconds | Time in 400–1100 Pa |
| -------------------------------------------------- | ------------------: |
| 7 / 0 / 0 / 0 / 0 / 0                              |          3.678777 s |
| 0 / 1 / 2 / 1 / 1 / 2                              |                12 s |

The learner keeps the early timing, moves its strokes, and sees the fixed
comparison on the same axes. Tank and pipe changes retain the old account's
own assumptions. The optional search checks all 792 equal-air allocations for
the chosen demand and tank. Four meet the complete window for this example;
other settings can have none. The controls also permit unspent strokes, which
the account distinguishes from that exactly-seven-stroke search.

This teaches the consequence of the chosen pressure-dependent outlet law.
It is not a reconstruction of ancient pumping cadence or pipe acoustics.
[Source and derivation](timing-model.md) state the full boundary.

## Numerical evidence

The [independent solver receipt](timing-physics-verification.json) covers all
9,504 allocations across three tank ratios and four pipe counts: 57,024 release
intervals. It derives actual volume from water conservation, applies the
isothermal gas law and integrates square-root pressure numerically with RK4
at 0.02 seconds. Threshold crossings are interpolated between those steps.
It imports no application code or threshold-time antiderivative.

The largest endpoint pressure disagreement was under `1.1e-11 Pa`; the largest
interval-duration disagreement was under `5.5e-7 s`. Complete-timing counts and
best durations were checked for all twelve search domains. These numerical
agreements verify the stated model, not historical or physical measurements.
An incomplete or empty model stream makes the checker fail.

The [browser-output solver receipt](timing-browser-physics.json) independently
checks the actual downloaded interval CSV from each engine and width. The
browser driver also maps the actual SVG's pump jumps and interval endpoints
back to CSV pressure/time values, rather than checking only DOM summary text.

## Real browser operations

[Production receipt](timing-browser-verification.json): Chromium and Firefox,
each at 1440 and 375 pixels. The reviewer:
- Finds the timing room through the pump workshop, edits a native select by
  keyboard and checks that focus remains on the control.
- Spends the budget, checks disabled overspending choices, preserves a comparison,
  changes demand, restores browser history, searches a possible and impossible
  target, and loads a best timing.
- Downloads interval and full action CSV, checks their accounting, and checks
  plotted coordinates against interval endpoints.
- Saves an illustrated reading, opens the real file with scripts disabled and
  network requests blocked, checks its embedded source image's SHA-256 and
  activates its native CSV download. The resulting bytes match the original CSV.
- Checks the saved file's separate desktop and phone graphs. CSS selects them
  without scripts; print uses the wide diagram. Source and word-note content
  remain in the same file.
- Checks the operated page with axe, page-error capture and horizontal-overflow
  measurement. No violations, page errors or document overflow were observed.
- Waits for a controlling worker and matching complete edition, stops the real
  origin server, disables networking, reloads, reruns the search, saves another
  illustrated reading and navigates through the shape room back to timing.

Both engines separately reject ambiguous/over-budget shared settings and refuse
a source image served as HTTP 200 with incorrect bytes. During a delayed source
fetch, the reviewer changes the current timing, kept comparison and explanation;
the resulting download retains the earlier snapshot. Another server sends real
image headers and 64 image bytes, then stalls its response body. Cancelling
returns control, preserves the work and permits a successful retry.

[Development observation](timing-development-verification.json) separately
checks the documented Vite development origin in both browsers and widths:
initial score, search/load, actual textarea font, page errors and overflow.

## A reproduced offline-readiness defect

During cold Firefox navigation from the pump room to timing, an activated
worker and complete cache existed while the document had no controller. The
previous status nevertheless said **Ready offline**. The
[original failure state](timing-offline-before.json) retains that status,
registration and cache inventory; the controller script URL is absent because
the document's controller was null.

Readiness now requires the responding worker to control the document. If the
matching edition is saved but the page remains uncontrolled, the footer explains
the difference, asks the learner to save their reading, and offers an explicit
reload action. It does not reload over their unsaved comparison or explanation.

The deterministic regression uses the actual generated worker with only
`clients.claim()` suppressed. Both browsers must report saved-but-uncontrolled,
withhold Ready, and retain URL settings through the explicit reload. Only the
then-controlled document can report Ready. The ordinary production journey is
also tested without modifying its worker.

## Portable result and visual review

The [actual comparison](../examples/timing/reading.html.gz) contains the kept
early timing, a complete-window timing, explanation, both accounts, native CSV
downloads, Latin reading, source drawing and embedded fonts/notices. Decompress
it before opening. [The PDF](../examples/timing/reading.pdf) has eleven A4 pages;
it is an actual browser print, not a screenshot mockup. The
[artifact manifest](../examples/timing/manifest.json) identifies settings, source
commit and exact file bytes/hashes.

The [desktop image](assets/timing-desktop.png) shows the operated console and
shared-axis comparison. The [phone image](assets/timing-phone.png) shows the
complete exercise at 375 pixels. Both were inspected directly, as were the
saved file's phone view and printed first page. The phone graph stays tall
enough to read its axes. The six controls become two rows, preserving time labels.
The instrument palette and native controls extend the existing exhibit.

## Existing rooms and limits

The existing pump and shape browser reviewers were rerun on this build in both
engines and widths, including real downloads, native readings, source identities
and stopped-origin offline use. Their independent rendered-geometry and audio
checks are summarized in [the regression receipt](timing-regression-verification.json).
All thirteen unit tests, lint, strict type checking and the production build
passed after a fresh dependency installation.

The [build inventory](timing-build.json) identifies local production bytes. It
does not establish hosted delivery. No physical printer, assistive-technology
session or organ was tested. Axe results are narrower than an accessibility
audit. The PDF is untagged. Earlier-source translation limitations remain.
Offline status inspects edition and cache presence after integrity-checked
installation; it does not continuously rehash later cache mutations. Source and
font exports perform their own identity checks. Multi-tab edition replacement
and cache eviction/repair were not added to this review.

## Reproduce

Node 24 or newer, Python 3.12+ and the existing Playwright browsers:

```sh
npm ci
npm run check
npm run verify:timing
npm run test:timing -- /tmp/pnigeus-timing
python3 scripts/timing-oracle.py --browser < /tmp/pnigeus-timing/browser-cases.jsonl
```

The browser command serves the existing `dist/` itself. Do not rebuild during
its run. `npm run build` writes `dist/` with base `/pnigeus/`. The direct
development command is `npm run dev`, then open
`http://127.0.0.1:4386/pnigeus/timing.html`.

Suggested repository description: **Operate an ancient water-organ model:
chamber shape, pressure, pump timing, Greek and Latin sources.**
Topics: `hydraulis`, `ancient-greek`, `latin`, `hydrostatics`, `music-education`,
`interactive-learning`, `history-of-technology`.
