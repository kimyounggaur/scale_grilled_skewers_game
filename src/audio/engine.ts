'use client';

let context: AudioContext | null = null;
let output: GainNode | null = null;
let enabled = true;
let generation = 0;
let timers: ReturnType<typeof setTimeout>[] = [];
let pendingResolve: ((played: boolean) => void) | null = null;
const sources = new Set<AudioScheduledSourceNode>();

export const midiToFrequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
export function sequenceTimes(length: number, sizzle = false): number[] { return Array.from({ length }, (_, i) => (sizzle ? 650 : 0) + i * 480); }
export function setSound(on: boolean): void { enabled = on; if (!on) for (const source of sources) { try { source.stop(); } catch { /* Already stopped. */ } } }
export async function unlockAudio(): Promise<boolean> {
  if (!enabled || typeof window === 'undefined') return false;
  try {
    if (!context) {
      const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) return false;
      context = new Constructor();
      const compressor = context.createDynamicsCompressor();
      output = context.createGain(); output.gain.value = 0.5; output.connect(compressor); compressor.connect(context.destination);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && enabled && context?.state === 'suspended') void context.resume().catch(() => undefined); });
    }
    if (context.state === 'suspended') await context.resume();
    return context.state === 'running';
  } catch { return false; }
}
function keep(source: AudioScheduledSourceNode): void { sources.add(source); source.onended = () => { sources.delete(source); source.disconnect(); }; }
export function playTone(midi: number, delay = 0, duration = 0.55): void {
  if (!enabled || !Number.isFinite(midi)) return;
  const run = generation;
  void unlockAudio().then(ready => {
    if (!ready || !context || !output || !enabled || run !== generation) return;
    const start = context.currentTime + Math.max(0, delay) + 0.01;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(0.9, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.32, start + 0.16);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration + 0.35);
    envelope.connect(output);
    const harmonics: readonly [number, OscillatorType, number][] = [[1, 'triangle', 1], [2, 'sine', 0.28], [3, 'sine', 0.07]];
    for (const [multiple, wave, volume] of harmonics) {
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = wave; oscillator.frequency.value = midiToFrequency(midi) * multiple; gain.gain.value = volume;
      oscillator.connect(gain); gain.connect(envelope); keep(oscillator); oscillator.start(start); oscillator.stop(start + duration + 0.4);
    }
  });
}
export function playSizzle(): void {
  if (!enabled) return;
  const run = generation;
  void unlockAudio().then(ready => {
    if (!ready || !context || !output || !enabled || run !== generation) return;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.7), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = 5200; filter.Q.value = 0.8;
    const start = context.currentTime + 0.01;
    gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(0.22, start + 0.05); gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.65);
    source.connect(filter); filter.connect(gain); gain.connect(output); keep(source); source.start(start); source.stop(start + 0.7);
  });
}
export function cancelAudio(): void {
  generation++;
  for (const timer of timers) clearTimeout(timer);
  timers = [];
  for (const source of sources) { try { source.stop(); } catch { /* Already stopped. */ } }
  sources.clear();
  pendingResolve?.(false); pendingResolve = null;
}
/** Visual progression remains active when sound is muted or unavailable. */
export function playSequence(midis: readonly number[], onStep: (slot: number) => void = () => undefined, sizzle = false): Promise<boolean> {
  cancelAudio(); const run = generation;
  if (sizzle) playSizzle();
  return new Promise(resolve => {
    pendingResolve = resolve;
    sequenceTimes(midis.length, sizzle).forEach((delay, index) => {
      timers.push(setTimeout(() => { if (run !== generation) return; const midi = midis[index]; if (midi !== undefined) playTone(midi, 0, 0.5); onStep(index); }, delay));
    });
    timers.push(setTimeout(() => { if (run !== generation) return; timers = []; pendingResolve = null; onStep(-1); resolve(true); }, (sizzle ? 650 : 0) + midis.length * 480 + 260));
  });
}
