import {
  DEFAULT_SHAPES,
  DROPS,
  FILLS,
  FORMS,
  PLANS,
  type ShapeSettings,
  shapeComparison,
  shapeCurve,
} from "../src/core/shapes";

for (const radiusCm of [10, 15, 20, 25, 30, 35, 40, 45, 50]) {
  for (const fill of FILLS)
    for (const plan of PLANS)
      for (const drop of DROPS) {
        const settings: ShapeSettings = { ...DEFAULT_SHAPES, radiusCm, fill, plan, drop };
        for (const form of FORMS) {
          const c = shapeComparison(settings, form);
          const g = c.geometry;
          console.log(
            JSON.stringify({
              settings: { ...settings, form },
              full: g.full,
              rest: g.rest,
              endpoint: c.after,
              released: c.released,
              geometricRelease: c.geometricRelease,
              reachesTarget: c.reachesTarget,
              tankArea: g.tankArea,
              restLevel: g.restLevel,
              ...(drop === 30 ? { curve: shapeCurve(settings, form) } : {}),
            }),
          );
        }
      }
}
