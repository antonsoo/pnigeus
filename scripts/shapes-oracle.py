"""Independent pressure-coordinate water solver and cross-section quadrature.

No application imports or closed-form cap primitives. Simpson integration of
quadratic cross-sections, split at rim and roof, provides geometric volumes.
The app instead solves outside height from inside height and inverts pressure.
"""
import csv
import json
import math
import re
import sys
from pathlib import Path

P0 = 101325.0
RHO_G = 9806.65
comparisons = 0
maximum_errors = {"physical": 0.0, "svg": 0.0}


def close(actual, expected, tolerance=3e-7, unit="physical"):
    global comparisons
    comparisons += 1
    error = abs(actual - expected)
    maximum_errors[unit] = max(maximum_errors[unit], error)
    assert error <= tolerance, (actual, expected, error, unit)


def root(lo, hi, function, target):
    for _ in range(58):
        mid = (lo + hi) / 2
        if function(mid) < target:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def geometry(s):
    r = s["radiusCm"] / 100
    area = 8 * r*r * math.tan(math.pi/8) if s['plan'] == 'octagon' else math.pi*r*r * (2 if s['plan'] == 'double' else 6)
    initial = r * {'half': .5, 'roof': 1, 'extra': 1.25}[s['fill']]
    form = s['form']

    def cross_section(z):
        t = z/r
        return math.pi*r*r * (1 if form == 'cylinder' else 1-t*t if form == 'hemisphere' else (1-t)**2)

    def volume(lo, hi):
        lo, hi = max(0, lo), min(r, hi)
        if hi <= lo:
            return 0.0
        # Each profile is quadratic, so Simpson is exact in exact arithmetic.
        return (hi-lo) * (cross_section(lo) + 4*cross_section((lo+hi)/2) + cross_section(hi)) / 6

    def at_head(head):
        # Solve for outside pressure head directly. Inside = outside - head.
        # Water in the air-displaced part of the imagined full tank is removed.
        outside = root(initial, initial+r*2,
                       lambda z: area*z-volume(z-head, z), area*initial)
        inside = outside-head
        actual = 1000 * volume(inside, r)
        pressure = RHO_G*head
        return dict(inside=inside, outside=outside, head=head, volume=actual,
                    pressure=pressure, stock=actual*(1+pressure/P0))

    full_outside = root(initial, initial+r*2,
                        lambda z: area*z-volume(0, z), area*initial)
    full = at_head(full_outside)
    rest_head = max(0, initial-r)
    rest = at_head(rest_head)
    return r, area, initial, full, rest, at_head, volume


def check_reading(actual, s):
    r, area, initial, full, rest, at_head, volume = geometry(s)
    expected = at_head(actual['head'])
    for key in ['inside','outside','head','pressure','volume','stock']:
        close(actual[key], expected[key])
    close(actual['outside']-actual['inside'], actual['head'])
    close(area * actual['outside']-volume(actual['inside'],actual['outside']), area*initial)
    assert -1e-10 <= actual['inside'] <= min(r,initial)+1e-10
    assert full['pressure']+1e-7 >= actual['pressure'] >= rest['pressure']-1e-7


def check_case(case):
    s = case['settings']
    r, area, initial, full, rest, at_head, volume = geometry(s)
    for name, expected in [('full',full),('rest',rest)]:
        for k,v in expected.items():
            close(case[name][k],v)
    endpoint = at_head(max(rest['head'], full['head']*(1-s['drop']/100)))
    for k,v in endpoint.items():
        close(case['endpoint'][k],v)
    close(case['released'],full['stock']-endpoint['stock'])
    close(case['geometricRelease'],full['volume']-endpoint['volume'])
    close(case['tankArea'],area)
    close(case['restLevel'],initial)
    assert case['reachesTarget'] == (full['head']*(1-s['drop']/100) >= rest['head']-1e-10)
    for point in case.get('curve',[]):
        check_reading(point,s)


def csv_settings(row):
    return dict(radiusCm=int(row['radius_cm']),fill=row['fill'],plan=row['plan'],
                drop=int(row['allowed_drop_percent']),form=row['form'],phase='after')


