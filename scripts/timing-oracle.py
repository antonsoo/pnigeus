"""Independent pressure-coordinate RK4 audit. Imports no application code.

Water conservation fixes actual volume from pressure. The isothermal gas law
gives its stock derivative. Integrate sqrt(pressure) numerically, measuring
threshold crossings between steps; do not reuse the app's displacement solver
or its threshold-time antiderivative.
"""
import json
import math
import sys

MAX_PRESSURE_ERROR = 0.0
MAX_TIME_ERROR = 0.0
GROUPS = {}
CASES = 0


def coefficients(tank):
    # V(P) = 8.8 + cP actual litres, by water conservation and rho*g*head.
    c = 40 * (tank - 1) / (1000 * 9.80665 * tank)
    return c + 8.8 / 101325, c / 101325


def stock(p, tank):
    b, a = coefficients(tank)
    return 8.8 + b * p + a * p * p


def pressure(s, tank):
    lo, hi = 0.0, 10000.0
    for _ in range(55):
        mid = (lo + hi) / 2
        if stock(mid, tank) < s:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def simulate(settings):
    tank, pipes = settings["tank"], settings["pipes"]
    b, a = coefficients(tank)
    root_low, root_high = math.sqrt(400), math.sqrt(1100)
    s = 11.8  # 8.8 L at rest plus three initial one-litre deliveries
    rows = []
    dt = 0.02

    def rate(u):
        return -pipes * 0.4 / (2 * math.sqrt(1000) * (b + 2 * a * u * u))

    for strokes in settings["strokes"]:
        # Same open-rim geometry, independently expressed in pressure coordinates.
        cap_p = 1000 * 9.80665 * 0.26 * tank / (tank - 1)
        s = min(stock(cap_p, tank), s + strokes)
        peak = pressure(s, tank)
        u = math.sqrt(peak)
        above_low = above_high = 0.0
        for _ in range(100):
            k1 = rate(u)
            k2 = rate(u + dt * k1 / 2)
            k3 = rate(u + dt * k2 / 2)
            k4 = rate(u + dt * k3)
            end = max(0.0, u + dt * (k1 + 2*k2 + 2*k3 + k4) / 6)

            def elapsed_above(threshold):
                if u <= threshold:
                    return 0.0
                if end >= threshold:
                    return dt
                return dt * (u - threshold) / (u - end)

            above_low += elapsed_above(root_low)
            above_high += elapsed_above(root_high)
            u = end
        trough = u * u
        rows.append({"peak": peak, "trough": trough, "below": 2-above_low,
                     "within": above_low-above_high, "above": above_high})
        s = stock(trough, tank)
    return rows


def check_case(record):
    global MAX_PRESSURE_ERROR, MAX_TIME_ERROR, CASES
    settings = record["settings"]
    rows = simulate(settings)
    for expected, actual in zip(rows, record["slots"], strict=True):
        for name in ["peak", "trough", "below", "within", "above"]:
            error = abs(expected[name] - actual[name])
            limit = 2e-5 if name in ["peak", "trough"] else 1e-5
            assert error < limit, (settings, name, expected[name], actual[name], error)
            if name in ["peak", "trough"]:
                MAX_PRESSURE_ERROR = max(MAX_PRESSURE_ERROR, error)
            else:
                MAX_TIME_ERROR = max(MAX_TIME_ERROR, error)
    within = sum(row["within"] for row in rows)
    full = all(row["peak"] <= 1100 + 1e-7 and row["trough"] >= 400 - 1e-7 for row in rows)
    assert full == record["complete"], settings
    used = sum(settings["strokes"])
    for mode in (["at-most", "exact"] if used == 7 else ["at-most"]):
        group = GROUPS.setdefault((settings["tank"], settings["pipes"], mode),
                                  {"count": 0, "full": 0, "best": 0, "minimumCompleteStrokes": None})
        group["count"] += 1
        group["full"] += full
        group["best"] = max(group["best"], within)
        if full:
            group["minimumCompleteStrokes"] = min(group["minimumCompleteStrokes"] if group["minimumCompleteStrokes"] is not None else used, used)
    CASES += 1


for line in sys.stdin:
    record = json.loads(line)
    if record["type"] == "case":
        check_case(record)
    else:
        group = GROUPS[(record["tank"], record["pipes"], record["mode"])]
        assert group["count"] == record["count"] == (792 if record["mode"] == "exact" else 1716)
        assert group["minimumCompleteStrokes"] == record["minimumCompleteStrokes"]
        assert group["full"] == record["full"]
        assert abs(group["best"] - record["bestSeconds"]) < 6e-5

if "--browser" in sys.argv:
    assert CASES == 4, ("expected both browsers at both widths", CASES)
else:
    assert CASES == 20592 and len(GROUPS) == 24, ("incomplete model stream", CASES, len(GROUPS))

print(json.dumps({"method": "pressure-coordinate RK4, dt=0.02 s, linear root-pressure crossings",
                  "cases": CASES, "intervals": CASES * 6,
                  "maximum_pressure_error_pa": MAX_PRESSURE_ERROR,
                  "maximum_interval_time_error_s": MAX_TIME_ERROR,
                  "searches": [{"tank": key[0], "pipes": key[1], "mode": key[2], **value} for key, value in GROUPS.items()]}, indent=2))
