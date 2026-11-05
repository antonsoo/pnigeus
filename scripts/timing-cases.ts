import { TANKS } from "../src/core/regulator";
import { searchTimings, timingRun } from "../src/core/timing";

for (const tank of TANKS)
  for (const pipes of [1, 2, 3, 4]) {
    const visit = (prefix: number[], remaining: number): void => {
      if (prefix.length === 5) {
        const settings = { tank, pipes, strokes: [...prefix, remaining] };
        const run = timingRun(settings);
        console.log(
          JSON.stringify({
            type: "case",
            settings,
            slots: run.slots.map((s) => ({
              peak: s.peak,
              trough: s.trough,
              below: s.below,
              within: s.within,
              above: s.above,
            })),
            within: run.within,
            complete: run.complete,
          }),
        );
        return;
      }
      for (let n = 0; n <= remaining; n++) visit([...prefix, n], remaining - n);
    };
    visit([], 7);
    console.log(JSON.stringify({ type: "search", tank, pipes, ...searchTimings(tank, pipes) }));
  }
