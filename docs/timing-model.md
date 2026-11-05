# Seven strokes, twelve seconds

The timing room makes an existing assumption consequential: the model's outlet
flow increases with pressure. Equal deliveries need not leave equal stock,
outflow or pressure histories. Move deliveries, keep an earlier timing, and
inspect the difference on shared axes.

## Source and model

Hero, _Pneumatics_, section 76, pp. 105–107 of Greenwood/Woodcroft's 1851
edition, describes a manual piston, submerged chamber, transverse air tube and
selectively opened pipes. The
[complete description](https://www.gutenberg.org/cache/epub/77400/pg77400-images.html#Page_105)
was checked on 2026-11-04. The retained nineteenth-century figure is an
explanatory drawing. The pump reader supplies Vitruvius X.8.2 in Latin; the
shape reader supplies Hero's Greek chamber clause beside its printed page.

These texts do not supply our dimensions, stroke volume, cadence, starting
stock, pressure window or outlet coefficient. The timing room uses the existing
**constant-section** model, not Hero's hemisphere. A pressure target does not
establish sound, pipe voicing, loudness or acceptable pitch change. No ancient
musical performance is reconstructed.

| Item                   | Chosen constraint                                    |
| ---------------------- | ---------------------------------------------------- |
| Before the clock       | Three one-litre strokes, pipes closed                |
| Delivery instants      | 0, 2, 4, 6, 8, 10 seconds                            |
| Available exercise air | Up to seven additional ambient-equivalent litres     |
| Delivery               | Instantaneous, whole one-litre strokes               |
| Pipe demand            | 1–4 gates stay open for 12 seconds                   |
| Tank area              | 3, 6 or 12 times chamber area                        |
| Pressure target        | 400–1100 Pa gauge, inclusive                         |
| Search domain          | Exactly seven, or zero to seven, across six instants |
| Objective              | Maximum duration inside that pressure band           |

Controls permit unspent strokes; the account states the number left. The search rule either
holds total air fixed at seven or allows zero through seven. Zero complete
timings is restricted to the selected finite domain. Arbitrary delivery times, partial
litres, changing gates, finite strokes and human effort are outside the search.

```text
three starting strokes (before the clock)
                |
                v
time, s         0       2       4       6       8      10      12
                |-------|-------|-------|-------|-------|-------|
stroke choices  n0      n1      n2      n3      n4      n5
                ^ deliveries precede that slot's release
fixed gates     [                open throughout                ]
```

A kept timing has its own strokes, tank and pipe count. Current edits leave it
fixed. Browser Back restores the current timing; the kept account and explanation
remain in the tab. Reload loses those drafts, as the page states. The illustrated
reading retains both accounts and the explanation. Its link reopens the current settings and search rule only. The editable
notebook download (also inside the script-free reading) restores both accounts,
the explanation and the search rule. A versioned parameter record must match
before recomputation. Invalid files leave the work alone. Opening retains the
previous notebook; switching saves the edits made on either side. If work changes
while a file is being read, opening awaits an explicit choice.

## Crossing time, not plotted samples

The [pump derivation](model.md) gives stock in terms of inside-surface drop `d`:

```text
S(d) = V0 + b*d + a*d^2          ambient-equivalent litres
P = k*d                         Pa gauge
q(P) = N * 0.4 * sqrt(P/1000)    ambient-equivalent litres/s
```

Thus `S(P) = V0 + (b/k)P + (a/k^2)P^2`. The time to fall from `P0` to `T` is:

```text
sqrt(1000) / (N*0.4) * [
  (2b/k) * (sqrt(P0) - sqrt(T))
  + (4a/(3k^2)) * (P0^(3/2) - T^(3/2))
]
```

Each release decreases pressure monotonically. Clamp each threshold's crossing
time to `[0, 2]`. If initial pressure is already below the threshold, its time
above is zero. Then:

```text
below = 2 - time_above(400)
above = time_above(1100)
within = time_above(400) - time_above(1100)
```

Instantaneous deliveries occupy no elapsed time. Crossing the target during a
delivery adds no residence time. The three starting strokes precede the measured
interval. Plot curves are sampled every 0.1 seconds; the score and search do not
count those samples. Summaries round to milliseconds; the table and CSV retain
more precision. A complete result uses a tolerance of 1e-9 seconds, not the
rounded display.

There are `C(12, 5) = 792` seven-stroke compositions. Every composition is
evaluated. The search reports complete timings, maximum time and one best
timing. Summing budgets zero through seven gives `C(13, 6) = 1716`
compositions. Scores within 1e-9 seconds tie; ties prefer fewer strokes, then the
first allocation. Budgets and slot counts are enumerated from zero upward.
No unique optimum is claimed.

With one open pipe and tank ratio 6, the exactly-seven domain has no complete
timing (best duration: 10 s). The zero-to-seven domain has 22 complete timings;
the minimum uses three extra strokes. One is `0 / 0 / 1 / 0 / 1 / 1`, giving all
12 seconds with six supplied litres including the starting three. The result
shows why “impossible” must name the assumptions it holds fixed.

## Worked comparison

Two open pipes, tank area ratio 6:

| Strokes at 0 / 2 / 4 / 6 / 8 / 10 s | Below, s | Within, s | Above, s |
| ----------------------------------- | -------: | --------: | -------: |
| 7 / 0 / 0 / 0 / 0 / 0               | 2.698894 |  3.678777 | 5.622329 |
| 0 / 1 / 2 / 1 / 1 / 2               |        0 |        12 |        0 |

Each receives ten ambient-equivalent litres including the starting three.
The early timing sends 9.633315 L through the pipes; the second sends
7.899693 L. Neither vents. Remaining excess gas closes the account. These are
modern model outputs, not organ measurements.

## Portable investigation

The interval CSV carries target, starting strokes, stroke volume, budget, pipe
count, tank ratio and model label on every row. The full action CSV retains all
deliveries and releases, both water levels, stock, outflow and venting. The
script-free illustrated HTML retains both accounts, plot, explanation, action
history, Latin reading and word notes, verified source drawing, embedded fonts
and notices, and native CSV downloads. Its last-release audio is the final
two-second interval, explicitly labelled, not a twelve-second performance.

Learner content is captured before asset fetching. Editing during saving cannot
revise that file. A substituted image with HTTP success is refused. Cancelling
aborts pending fetches and response-body reads, keeps the work and permits retry.

See [the actual review](timing-review.md) for numerical checks, browser operations,
artifacts and limits.
