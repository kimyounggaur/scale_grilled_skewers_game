import type { Scale, NoteName, Hint } from './types';
import { noteAt, stepAt } from './scale';
/** 힌트 3단계: 1 = 간격, 2 = 건반 위치, 3 = 음 이름. 첫 자리는 단계와 상관없이 으뜸음 건반을 알려 준다. */
export function hint(scale: Scale, slot: number, level: number): Hint {
  const exp = noteAt(scale, slot);
  const key = exp.midi - scale.tonicMidi;
  const name: NoteName = { letter: exp.letter, alter: exp.alter };
  if (slot === 0) return { kind: 'start', need: null, targetKey: 0, name };
  const need = stepAt(scale, slot - 1) === 1 ? 'half' : 'whole';
  if (level <= 1) return { kind: 'interval', need, targetKey: null, name: null };
  if (level === 2) return { kind: 'position', need, targetKey: key, name: null };
  return { kind: 'name', need, targetKey: key, name };
}
