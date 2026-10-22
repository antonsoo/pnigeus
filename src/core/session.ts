import { type Command, MAX_COMMANDS, replay, type Tank } from "./regulator";

export const EXAMPLES: Record<string, readonly Command[]> = {
  store: [{ type: "pump" }, { type: "pump" }, { type: "pump" }],
  sound: [
    { type: "pump" },
    { type: "pump" },
    { type: "pump" },
    { type: "keys", mask: 1 },
    { type: "wait", seconds: 5 },
  ],
  vent: Array.from({ length: 14 }, () => ({ type: "pump" as const })),
};
export function shareQuery(tank: Tank, commands: readonly Command[]): string {
  replay(tank, commands);
  const encoded = commands
    .map((c) =>
      c.type === "pump" ? "P" : c.type === "keys" ? `K${c.mask.toString(16)}` : `W${c.seconds}`,
    )
    .join(".");
  return `?tank=${tank}&events=${encoded}`;
}
export function parseSession(search: string): { tank: Tank; commands: Command[]; warning: string } {
  const q = new URLSearchParams(search);
  const bad = () => ({
    tank: 6 as const,
    commands: [],
    warning: "The shared experiment is invalid or ambiguous. A fresh chamber is shown.",
  });
  if (
    search.length > 1000 ||
    q.getAll("tank").length > 1 ||
    q.getAll("events").length > 1 ||
    q.getAll("compare").length > 1
  )
    return bad();
  const rawTank = q.get("tank") ?? "6";
  if (!["3", "6", "12"].includes(rawTank)) return bad();
  const tank = Number(rawTank) as Tank;
  const events = q.get("events") ?? "";
  const tokens = events === "" ? [] : events.split(".");
  if (tokens.length > MAX_COMMANDS) return bad();
  const commands: Command[] = [];
  for (const token of tokens) {
    if (token === "P") commands.push({ type: "pump" });
    else if (/^K[0-9a-f]$/.test(token))
      commands.push({ type: "keys", mask: Number.parseInt(token.slice(1), 16) });
    else if (token === "W2" || token === "W5")
      commands.push({ type: "wait", seconds: Number(token.slice(1)) as 2 | 5 });
    else return bad();
  }
  return { tank, commands, warning: "" };
}
