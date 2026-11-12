'use client';

import { cancelAudio, playSequence, playSizzle, playTone } from './engine';
import type { OrderEffect } from '../game/order';

/** Visual effects are owned by the order view. This adapter accepts structural audio cues. */
export type AudioCue = OrderEffect;
export function playCues(effects: readonly AudioCue[]): void {
  cancelAudio();
  for (const effect of effects) {
    if (effect.type === 'sizzle') playSizzle();
    if (effect.type === 'tones') effect.midis.forEach((midi, index) => playTone(midi, (effect.delay ?? 0) + index * (effect.gap ?? 0.3), 0.5));
  }
}
export { cancelAudio, playSequence };
