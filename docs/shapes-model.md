# Shape, fill and usable wind

This is a second experiment, separate from the first workshop's constant-section
chamber and its one-litre pump commands. It asks how much air a full regulator
can supply before its pressure falls by a chosen percentage. It has no outlet
coefficient, clock, pipe model or sound synthesis.

## What comes from the sources

Hero, _Pneumatics_ I.42, calls the chamber a hollow hemisphere turned upside down.
The Greek passage is on p. 192 of Wilhelm Schmidt's 1899 edition. Vitruvius
X.8.2 compares his chamber to an inverted _infundibulum_, a funnel. These
wordings do not by themselves establish different chamber shapes. Stefan Hagel,
“Inside the Hydra: Taking the Ancient Water Organ Seriously,” _Greek and Roman
Musical Studies_ 11 (2023), 52–81, especially pp. 55–60, points out that Roman
funnels could be rounded and argues for a high-filled, closely enclosed dome.
His dimensional reconstruction is an interpretation, not a surviving instrument's
measured wind pressure. DOI: [10.1163/22129758-bja10055](https://doi.org/10.1163/22129758-bja10055).

The hemisphere follows Hero's stated form. The cylinder and mathematical cone
are modern comparison geometries. The cone must not be labelled “Vitruvius's
shape.” The first workshop's constant square section remains a separate teaching
choice. No geometric comparison establishes the ancient instrument's timbre,
pipe type, exact dimensions, manufacturing method or pressure tolerance.

## What the controls hold fixed

All three solids have the same circular open rim of radius `r` and the same
height `r`. They differ in volume. The radius is chosen from 10–50 cm in 5 cm
steps. Heights `z` are measured upward from the open rim, not the floor.

The tank has constant horizontal area `T`:

| Plan                                               | Area             |
| -------------------------------------------------- | ---------------- |
| Regular octagon circumscribed about the rim circle | `8 r² tan(pi/8)` |
| Round tank of twice the rim area                   | `2 pi r²`        |
| Round tank of six times the rim area               | `6 pi r²`        |

The octagon leaves corner channels even though its sides are tangent to the
rim circle. The section drawing gives the outside water extra horizontal space
for legibility. Its tank width is schematic; chamber profile and vertical water
levels are to a common scale. The plan inset shows the actual chosen area.

The initial, unpressurized water surface `z0` lies at `r/2`, `r` or `5r/4`.
At the last two fills the chamber initially contains no air in this ideal model.
Plumbing volume, wall thickness, waves, leakage and the clearance below the rim
are omitted. The calculated water quantity `T*z0` is **water above rim height**;
water in the omitted clearance adds an unmodelled constant. At a high fill the
last infinitesimal air pocket has a positive limiting hydrostatic pressure. An
empty chamber supplies no wind. The app distinguishes this boundary from a
finite usable pressure interval.

Every comparison starts after air has displaced the inside water down to the
rim. “Full” means this storage limit. Further air would escape below the rim.
We then withdraw air until the selected fraction of full pressure remains.
The chosen 10%, 20%, 30%, 50% or 90% permitted drop is an experimental criterion,
not an ancient performance specification.

## Geometry and conserved water

Write `A(z)` for the chamber's horizontal cross-section, and `F(z)` for its
integral from the rim to `z`. Clamp `F` below the rim and above the roof.
For `t = z/r` between zero and one:

| Form       | `A(z)`        | `F(z)/(pi r³)` | Air cap above `z`, divided by `pi r³` |
| ---------- | ------------- | -------------- | ------------------------------------- |
| Cylinder   | `pi r²`       | `t`            | `1-t`                                 |
| Hemisphere | `pi r²(1-t²)` | `t-t³/3`       | `(1-t)²(t+2)/3`                       |
| Cone       | `pi r²(1-t)²` | `t-t²+t³/3`    | `(1-t)³/3`                            |

The factored air-cap expressions avoid subtracting almost equal volumes near
the roof. The same radius function draws the solid's section and the endpoints
of the inside water surface. The water surface's actual height is also retained
as data independently of the path's rounded coordinates.

Let `zi` and `zo` be the inside and outside water heights. Ignoring metal and
plumbing volumes, conserved water gives:

```text
T*zo - [F(zo) - F(zi)] = T*z0
```

`T*zo` includes the imaginary water-filled column below the outside surface;
`F(zo)-F(zi)` removes the part occupied by chamber air below that surface.
The derivative of `T*zo-F(zo)` is `T-A(zo) > 0`, including the octagon's
corner area. The application solves this monotone equation by 56 bisections.

Head and gauge pressure follow:

```text
h = zo - zi
p = 1000 * 9.80665 * h          [Pa]
```

Actual air volume `V` is the cap above `zi`, in litres. Ambient-equivalent gas
stock `S` uses the isothermal ideal-gas relation:

```text
S = V * (1 + p/101325)         [ambient-equivalent litres]
```

For the permitted pressure drop, a second monotone bisection finds `zi`.
The difference between full and remaining **stock** is the gas delivered to the
pipes, expressed at atmospheric pressure. The difference in actual chamber
**volume** is shown separately. They are different quantities; pressure and
compression change as the air is released.

If a requested endpoint lies below the pressure at which the high-filled
chamber empties, the app stops at empty and says that the target is not reached.
It does not invent air volume in omitted plumbing.

## Reproducing the published example

For an 80 cm diameter hemisphere in a tangent octagon, with water initially
at the roof, the formulas give:

```text
r = 0.4 m
T = 0.5301933598375618 m²
full V = 134.04128655316455 L
full h = 0.652815853058272 m
full p = 6401.9365853939025 Pa
full S = 142.51031015383538 ambient-equivalent L
```

Allowing a 30% pressure drop removes 49.9698065383 actual litres of chamber
volume, matching Hagel's rounded 50 L geometric result on p. 63. Accounting
for isothermal compression gives **54.7205552948 ambient-equivalent litres**
delivered. These values are reproducible calculations under the stated
assumptions. They do not add a gas correction to a claimed ancient measurement.

At unchanged dimensionless fill and tank plan, halving `r` divides all heights
and hydrostatic pressures by two and all geometric volumes by eight.
Ambient-equivalent stock does **not** divide by exactly eight because its
compression factor changes too. The interface and export keep this distinction.

The comparison does not establish that the hemisphere maximizes air reserve
under every possible constraint. At the same footprint and height a cylinder
holds more air, but also runs at a different pressure. Other constraints, such
as matching the initial air volume or holding full pressure fixed, are different
experiments.
