import { afterRelease, type State, type Tank, waterReading } from "./regulator";

// A modern A-major test chord. These are neither ancient pipe pitches nor timbre.
export const TEST_FREQUENCIES = [220, 220 * 2 ** (4 / 12), 220 * 2 ** (7 / 12), 440] as const;
export const SAMPLE_RATE = 48000;
export function releasePcm(state: State, tank: Tank, seconds: 2 | 5): Float32Array<ArrayBuffer> {
  const pcm = new Float32Array(SAMPLE_RATE * seconds);
  // Pressure is sampled at 1 ms, with linear interpolation in the amplitude.
  const gain = Array.from({ length: seconds * 1000 + 1 }, (_, i) => {
    const p = waterReading(afterRelease(state, tank, i / 1000).waterStock, tank).pressure;
    return 0.12 * Math.sqrt(p / 4000);
  });
  for (let i = 0; i < pcm.length; i++) {
    const t = i / SAMPLE_RATE;
    const k = Math.floor(t * 1000);
    const f = t * 1000 - k;
    const amplitude = (gain[k] ?? 0) * (1 - f) + (gain[k + 1] ?? 0) * f;
    const envelope = Math.min(1, t / 0.012, (seconds - t) / 0.04);
    let value = 0;
    for (let pipe = 0; pipe < 4; pipe++)
      if (state.mask & (1 << pipe))
        value += Math.sin(2 * Math.PI * (TEST_FREQUENCIES[pipe] ?? 0) * t);
    pcm[i] = amplitude * Math.max(0, envelope) * value;
  }
  return pcm;
}
export function wave(pcm: Float32Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(44 + 2 * pcm.length);
  const view = new DataView(bytes.buffer);
  const word = (at: number, value: string) =>
    [...value].forEach((c, i) => {
      view.setUint8(at + i, c.charCodeAt(0));
    });
  word(0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  word(8, "WAVE");
  word(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  word(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  pcm.forEach((sample, i) => {
    view.setInt16(44 + 2 * i, Math.round(Math.max(-1, Math.min(1, sample)) * 32767), true);
  });
  return bytes;
}
