import type { NoteName, Mode, Letter, Scale, NameChoice } from './types';
import { noteAt } from './scale';
import { LETTERS } from './data';
import { toAlter, pcOfName, naturalLetterOf, sharpNameOf, flatNameOf } from './shared';
/** "Bb" → { letter: 'B', alter: -1 } */
export function parseNote(text: string): NoteName {
  const head = text.charAt(0);
  if (!(LETTERS as readonly string[]).includes(head)) throw new Error('음 이름이 아닙니다: ' + text);
  const sharps = (text.match(/#/g) ?? []).length;
  const flats = (text.match(/b/g) ?? []).length;
  return { letter: head as Letter, alter: toAlter(sharps - flats) };
}

/** { letter: 'B', alter: -1 } → "Bb" (자료 저장·비교용) */
export function noteText(n: NoteName): string {
  return n.letter + (n.alter === 1 ? '#' : n.alter === -1 ? 'b' : '');
}

export function parseScaleId(id: string): { tonic: NoteName; mode: Mode } {
  const minor = id.endsWith('m');
  return { tonic: parseNote(minor ? id.slice(0, -1) : id), mode: minor ? 'minor' : 'major' };
}

/** 같은 건반의 다른 이름 (R-33) */
export function altName(n: NoteName): NoteName {
  const pc = pcOfName(n);
  const natural = naturalLetterOf(pc);
  if (natural !== null) return { letter: natural, alter: 0 };
  return n.alter < 0 ? sharpNameOf(pc) : flatNameOf(pc);
}

/** 2~7번째 자리 가운데 변화표가 붙는 음만 이름을 묻는다. 묻지 않는 자리는 null. */
export function nameChoice(scale: Scale, slot: number): NameChoice | null {
  if (slot < 1 || slot > 6) return null;
  const n = noteAt(scale, slot);
  if (n.alter === 0) return null;
  const answer: NoteName = { letter: n.letter, alter: n.alter };
  return { answer, other: altName(answer), prevLetter: noteAt(scale, slot - 1).letter, letter: n.letter };
}

export function hasNameSlots(scale: Scale): boolean {
  for (let s = 1; s <= 6; s++) if (noteAt(scale, s).alter !== 0) return true;
  return false;
}
