"""Independent pressure-coordinate ODE review. Imports no application code.

The app inverts an exact time integral in water displacement. This checker
integrates sqrt(pressure) numerically with RK4 from water conservation and PV.
Only the documented teaching assumptions are shared.
"""
import csv
import io
import json
import math
import sys

ATM = 101325.0
RHO_G = 1000 * 9.80665
BASE = 8.8
maximum_error = {"numeric": 0.0, "svg_pixels": 0.0}
comparisons = 0


def assert_close(actual, expected, tolerance=2e-7, unit="numeric"):
    global maximum_error, comparisons
    error = abs(actual - expected)
    comparisons += 1
    maximum_error[unit] = max(maximum_error[unit], error)
    assert error <= tolerance, (actual, expected, error)


def pressure_for(stock, tank):
    # water volume conservation gives V(P) = BASE + beta*P in litres.
    beta = 40 * (tank - 1) / (tank * RHO_G)
    low, high = 0.0, 10000.0
    for _ in range(70):
        mid = (low + high) / 2
        required = (BASE + beta * mid) * (1 + mid / ATM)
        if required < stock:
            low = mid
        else:
            high = mid
    return (low + high) / 2


def release(stock, tank, count, seconds, dry=False):
    if not count or stock <= BASE:
        return stock
    beta = 0 if dry else 40 * (tank - 1) / (tank * RHO_G)
    pressure = ATM * (stock / BASE - 1) if dry else pressure_for(stock, tank)
    root = math.sqrt(max(0, pressure))
    # S(P) = BASE + B*P + A*P^2. With x=sqrt(P), the outflow
    # equation is regular even at zero pressure.
    b = beta + BASE / ATM
    a = beta / ATM

    def derivative(x):
        return -(0.4 * count) / (2 * math.sqrt(1000) * (b + 2 * a * x * x))

    steps = math.ceil(seconds / 0.002)
    dt = seconds / steps
    for _ in range(steps):
        if root <= 0:
            break
        k1 = derivative(root)
        k2 = derivative(root + dt * k1 / 2)
        k3 = derivative(root + dt * k2 / 2)
        k4 = derivative(root + dt * k3)
        root = max(0, root + dt * (k1 + 2 * k2 + 2 * k3 + k4) / 6)
    pressure = root * root
    return (BASE + beta * pressure) * (1 + pressure / ATM)


def run(tank, commands):
    stock = dry_stock = BASE
    supplied = out = dry_out = vent = time = 0.0
    mask = 0
    max_pressure = RHO_G * (0.30 - 0.04) * tank / (tank - 1)
    max_volume = 40 * (0.52 - 0.04)
    capacity = max_volume * (1 + max_pressure / ATM)
    for command in commands:
        if command['type'] == 'pump':
            vent += max(0, stock + 1 - capacity)
            stock = min(capacity, stock + 1)
            dry_stock += 1
            supplied += 1
        elif command['type'] == 'keys':
            mask = command['mask']
        else:
            seconds = command['seconds']
            count = mask.bit_count()
            next_stock = release(stock, tank, count, seconds)
            next_dry = release(dry_stock, tank, count, seconds, True)
            out += stock - next_stock
            dry_out += dry_stock - next_dry
            stock, dry_stock = next_stock, next_dry
            time += seconds
    return dict(waterStock=stock, dryStock=dry_stock, supplied=supplied, waterOut=out,
                dryOut=dry_out, vented=vent, time=time, mask=mask)


def check_case(case):
    expected = run(case['tank'], case['commands'])
    for field, value in expected.items():
        assert_close(case['state'][field], value)
    reading = case['reading']
    pressure = pressure_for(expected['waterStock'], case['tank'])
    head = pressure / RHO_G
    inside = .3 - head * (case['tank'] - 1) / case['tank']
    outside = .3 + head / case['tank']
    for field, value in dict(pressure=pressure, head=head, inside=inside, outside=outside,
                             volume=40 * (.52 - inside), reserve=expected['waterStock'] - BASE).items():
        assert_close(reading[field], value)
    assert_close(expected['supplied'], expected['waterStock'] - BASE + expected['waterOut'] + expected['vented'])


def review_browser(path):
    from pathlib import Path
    receipt = json.loads(Path(path).read_text())
    for workflow in receipt['workflows']:
        for case in workflow['observations']:
            check_case(case)
            # These are extracted from the actual SVG path coordinates, not data attributes.
            expected = run(case['tank'], case['commands'])
            p = pressure_for(expected['waterStock'], case['tank'])
            head = p / RHO_G
            inside = .3 - head * (case['tank'] - 1) / case['tank']
            outside = .3 + head / case['tank']
            assert_close(case['svgInsideY'], 520 - 600 * inside, .00051, "svg_pixels")
            assert_close(case['svgOutsideY'], 520 - 600 * outside, .00051, "svg_pixels")
        rows = list(csv.DictReader(io.StringIO(Path(workflow['csv']).read_text())))
        assert len(rows) == len(workflow['finalCommands']) + 1
        for index, row in enumerate(rows):
            expected = run(workflow['tank'], workflow['finalCommands'][:index])
            assert_close(float(row['stock_ambient_litres']), expected['waterStock'])
            assert_close(float(row['vented_ambient_litres']), expected['vented'])
            assert_close(float(row['time_s']), expected['time'])
    return len(receipt['workflows'])


if __name__ == '__main__':
    if len(sys.argv) > 1:
        population = review_browser(sys.argv[1])
        kind = 'browser_workflows'
    else:
        payload = json.load(sys.stdin)
        for case in payload['cases']:
            check_case(case)
        population, kind = len(payload['cases']), 'model_cases'
    print(json.dumps({kind: population, 'comparisons': comparisons, 'max_absolute_errors': maximum_error,
                      'method': 'independent pressure-coordinate RK4, dt <= 0.002 s; bisection from water conservation and PV',
                      'status': 'passed'}, indent=2))
