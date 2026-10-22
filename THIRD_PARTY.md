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
a hemisphere. These wordings need not establish different forms: Roman funnels
could be rounded, as discussed by Hagel below. The pump workshop deliberately
uses a constant-section chamber. The shape study adds a hemisphere and two
modern comparison forms; its cone is not labelled as Vitruvius’s design.

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

## Hero’s Greek construction instruction

- Work and location: _Pneumatics_ I.42, opening instruction.
- Edition: Wilhelm Schmidt (ed.), _Herons von Alexandria Druckwerke und
  Automatentheater_, vol. I (Leipzig: Teubner, 1899), printed p. 192.
- [Digitized edition](https://archive.org/details/heronsvonalexandhero/page/n268/mode/1up),
  [downloaded page](https://archive.org/download/heronsvonalexandhero/page/n267.jpg).
  The image download endpoint and BookReader leaf address use different indices;
  the retained page itself visibly prints **192**, chapter **XLII**.
- File: `public/sources/hero-schmidt-192.jpg`, downloaded without alteration
  on 2026-10-22; 441836 bytes, 1650 × 2473 pixels, SHA-256
  `b353ae798dfcf466b9a95d965adee39a9dbd179b4534a3b62f5b915916f9e10d`.
- The 1899 edition is public domain in the United States. The eight-word clause
  was checked visually against this facsimile. The typed reading rejoins a
  printed word across lines and removes an older-edition page marker.
- Cross-check: [OpenGreekAndLatin / First1KGreek TEI](https://github.com/OpenGreekAndLatin/First1KGreek/blob/master/data/tlg0559/tlg001/tlg0559.tlg001.1st1K-grc1.xml),
  Harvard College Library (2017), CC BY-SA 4.0. Its complete text and encoding
  are not redistributed. The short public-domain Greek clause is transcribed
  from the facsimile; the English translation and grammar notes are new.

## Modern investigation of regulator shape

Stefan Hagel, “Inside the Hydra: Taking the Ancient Water Organ Seriously,”
_Greek and Roman Musical Studies_ 11 (2023), 52–81.
[DOI:10.1163/22129758-bja10055](https://doi.org/10.1163/22129758-bja10055).
[Author’s publication list](https://homepage.univie.ac.at/stefan.hagel/);
[author-uploaded paper](https://www.researchgate.net/publication/369186170_Inside_the_Hydra_Taking_the_Ancient_Water_Organ_Seriously).

The exhibit cites the paper’s discussion of rounded funnels (pp. 55–60), its
80 cm geometric example (p. 63), and its distinction between geometric volume
and compression (p. 65, note 21). The paper’s dimensional and operating
interpretation is scholarly reconstruction, not an ancient pressure measurement.
No paper figure is redistributed; all interactive diagrams and calculations
are original. [Source checking details](docs/shapes-source-verification.json).
