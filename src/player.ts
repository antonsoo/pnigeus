import { SAMPLE_RATE } from "./core/audio";

export class Player {
  private context: AudioContext | undefined;
  private source: AudioBufferSourceNode | undefined;
  private gain: GainNode | undefined;
  private generation = 0;
  stop(): void {
    this.generation++;
    if (this.source && this.context && this.gain) {
      const now = this.context.currentTime;
      this.gain.gain.cancelScheduledValues(now);
      this.gain.gain.setValueAtTime(1, now);
      this.gain.gain.linearRampToValueAtTime(0, now + 0.012);
      this.source.stop(now + 0.015);
    }
    this.source = undefined;
    this.gain = undefined;
  }
  async play(pcm: Float32Array<ArrayBuffer>, ended: () => void): Promise<void> {
    this.stop();
    const generation = this.generation;
    this.context ??= new AudioContext({ sampleRate: SAMPLE_RATE });
    await this.context.resume();
    if (generation !== this.generation) return;
    const buffer = this.context.createBuffer(1, pcm.length, SAMPLE_RATE);
    buffer.copyToChannel(pcm, 0);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const gain = this.context.createGain();
    source.connect(gain).connect(this.context.destination);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (generation === this.generation) {
        this.source = undefined;
        this.gain = undefined;
        ended();
      }
    };
    this.source = source;
    this.gain = gain;
    source.start();
  }
}
