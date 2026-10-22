# An instrument you can interrogate

For English-speaking learners of ancient technology, music and languages.
The job is to understand how an organ can use water while sending **air** to
its pipes, then test what a finite reservoir can and cannot do.

The memorable object is a large cutaway with two moving water surfaces and
the height difference between them. It is an original explanatory drawing,
not a reconstructed ancient instrument. The source drawing is shown separately.

Visual plan: a porcelain-blue work surface (#e8eff3), deep ink (#193648),
brass (#936415), water (#346e90), pale trapped air (#fff2cf), and paper (#fafbf9).
IBM Plex Sans handles controls and explanations; Noto Serif handles the title,
Latin and Greek. Fonts are self-hosted with their existing OFL notices.
The experiment opens immediately; sources and derivation follow below it.

```text
Pnigeus                             Experiment / Reading / Model
The water inside a water organ
Try three strokes, then open a pipe.
+-------------------------------------+------------------------+
|                                     | Pump one stroke        |
| large labelled regulator cutaway    | Four pipe toggles      |
| two surfaces + measured head       | Let air out for 2 s    |
|                                     | pressure + accounting  |
+-------------------------------------+------------------------+
| pressure over experiment time / event history                |
+-------------------------------------------------------------+
| Hero's printed drawing | Latin reading and linked word notes |
| explicit model assumptions and the exact equations            |
```

On a phone the drawing sits above its controls, with short labels inside the
plate and the explanatory key below it. A constant viewport does not compress
all the labels into unreadable type. Native buttons and checkboxes preserve
keyboard focus when the drawing changes.

The design avoids generic feature cards, decorative metrics and a simulated
antique manuscript. It is a working science exhibit about an ancient device.

## Source and modelling boundaries

Hero, _Pneumatics_, Greenwood/Woodcroft (1851), section **76**, pp. 105–107,
describes the manually pumped water organ. Section 77 is the wind-driven
organ and must not be confused with the water-organ description. His chamber
is hemispherical. Vitruvius X.8.2 describes an inverted funnel. Our chamber
has a constant cross-section so its storage equation can be derived and checked.

All dimensions, atmospheric pressure, the one-litre stroke, pipe conductance,
temperatures assumed constant and modern reference tones are chosen teaching
parameters. No dimensions or tuning are recovered from these texts.

The experiment advances only when the learner issues a command. Pump strokes
are idealized instantaneous deliveries of one ambient-equivalent litre. A
release advances the experiment clock by the chosen interval. This avoids
mistaking wall-clock or a background browser tab for experimental time.

No historical constant-pressure claim: the head changes as gas volume changes.
At the rim, extra air vents. At equal water levels, useful gauge pressure is zero;
the chamber still contains air. Water volume is conserved throughout.

## Shape and usable-wind study

A second room connects Hero’s eight-word Greek instruction to a physical
question: how much air can a chosen chamber deliver within a pressure band?
The large diagram shows both surfaces, a real chamber profile and a schematic
tank width. A plan inset preserves the tangent octagon’s corner channels.
Stable controls preserve focus; the comparison table and pressure curves use
actual and ambient-equivalent litres as separate quantities.

The Greek passage is read beside the retained printed page. Vitruvius’s funnel
wording is not assigned to a mathematical cone: Hagel’s discussion of rounded
Roman funnels makes that a misleading equivalence. The hemisphere follows
Hero’s form; the cylinder and cone are explicitly modern comparisons.

The study deliberately holds footprint and height fixed, rather than claiming
an optimal chamber under all constraints. Its source-inspired 80 cm preset
is labelled as scholarly reconstruction. The independent model and its
limitations are derived in [shapes-model.md](shapes-model.md).
