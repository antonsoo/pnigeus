import { MODEL } from "./regulator";
import { type SearchMode, TIMING, type TimingSettings, validateTiming } from "./timing";

export const NOTEBOOK_BYTES = 32768;
export interface TimingNotebook {
  current: TimingSettings;
  kept: TimingSettings | null;
  explanation: string;
  searchMode: SearchMode;
}
const parameters = { regulator: MODEL, exercise: TIMING };
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
function keys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return (
    Object.keys(value).length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}
function same(value: unknown, reference: unknown): boolean {
  if (!object(reference)) return value === reference;
  return (
    object(value) &&
    keys(value, Object.keys(reference)) &&
    Object.entries(reference).every(([key, item]) => same(value[key], item))
  );
}
function settings(value: unknown): TimingSettings {
  if (!object(value) || !keys(value, ["tank", "pipes", "strokes"]) || !Array.isArray(value.strokes))
    throw new Error("The notebook's timing settings are incomplete.");
  const candidate = value as unknown as TimingSettings;
  validateTiming(candidate);
  return { tank: candidate.tank, pipes: candidate.pipes, strokes: [...candidate.strokes] };
}
export function copyNotebook(book: TimingNotebook): TimingNotebook {
  return {
    current: settings(book.current),
    kept: book.kept ? settings(book.kept) : null,
    explanation: book.explanation,
    searchMode: book.searchMode,
  };
}
export function notebookJson(book: TimingNotebook, edition: string): string {
  if (!/^(development|[a-f0-9]{64})$/.test(edition))
    throw new Error("The notebook edition is unidentified.");
  if (book.explanation.length > 4000)
    throw new Error("Keep the explanation within 4,000 characters.");
  return `${JSON.stringify(
    {
      format: "pnigeus-timing-notebook",
      version: 1,
      edition,
      parameters,
      ...copyNotebook(book),
      notice:
        "Model and software: PolyForm Noncommercial 1.0.0, Copyright 2026 Anthony Mercer. Learner explanations remain their authors' work.",
    },
    null,
    2,
  )}\n`;
}
export function readNotebook(text: string): TimingNotebook {
  if (new TextEncoder().encode(text).byteLength > NOTEBOOK_BYTES)
    throw new Error("Choose a Pnigeus timing notebook under 32 KiB.");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid notebook JSON. Your current work is unchanged.");
  }
  if (
    !object(data) ||
    !keys(data, [
      "format",
      "version",
      "edition",
      "parameters",
      "current",
      "kept",
      "explanation",
      "notice",
      "searchMode",
    ]) ||
    data.format !== "pnigeus-timing-notebook" ||
    data.version !== 1
  )
    throw new Error(
      "This is not a supported Pnigeus timing notebook. Your current work is unchanged.",
    );
  if (
    typeof data.edition !== "string" ||
    !/^(development|[a-f0-9]{64})$/.test(data.edition) ||
    typeof data.notice !== "string"
  )
    throw new Error("The notebook's format information is invalid.");
  if (!same(data.parameters, parameters))
    throw new Error(
      "This notebook uses different physical or exercise assumptions. Keep its original reading; it cannot be silently recomputed here.",
    );
  if (data.searchMode !== "exact" && data.searchMode !== "at-most")
    throw new Error("The notebook search criterion is invalid.");
  if (typeof data.explanation !== "string" || data.explanation.length > 4000)
    throw new Error("The notebook explanation must contain at most 4,000 characters.");
  return {
    current: settings(data.current),
    kept: data.kept === null ? null : settings(data.kept),
    explanation: data.explanation,
    searchMode: data.searchMode,
  };
}