def check_csv(filename):
    rows=list(csv.DictReader(Path(filename).read_text().splitlines()))
    assert len(rows)==249
    for row in rows:
        s=csv_settings(row)
        r, area, initial, full, rest, at_head, volume=geometry(s)
        a={key:float(row[column]) for key,column in [
            ('inside','inside_m'),('outside','outside_m'),('head','head_m'),('pressure','gauge_pa'),
            ('volume','actual_air_litres'),('stock','stock_ambient_litres')]}
        check_reading(a,s)
        close(float(row['tank_area_m2']),area)
        close(float(row['rest_level_m']),initial)
        close(float(row['delivered_ambient_litres']),full['stock']-a['stock'])
        close(float(row['geometric_release_litres']),full['volume']-a['volume'])
        if row['kind']=='endpoint':
            close(a['head'],max(rest['head'],full['head']*(1-s['drop']/100)))
        assert row['pressure_kind'] == ('limiting-empty' if a['volume'] < 1e-9 else 'air-pocket')
        assert (row['target_reached'] == 'true') == (full['head']*(1-s['drop']/100) >= rest['head']-1e-10)
    return rows


def browser(receipt):
    rendered=[]
    for workflow in receipt['workflows']:
        for obs in workflow['observations']:
            rows=check_csv(obs['csv'])
            s=obs['settings']
            r, area, initial, full, rest, at_head, volume=geometry(s)
            selected=next(row for row in rows if row['form']==s['form'] and row['kind']==('full' if s['phase']=='full' else 'endpoint'))
            drawing=obs['drawing']
            close(drawing['inside'],float(selected['inside_m']))
            close(drawing['outside'],float(selected['outside_m']))
            close(drawing['pressure'],float(selected['gauge_pa']))
            close(drawing['stock'],float(selected['stock_ambient_litres']))
            close(drawing['insideY'],drawing['zero']-float(selected['inside_m'])*drawing['scale'],.00051,'svg')
            close(drawing['outsideY'],drawing['zero']-float(selected['outside_m'])*drawing['scale'],.00051,'svg')
            inside=float(selected['inside_m'])
            section_radius=r if s['form']=='cylinder' else math.sqrt(max(0,r*r-inside*inside)) if s['form']=='hemisphere' else r-inside
            close(drawing['insideEnd']-drawing['insideStart'],2*section_radius*drawing['scale'],.00102,'svg')
            centre=(drawing['insideEnd']+drawing['insideStart'])/2
            radius_px=r*drawing['scale'];bottom=drawing['zero']
            numbers=list(map(float,re.findall(r'-?\d+(?:\.\d+)?',drawing['profile'])))
            commands=re.findall('[A-Za-z]',drawing['profile'])
            if s['form']=='hemisphere':
                assert commands==['M','A']
                expected=[centre-radius_px,bottom,radius_px,radius_px,0,0,1,centre+radius_px,bottom]
            elif s['form']=='cone':
                assert commands==['M','L','L']
                expected=[centre-radius_px,bottom,centre,bottom-radius_px,centre+radius_px,bottom]
            else:
                assert commands==['M','V','H','V']
                expected=[centre-radius_px,bottom,bottom-radius_px,centre+radius_px,bottom]
            assert len(numbers)==len(expected)
            for actual,wanted in zip(numbers,expected):close(actual,wanted,.00051,'svg')
            plan=obs['plan']
            if plan['polygon']:
                points=plan['polygon'];assert len(points)==8
                plan_area=abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(points,points[1:]+points[:1])))/2
            else:plan_area=math.pi*plan['outerCircle']**2
            close(plan_area/(math.pi*plan['rimRadius']**2),area/(math.pi*r*r))
            # Read actual plotted path vertices, independent of data attributes.
            plot=obs['plot']
            for form,points in plot['paths'].items():
                curve=[row for row in rows if row['form']==form and row['kind']=='curve']
                assert len(points)==len(curve)==81
                for (x,y),row in zip(points,curve):
                    ex=plot['left']+float(row['delivered_ambient_litres'])/plot['stockAxis']*(plot['right']-plot['left'])
                    ey=plot['bottom']-float(row['head_m'])*1000/plot['headAxis']*(plot['bottom']-plot['top'])
                    close(x,ex,.00051,'svg');close(y,ey,.00051,'svg')
            rendered.append(dict(engine=workflow['engine'],width=workflow['width'],label=obs['label'],rows=len(rows)))
    return rendered


def main():
    if len(sys.argv)>1:
        receipt=json.loads(Path(sys.argv[1]).read_text());cases=browser(receipt)
        print(json.dumps(dict(status='passed',workflows=len(receipt['workflows']),observations=len(cases),csv_rows=sum(c['rows'] for c in cases),comparisons=comparisons,maximum_absolute_errors=maximum_errors,method=__doc__,results=cases),indent=2))
    else:
        count=0
        for line in sys.stdin:
            check_case(json.loads(line));count+=1
        assert count==1215
        print(json.dumps(dict(status='passed',cases=count,comparisons=comparisons,maximum_absolute_errors=maximum_errors,method=__doc__),indent=2))


if __name__=='__main__':
    main()
