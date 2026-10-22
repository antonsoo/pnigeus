import { apply, type Command, initial, replay, TANKS, waterReading } from "../src/core/regulator";

const cases = [];
for (const tank of TANKS) {
  for (const pumps of [0, 1, 3, 10, 14]) {
    for (const mask of [0, 1, 3, 5, 15]) {
      for (const seconds of [2, 5] as const) {
        const commands: Command[] = [
          ...Array.from({ length: pumps }, () => ({ type: "pump" as const })),
          { type: "keys", mask },
          { type: "wait", seconds },
        ];
        const state = replay(tank, commands).state;
        cases.push({ tank, commands, state, reading: waterReading(state.waterStock, tank) });
      }
    }
  }
  let seed = 17;
  const commands: Command[] = [];
  let state = initial(tank);
  for (let i = 0; i < 60; i++) {
    seed = (seed * 16807) % 2147483647;
    const command: Command =
      seed % 3 === 0
        ? { type: "pump" }
        : seed % 3 === 1
          ? { type: "keys", mask: seed % 16 }
          : { type: "wait", seconds: seed % 2 ? 2 : 5 };
    commands.push(command);
    state = apply(state, tank, command);
    if (i % 10 === 9)
      cases.push({
        tank,
        commands: [...commands],
        state,
        reading: waterReading(state.waterStock, tank),
      });
  }
}
process.stdout.write(JSON.stringify({ cases }));
