"""Check actual browser WAVs and captured live AudioBuffers, without app imports."""
import array
import json
import math
import struct
import sys
import wave
from pathlib import Path

from physics_oracle import BASE, RHO_G, ATM, pressure_for, run

FREQUENCIES = [220, 220 * 2 ** (4 / 12), 220 * 2 ** (7 / 12), 440]
SAMPLE_RATE = 48000


def gains(state, tank, seconds):
    beta = 40 * (tank - 1) / (tank * RHO_G)
    b = beta + BASE / ATM
    a = beta / ATM
    count = state['mask'].bit_count()
    root = math.sqrt(pressure_for(state['waterStock'], tank))

    def derivative(x):
        return -(.4 * count) / (2 * math.sqrt(1000) * (b + 2 * a * x * x))

    values = [.12 * root / math.sqrt(4000)]
    dt = .001
    for _ in range(seconds * 1000):
        k1 = derivative(root)
        k2 = derivative(root + dt * k1 / 2)
        k3 = derivative(root + dt * k2 / 2)
        k4 = derivative(root + dt * k3)
        root = max(0, root + dt * (k1 + 2 * k2 + 2 * k3 + k4) / 6)
        values.append(.12 * root / math.sqrt(4000))
    return values


def main(receipt_path):
    receipt = json.loads(Path(receipt_path).read_text())
    results = []
    for workflow in receipt['workflows']:
        for example in workflow['audio']:
            state = run(example['tank'], example['commandsBefore'])
            seconds = example['seconds']
            with wave.open(example['wav']) as sound:
                assert (sound.getnchannels(), sound.getsampwidth(), sound.getframerate(), sound.getnframes()) == (1, 2, SAMPLE_RATE, seconds * SAMPLE_RATE)
                wav_samples = array.array('h', sound.readframes(sound.getnframes()))
            live_samples = array.array('f', Path(example['live']).read_bytes())
            if sys.byteorder != 'little':
                wav_samples.byteswap(); live_samples.byteswap()
            assert len(live_samples) == len(wav_samples)
            envelope = gains(state, example['tank'], seconds)
            maximum_live_error = 0.0
            maximum_pcm_error = 0
            maximum_wave_error = 0
            for i, actual in enumerate(wav_samples):
                time = i / SAMPLE_RATE
                k = math.floor(time * 1000)
                fraction = time * 1000 - k
                amplitude = envelope[k] * (1 - fraction) + envelope[k + 1] * fraction
                edge = max(0, min(1, time / .012, (seconds - time) / .04))
                expected = amplitude * edge * sum(math.sin(2 * math.pi * hz * time) for pipe, hz in enumerate(FREQUENCIES) if state['mask'] & (1 << pipe))
                expected_float = struct.unpack('<f', struct.pack('<f', expected))[0]
                maximum_live_error = max(maximum_live_error, abs(live_samples[i] - expected_float))
                expected_int = math.floor(max(-1, min(1, expected_float)) * 32767 + .5)
                actual_from_live = math.floor(max(-1, min(1, live_samples[i])) * 32767 + .5)
                maximum_pcm_error = max(maximum_pcm_error, abs(actual - actual_from_live))
                maximum_wave_error = max(maximum_wave_error, abs(actual - expected_int))
            assert maximum_live_error < 4e-8, maximum_live_error
            assert maximum_pcm_error == 0, maximum_pcm_error
            assert maximum_wave_error <= 1, maximum_wave_error
            assert wav_samples[0] == 0
            if example['label'] == 'four-pipes':
                assert max(abs(v) for v in wav_samples[-SAMPLE_RATE // 4:]) == 0
            results.append({'engine': workflow['engine'], 'width': workflow['width'], 'example': example['label'],
                            'samples': len(wav_samples), 'maximum_live_error': maximum_live_error,
                            'maximum_wav_error_lsb': maximum_wave_error, 'live_to_wav_error_lsb': maximum_pcm_error})
    print(json.dumps({'status': 'passed', 'wav_files': len(results), 'live_buffers': len(results),
                      'samples_per_format': sum(r['samples'] for r in results), 'results': results,
                      'scope': 'digital samples; modern sine tones and illustrative amplitude, not physical speakers or ancient pipe acoustics'}, indent=2))


if __name__ == '__main__':
    main(sys.argv[1])
