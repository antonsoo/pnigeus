# Contributing

Use Node.js 24 or newer. Run `npm ci`, then `npm run check` and
`npm run verify:physics`. For browser work, install Playwright Chromium and
Firefox and run the complete review described in the README. Inspect the
screenshots and native saved reading.

Historical corrections need a work, edition and precise passage. Keep the
mechanism described by a source, editorial illustrations, and modern numerical
choices distinct. Do not add ancient pitches or dimensions by inference.

Physics changes need an independent derivation or calculation. Audio changes
need inspection of the actual downloaded WAV and live samples. Browser tests
must exercise real controls and exports. Do not add tests that simply reproduce
an implementation’s arithmetic and call the agreement independent.

Keep the app usable at 375 px, by keyboard, without external requests, and
offline after complete caching. Preserve the source-image and font notices in
standalone exports. Avoid new runtime dependencies.
