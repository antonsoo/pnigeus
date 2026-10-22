# The finite wind reserve

This model is chosen for explanation. The sources establish the arrangement,
not this geometry or these coefficients. All heights refer to one floor datum.

Let A = 0.04 m² be the constant inner chamber area, R the tank area divided by
A, z₀ = 0.30 m the rest water level, zᵣ = 0.04 m the rim, and zₜ = 0.52 m the roof.
The outside water area is A(R − 1). Wall thickness and pipe volumes are omitted.
For all supported R (3, 6, 12), the maximum outside level remains below the roof,
so these areas stay constant throughout the supported displacement range.

If inside water drops by d:

```text
z_inside  = z0 - d
z_outside = z0 + d / (R - 1)
h         = z_outside - z_inside = d * R / (R - 1)
p         = rho * g * h = k*d
V         = 1000 A (zt - z_inside) = V0 + 40d, in litres
```

Here rho = 1000 kg/m³, g = 9.80665 m/s², k = rho g R/(R − 1), and V₀ = 8.8 L.
The outside surface is exposed to atmospheric pressure P₀ = 101325 Pa. The
isothermal gas relation uses **absolute** pressure, giving ambient-equivalent stock S:

```text
S = V (P0 + p) / P0
  = V0 + b*d + a*d²
a = 40k/P0
b = 40 + k*V0/P0
```

The state stores S, rather than treating actual compressed volume as the gas
amount. The inverse uses the rationalized root:

```text
d = 2(S - V0) / [b + sqrt(b² + 4a(S - V0))]
```

Its operating interval is 0 ≤ d ≤ z₀ − zᵣ = 0.26 m. At d = 0, gauge pressure is
zero, and V₀ litres of air remain. At d = 0.26, the inside surface has reached
the open rim. Additional air is accounted for as vented gas; no extra pressure
or water loss is invented. At R = 6 the extra stock capacity is about
10.979776 ambient-equivalent litres. The exact program output is in the
independent review; the last decimal is not an ancient measurement.

## A release without an integration time step

The chosen flow is q = cN sqrt(p/P_ref) ambient litres/second, with c = 0.4,
P_ref = 1000 Pa and N the count of open pipes. It is a pedagogical outlet rule,
not a fitted orifice model or a reconstruction of ancient voicing.

Conservation gives dS/dt = −q. With u = sqrt(d), an antiderivative is:

```text
F(u) = 2b*u + (4a/3)*u³
F(u_end) = max(0, F(u_start) - cN sqrt(k/P_ref) * elapsed)
```

F is monotone. Sixty bounded bisection steps solve for u_end in [0, u_start].
With no open pipes the stock is retained exactly. The flow stops at zero useful
gauge pressure. This also gives the entire pressure trajectory for audio and
the graph, without depending on animation frames or wall-clock time.

The dry comparison has fixed V₀, so S = V₀(1 + p/P₀). Its release has a direct
solution in sqrt(S − V₀):

```text
sqrt(S_end - V0) = max(0, sqrt(S_start - V0)
                         - cN sqrt(P0 / (V0 P_ref)) * elapsed / 2)
```

It receives the same one-litre strokes and gate commands. It has no relief
outlet. Its purpose is a controlled comparison of gas storage assumptions;
it is not an alternative archaeological reconstruction.

## Independent check

`scripts/physics_oracle.py` shares these declared physical assumptions but
imports no application code. It derives V directly as a function of pressure
from water conservation, solves pressure from S with its own bisection, and
integrates x = sqrt(p) with fourth-order Runge–Kutta at steps ≤ 0.002 seconds:

```text
V(p) = V0 + beta*p
S(p) = V0 + B*p + A*p²
dx/dt = -cN / [2 sqrt(P_ref) (B + 2A*x²)]
```

This equation remains regular as pressure reaches zero. The independent
coordinate and numerical method check the app’s exact-time implementation.
Browser review additionally checks both actual SVG water-line paths and the
complete CSV action order, rather than relying only on internal geometry values.
