import type { NoteName, KeySignature, ScaleNote, TrayKey, Scale } from './types';
import { NATURAL_PC, PATTERN, SOLFEGE, SHARP_ORDER, FLAT_ORDER, KEY_SIG_STEPS, BLACK_PCS } from './data';
import { mod, letterIndex, letterAt, toAlter, naturalLetterOf, sharpNameOf, flatNameOf } from './shared';
import { parseScaleId } from './names';
/** 오선 위 자리 번호 (R-12) */
export function staffStep(name: NoteName, midi: number): number {
  const octave = (midi - name.alter - NATURAL_PC[name.letter]) / 12 - 1;
  if (!Number.isInteger(octave)) throw new Error('이름과 음높이가 맞지 않습니다');
  return octave * 7 + letterIndex(name.letter);
}

/** 덧줄 (R-13): 가온 다(28) 아래와 높은 가(40) 위에서 한 줄 건너 하나씩 */
export function ledgerLines(step: number): number[] {
  const out: number[] = [];
  for (let q = 28; q >= step; q -= 2) out.push(q);
  for (let q = 40; q <= step; q += 2) out.push(q);
  return out;
}

const cache = new Map<string, Scale>();

/**
 * 음계 만들기.
 * - 으뜸음은 글자가 4옥타브(C4~B4)에 오도록 둔다.
 * - 간격 순서대로 음높이를 올리고, 글자는 한 번씩 차례로 쓴다. 변화표는 음높이와 글자의 차이로 정해진다.
 */
export function buildScale(id: string): Scale {
  const hit = cache.get(id);
  if (hit) return hit;
  const { tonic, mode } = parseScaleId(id);
  const steps = [...PATTERN[mode]];
  const tonicMidi = 60 + NATURAL_PC[tonic.letter] + tonic.alter;
  const start = letterIndex(tonic.letter);
  const notes: ScaleNote[] = [];
  let midi = tonicMidi;
  for (let i = 0; i < 8; i++) {
    const letter = letterAt(start + i);
    const octave = 4 + Math.floor((start + i) / 7);
    const natural = 12 * (octave + 1) + NATURAL_PC[letter];
    const alter = toAlter(midi - natural);
    const step = octave * 7 + letterIndex(letter);
    notes.push({ letter, alter, midi, pc: mod(midi, 12), step, degree: i + 1, ledger: ledgerLines(step) });
    midi += steps[i] ?? 0;
  }
  const sharps = SHARP_ORDER.filter((l) => notes.some((n) => n.letter === l && n.alter === 1));
  const flats = FLAT_ORDER.filter((l) => notes.some((n) => n.letter === l && n.alter === -1));
  const type: KeySignature['type'] = sharps.length > 0 ? 'sharp' : flats.length > 0 ? 'flat' : 'none';
  const letters = type === 'sharp' ? sharps : type === 'flat' ? flats : [];
  const keySig: KeySignature = {
    type,
    count: letters.length,
    letters,
    steps: type === 'none' ? [] : KEY_SIG_STEPS[type].slice(0, letters.length),
  };
  const tray: TrayKey[] = [];
  for (let i = 0; i <= 12; i++) {
    const m = tonicMidi + i;
    const pc = mod(m, 12);
    const natural = naturalLetterOf(pc);
    tray.push({
      index: i,
      midi: m,
      pc,
      black: BLACK_PCS.has(pc),
      top: i === 12,
      names: natural !== null ? [{ letter: natural, alter: 0 }] : [sharpNameOf(pc), flatNameOf(pc)],
    });
  }
  const scale: Scale = {
    id,
    mode,
    tonic,
    tonicMidi,
    steps,
    signed: type === 'sharp' ? letters.length : -letters.length,
    notes,
    keySig,
    solfege: [...SOLFEGE[mode]],
    tray,
  };
  cache.set(id, scale);
  return scale;
}

export function noteAt(scale: Scale, slot: number): ScaleNote {
  const n = scale.notes[slot];
  if (n === undefined) throw new Error('자리 번호는 0~7 입니다: ' + slot);
  return n;
}
export function stepAt(scale: Scale, i: number): number {
  const s = scale.steps[i];
  if (s === undefined) throw new Error('간격 번호는 0~6 입니다: ' + i);
  return s;
}
