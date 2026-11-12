import type { NoteName, Scale, Placement, Diagnosis, IntervalKind } from './types';
import { NATURAL_PC } from './data';
import { mod, naturalLetterOf, flatNameOf, sharpNameOf } from './shared';
import { noteAt, staffStep } from './scale';
/** 틀린 음의 이름 (R-22) */
function spellWrong(scale: Scale, slot: number, pc: number): NoteName {
  const inScale = scale.notes.slice(0, 7).find((n) => n.pc === pc);
  if (inScale) return { letter: inScale.letter, alter: inScale.alter }; // ① 음계에 있는 음
  const natural = naturalLetterOf(pc);
  if (natural !== null) return { letter: natural, alter: 0 }; // ② 흰건반
  const exp = noteAt(scale, slot);
  const d = mod(pc - NATURAL_PC[exp.letter] + 6, 12) - 6;
  if (d === 1 || d === -1) return { letter: exp.letter, alter: d }; // ③ 정답 글자에서 반음 차이
  return scale.keySig.type === 'flat' ? flatNameOf(pc) : sharpNameOf(pc); // ④ 조표 쪽
}

/**
 * 건반을 눌러 자리에 꽂기.
 * - 정답 여부는 음높이 종류(12개 중 무엇인지)로만 본다. (R-20)
 * - 맞으면 그 자리의 음높이로 맞춘다. 8번째 자리에는 어느 쪽 으뜸음 건반을 눌러도 높은 으뜸음이 된다. (R-21)
 * - 틀리면 누른 건반의 음높이를 그대로 쓴다.
 */
export function place(scale: Scale, slot: number, keyIndex: number): Placement {
  if (!Number.isInteger(keyIndex) || keyIndex < 0 || keyIndex > 12) throw new Error('건반 번호는 0~12 입니다: ' + keyIndex);
  const exp = noteAt(scale, slot);
  const tapMidi = scale.tonicMidi + keyIndex;
  const pc = mod(tapMidi, 12);
  const ok = pc === exp.pc;
  const midi = ok ? exp.midi : tapMidi;
  const name: NoteName = ok ? { letter: exp.letter, alter: exp.alter } : spellWrong(scale, slot, pc);
  return { ok, pc, midi, name, step: staffStep(name, midi) };
}

/** 앞 음에서 지금 음까지의 간격 진단 (R-24) */
export function diagnose(prevMidi: number, curMidi: number, need: number): Diagnosis {
  const d = curMidi - prevMidi;
  const kind: IntervalKind = d === 1 ? 'half' : d === 2 ? 'whole' : d > 2 ? 'wider' : 'notHigher';
  return { semitones: d, kind, match: d === need };
}
