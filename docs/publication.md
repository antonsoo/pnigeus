# Public water-organ experiment

Reviewed 2026-10-22 at [the live exhibit](https://antonsoo.github.io/pnigeus/).
Application source: `4f085d1558de0b01c520231d926649a0c636de54`. Reviewer: `e611240cc0bce56a28869538c924688c8f7d9034`.
Pages branch: `d62149ad38a136e48337afacfbc581b969e03b59`. Documentation-only changes after these revisions
do not alter the ten-file build reviewed here.

## What can be learned

Three one-litre strokes, with the pipes closed and tank area ratio 6,
produce about **854 Pa**. Open pipe 1 and release for five experimental seconds:
pressure falls to about **410 Pa**. Two moving water surfaces determine the
head. Further strokes at the open-rim limit vent surplus air.

[Open this action sequence](https://antonsoo.github.io/pnigeus/?tank=6&events=P.P.P.K1.W5#experiment).
These are outputs of a stated modern model, not measurements of an ancient
instrument. The [model derivation](model.md) gives its choices and limits.

## Public evidence

| Evidence                                                     | Observed result                                                                                                                      | Boundary                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| [Canonical hosted bytes](hosted-bytes.json)                  | All 10 built files matched their SHA-256 digests and lengths; root matched index before and after                                    | Actual canonical URLs, without cache-busting parameters                               |
| [Hosted browser workflows](hosted-browser.json)              | Chromium and Firefox at 1440 and 375 px; keyboard, history, source reading, real downloads, accessibility and offline reloads passed | Browser networking disabled for offline checks; public origin itself remained running |
| [Downloaded CSV and SVG](hosted-rendered.json)               | 708 independent comparisons; numeric error below 7e-13, water-path rounding error below 0.000432 SVG units                           | Chosen teaching physics and actual rendered coordinates                               |
| [Hosted audio downloads and live buffers](hosted-audio.json) | Eight WAVs and eight live buffers; 1,920,000 samples per format; zero quantization disagreements                                     | Modern sine reference tones; digital samples, not ancient timbre or loudspeakers      |

Each configuration saved and opened a standalone illustrated reading with
networking disabled. Its embedded image, fonts and finite audio loaded.
The offline app then accepted another pump stroke and exported a new reading.
Substituted source bytes returned with HTTP 200 were refused before export;
restoring the original source recovered it. Ambiguous duplicate query
parameters reset the experiment with a visible warning.

The source and `gh-pages` branches were pushed to the public GitHub repository.
Pages serves the `gh-pages` branch at `/`. This review establishes neither
hosted CI execution nor a registry package release.

## Reproduce hosted workflows

Build the reviewed checkout, then run:

```sh
node scripts/browser-review.mjs /tmp/pnigeus-review/hosted.json https://antonsoo.github.io/pnigeus/
python3 scripts/physics_oracle.py /tmp/pnigeus-review/hosted.json
python3 scripts/audio-oracle.py /tmp/pnigeus-review/hosted.json
```

Raw downloads and screenshots are written alongside the receipt. The retained
browser receipt omits their local paths. Public requests and this working
checkout must still refer to the same edition when reproducing this review.
