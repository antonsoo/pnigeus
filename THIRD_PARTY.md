# Sources and rights

The original application code, original cutaway and chart, and new English
explanations and translations are MIT licensed. The following materials have
their own provenance. No third-party audio, ancient-performance recording or
modern instrument photograph is redistributed.

## Hero’s water-organ description and illustration

- Ancient work: Hero of Alexandria, _Pneumatics_.
- Edition: _The Pneumatics of Hero of Alexandria, from the Original Greek_,
  translated by Joseph George Greenwood, edited by Bennet Woodcroft
  (London: Taylor, Walton and Maberly, 1851).
- Exact location: **section 76**, “An Altar Organ blown by manual Labour,”
  pp. 105–107, figure 76. Section 77 describes the wind-driven organ and
  is not the section used for this exhibit.
- [Complete edition at Project Gutenberg, entry 77400](https://www.gutenberg.org/ebooks/77400),
  [section 76](https://www.gutenberg.org/cache/epub/77400/pg77400-images.html#Page_105).
  Gutenberg’s credits identify HathiTrust images as the digitization source.
- File reused without image alteration: `public/sources/hero-fig76.jpg`, from
  [figure 76](https://www.gutenberg.org/cache/epub/77400/images/fig76.jpg).
  Downloaded 2026-10-22; 115259 bytes; SHA-256:
  `6bb3ec5db3a250a4d44895b51aa442f0de2800cc328e0d717b7177a4d58b6133`.
- This 1851 illustration is public domain in the United States. It is a modern
  printed explanation of the ancient description, not a surviving ancient plan.
  The application reproduces no Gutenberg branding or editorial wrapper.

The description supplies a water-filled vessel, an inverted hemispherical
chamber open to water below, a manually operated air pump, an air supply to
pipes and a mechanism for selectively opening their passages. It does not
supply this model’s dimensions, hertz, outlet coefficient or numerical pressure.

## Vitruvius’s Latin

- Work: _De architectura_ X.8.2.
- Edition checked: _Vitruvii De architectura libri decem_, ed. Valentin Rose,
  second edition (Leipzig: Teubner, 1899), passage beginning on printed p. 257;
  alternate prior-edition page number 261 appears in the margin.
- [Project Gutenberg entry 51812](https://www.gutenberg.org/ebooks/51812),
  [the actual paragraph](https://www.gutenberg.org/cache/epub/51812/pg51812-images.html#vitruvius-para671).
- Cross-check: [LacusCurtius, Latin Book X, chapter 8](https://penelope.uchicago.edu/Thayer/L/Roman/Texts/Vitruvius/10*.html#8).
- Reused text: the eleven-word excerpt beginning _intra arcam_ and ending
  _infundibulum inversum_. Ancient text and the 1899 edition are public domain
  in the United States. Capitalization, line breaks and sentence presentation
  are normalized. The English translation and grammatical explanations are new.

Vitruvius compares the chamber to an inverted funnel; Hero’s description uses
a hemisphere. The drawing and algebra here deliberately use a constant-section
chamber to make a bounded, inspectable modern experiment. Those shapes must not
be silently identified with one another.

## Greek vocabulary

The chamber name is presented as πνιγεύς, transliterated _pnigeus_. The Latin
passage uses _pnigeus_ as a Greek loanword. This contextual sense does not
replace the other senses listed by dictionaries. Greek ὕδωρ (_hydōr_, water)
and ἀήρ (_aēr_, air) are normalized headwords rather than transcribed lines of
Hero’s argument. No pronunciation audio is supplied.

Linked lexical entries: [LSJ / Scaife ATLAS, πνιγεύς](https://atlas.perseus.tufts.edu/lemma/28544/),
[Logeion, ὕδωρ](https://logeion.uchicago.edu/ὕδωρ),
[Logeion, ἀήρ](https://logeion.uchicago.edu/ἀήρ). Only the headwords and brief
original explanations are included; dictionary pages are not redistributed.

## Modern physical explanation

[NASA Glenn, “Fluids Pressure and Depth”](https://www.grc.nasa.gov/WWW/K-12/WindTunnel/Activities/fluid_pressure.html)
supports the hydrostatic relation and the distinction between gauge and
absolute pressure. Water conservation and the isothermal ideal-gas relation
produce the teaching equations in `docs/model.md`. The pipe conductance,
temperature assumption, geometry and reference sounds are chosen parameters,
not numbers attributed to the ancient authors or NASA.

## Fonts

- IBM Plex Sans Regular and SemiBold WOFF2, from
  [IBM/plex](https://github.com/IBM/plex/tree/master/packages/plex-sans/fonts/complete/woff2).
  SIL Open Font License 1.1: `public/fonts/IBMPlex-OFL.txt`.
- Noto Serif Regular TTF, from
  [Noto Serif](https://github.com/notofonts/latin-greek-cyrillic).
  SIL Open Font License 1.1: `public/fonts/NotoSerif-OFL.txt`.

Font files and their notices match the attributed files already used in the
Pyknon checkout. They are served locally. Standalone readings embed the fonts
and include both complete notices. The application checks their edition hashes
before writing a standalone reading.
