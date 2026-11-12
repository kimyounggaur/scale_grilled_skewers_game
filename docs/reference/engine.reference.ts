/**
 * 음계 꼬치구이 — 규칙 엔진 참조 구현 (TypeScript)
 *
 * 화면·소리와 무관한 순수 계산만 담는다. React, DOM, 시간, Math.random 을 쓰지 않는다.
 * 같은 폴더의 skewer_golden_v1.json(검증 자료)의 모든 항목과 결과가 같아야 한다.
 * 규칙 번호(R-xx)는 기획서 5장의 번호다.
 */

// ───────────────────────── 자료 모양 ─────────────────────────

export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Mode = 'major' | 'minor';
/** 변화표: -1 = 내림(♭), 0 = 없음, 1 = 올림(♯). 이 앱의 음계는 겹변화표를 쓰지 않는다. */
export type Alter = -1 | 0 | 1;
export type Notation = 'both' | 'ko' | 'en';

export interface NoteName {
  letter: Letter;
  alter: Alter;
}

export interface ScaleNote extends NoteName {
  /** 실제 음높이(MIDI 번호). C4 = 60 */
  midi: number;
  /** 음높이 종류 0~11 (C = 0) */
  pc: number;
  /** 오선 위 자리 번호. C4 = 28, E4(첫째 줄) = 30, F5(다섯째 줄) = 38. 한 칸 = 줄 또는 칸 하나 */
  step: number;
  /** 몇 번째 자리인지 1~8 */
  degree: number;
  /** 덧줄이 놓이는 자리 번호 목록 */
  ledger: number[];
}

export interface KeySignature {
  type: 'none' | 'sharp' | 'flat';
  count: number;
  /** 조표가 붙는 글자(붙는 순서대로) */
  letters: Letter[];
  /** 높은음자리표에서 조표가 놓이는 자리 번호(붙는 순서대로) */
  steps: number[];
}

export interface TrayKey {
  /** 재료 건반에서의 번호 0~12 (0 = 으뜸음, 12 = 높은 으뜸음) */
  index: number;
  midi: number;
  pc: number;
  black: boolean;
  /** 맨 오른쪽 '높은 으뜸음' 건반 */
  top: boolean;
  /** 흰건반은 이름 1개, 검은건반은 [올림 이름, 내림 이름] */
  names: NoteName[];
}

export interface Scale {
  /** 장음계는 으뜸음 이름("C", "F#", "Bb"), 단음계는 으뜸음 + "m"("Am", "F#m") */
  id: string;
  mode: Mode;
  tonic: NoteName;
  tonicMidi: number;
  /** 이웃한 음 사이의 반음 수 7개 (온음 = 2, 반음 = 1) */
  steps: number[];
  /** 조표 개수. 올림표는 +, 내림표는 - */
  signed: number;
  notes: ScaleNote[];
  keySig: KeySignature;
  /** 자리 아래에 적는 계이름 8개 */
  solfege: string[];
  tray: TrayKey[];
}

export interface Placement {
  ok: boolean;
  pc: number;
  midi: number;
  name: NoteName;
  step: number;
}

export type IntervalKind = 'half' | 'whole' | 'wider' | 'notHigher';

export interface Diagnosis {
  semitones: number;
  kind: IntervalKind;
  /** 필요한 간격과 같은지 */
  match: boolean;
}

export type HintKind = 'start' | 'interval' | 'position' | 'name';

export interface Hint {
  kind: HintKind;
  need: 'half' | 'whole' | null;
  /** 반짝일 건반 번호. 없으면 null */
  targetKey: number | null;
  /** 알려 줄 음 이름. 없으면 null */
  name: NoteName | null;
}

export interface NeighborInterval {
  semitones: number;
  kind: IntervalKind;
  need: number;
}

export interface Judgement {
  ok: boolean;
  slots: boolean[];
  /** 처음 틀린 자리(0~7). 없으면 -1 */
  firstWrong: number;
  wrongCount: number;
  /** 처음 틀린 자리의 앞뒤 간격. 다 맞으면 null */
  first: { slot: number; before: NeighborInterval | null; after: NeighborInterval | null } | null;
}

export interface NameChoice {
  answer: NoteName;
  /** 같은 건반의 다른 이름 */
  other: NoteName;
  prevLetter: Letter;
  letter: Letter;
}

export interface FixOrder {
  /** 틀린 재료가 꽂힌 자리(0~7) */
  slot: number;
  /** 틀린 재료의 건반 번호 */
  wrongKey: number;
  wrongName: NoteName;
  /** forgot = 변화표를 빼먹음, low = 반음 낮음, high = 반음 높음 */
  kind: 'forgot' | 'low' | 'high';
}

export interface NeighborFix {
  /** 재료를 빌려 온 이웃 음계 */
  source: string;
  slot: number;
  wrongKey: number;
  wrongName: NoteName;
}

export interface StarRecord {
  learned: boolean;
  challengeClean: boolean;
  fill: boolean;
  fix: boolean;
  name: boolean;
}

export type UnlockSetting = 'sequence' | 'basicOnly' | 'all';

// ───────────────────────── 기본 표 ─────────────────────────

export const LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const PATTERN: Record<Mode, readonly number[]> = {
  major: [2, 2, 1, 2, 2, 2, 1],
  minor: [2, 1, 2, 2, 1, 2, 2],
};
const SOLFEGE: Record<Mode, readonly string[]> = {
  major: ['도', '레', '미', '파', '솔', '라', '시', '도'],
  minor: ['라', '시', '도', '레', '미', '파', '솔', '라'],
};
const SHARP_ORDER: readonly Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER: readonly Letter[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
/** 높은음자리표의 조표 자리(붙는 순서대로) */
export const KEY_SIG_STEPS: Record<'sharp' | 'flat', readonly number[]> = {
  sharp: [38, 35, 39, 36, 33, 37, 34],
  flat: [34, 37, 33, 36, 32, 35, 31],
};
const BLACK_PCS: ReadonlySet<number> = new Set([1, 3, 6, 8, 10]);
const KO_LETTER: Record<Letter, string> = { C: '다', D: '라', E: '마', F: '바', G: '사', A: '가', B: '나' };

/** 코스 구성 (R-50) */
export const COURSE = {
  basic: ['C', 'F', 'G', 'Bb', 'Am', 'Dm'],
  challengeMajor: ['D', 'A', 'Eb', 'E', 'Ab', 'B', 'Db', 'F#'],
  challengeMinor: ['Em', 'Gm', 'Bm', 'Cm', 'F#m', 'Fm', 'C#m', 'Bbm', 'G#m', 'D#m'],
  /** 소리는 같고 이름만 다른 쌍둥이 꼬치 */
  twins: { 'F#': 'Gb', 'D#m': 'Ebm' } as Record<string, string>,
  /** 엔진은 계산할 수 있지만 메뉴에는 넣지 않는 음계 */
  engineOnly: ['C#', 'Cb', 'A#m', 'Abm'],
} as const;

const TWIN_OF: Record<string, string> = { 'F#': 'Gb', Gb: 'F#', 'D#m': 'Ebm', Ebm: 'D#m' };
const TWIN_IDS: readonly string[] = ['Gb', 'Ebm'];

// ───────────────────────── 작은 도구 ─────────────────────────

const mod = (n: number, m: number): number => ((n % m) + m) % m;
const pcOfName = (n: NoteName): number => mod(NATURAL_PC[n.letter] + n.alter, 12);
const letterIndex = (l: Letter): number => LETTERS.indexOf(l);

function letterAt(i: number): Letter {
  const l = LETTERS[mod(i, 7)];
  if (l === undefined) throw new Error('글자 번호가 잘못되었습니다');
  return l;
}

function toAlter(n: number): Alter {
  if (n === -1 || n === 0 || n === 1) return n;
  throw new Error('이 앱이 다루지 않는 변화표입니다: ' + n);
}

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

function naturalLetterOf(pc: number): Letter | null {
  for (const l of LETTERS) if (NATURAL_PC[l] === pc) return l;
  return null;
}
function sharpNameOf(pc: number): NoteName {
  const l = naturalLetterOf(mod(pc - 1, 12));
  if (l === null) throw new Error('검은건반이 아닙니다');
  return { letter: l, alter: 1 };
}
function flatNameOf(pc: number): NoteName {
  const l = naturalLetterOf(mod(pc + 1, 12));
  if (l === null) throw new Error('검은건반이 아닙니다');
  return { letter: l, alter: -1 };
}

// ───────────────────────── 음계 (R-10 ~ R-14) ─────────────────────────

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

function noteAt(scale: Scale, slot: number): ScaleNote {
  const n = scale.notes[slot];
  if (n === undefined) throw new Error('자리 번호는 0~7 입니다: ' + slot);
  return n;
}
function stepAt(scale: Scale, i: number): number {
  const s = scale.steps[i];
  if (s === undefined) throw new Error('간격 번호는 0~6 입니다: ' + i);
  return s;
}

// ───────────────────────── 이름 표기 (R-60 ~ R-62) ─────────────────────────

export const noteKo = (n: NoteName): string => (n.alter === 1 ? '올림' : n.alter === -1 ? '내림' : '') + KO_LETTER[n.letter];
export const noteEn = (n: NoteName): string => n.letter + (n.alter === 1 ? '♯' : n.alter === -1 ? '♭' : '');

/** 화면에 쓰는 음 이름(글자만). both 는 "내림나(B♭)" 꼴이며, 화면에서는 영어 부분을 작게 덧붙여 그린다. */
export function noteLabel(n: NoteName, notation: Notation): string {
  if (notation === 'en') return noteEn(n);
  if (notation === 'ko') return noteKo(n);
  return noteKo(n) + '(' + noteEn(n) + ')';
}

/** 음계 이름. ko = "내림나장조", en = "B♭장음계", short = "B♭" 또는 "Gm" */
export function scaleLabel(id: string, form: 'ko' | 'en' | 'short'): string {
  const { tonic, mode } = parseScaleId(id);
  if (form === 'ko') return noteKo(tonic) + (mode === 'major' ? '장조' : '단조');
  if (form === 'en') return noteEn(tonic) + (mode === 'major' ? '장음계' : '단음계');
  return noteEn(tonic) + (mode === 'major' ? '' : 'm');
}

/** 같은 건반의 다른 이름 (R-33) */
export function altName(n: NoteName): NoteName {
  const pc = pcOfName(n);
  const natural = naturalLetterOf(pc);
  if (natural !== null) return { letter: natural, alter: 0 };
  return n.alter < 0 ? sharpNameOf(pc) : flatNameOf(pc);
}

// ───────────────────────── 자리 판정 (R-20 ~ R-23) ─────────────────────────

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

// ───────────────────────── 힌트 (R-30) ─────────────────────────

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

// ───────────────────────── 굽기 판정 (R-31) ─────────────────────────

/** 도전 주문: 8자리를 다 꽂은 뒤 한 번에 판정한다. keys 는 자리마다 누른 건반 번호 8개. */
export function judge(scale: Scale, keys: readonly number[]): Judgement {
  if (keys.length !== 8) throw new Error('건반 번호 8개가 필요합니다');
  const ps = keys.map((k, slot) => place(scale, slot, k));
  const slots = ps.map((p) => p.ok);
  const firstWrong = slots.indexOf(false);
  const wrongCount = slots.filter((x) => !x).length;
  if (firstWrong < 0) return { ok: true, slots, firstWrong: -1, wrongCount: 0, first: null };
  const at = (i: number): Placement => {
    const p = ps[i];
    if (p === undefined) throw new Error('자리 번호가 잘못되었습니다');
    return p;
  };
  const pair = (a: number, b: number, need: number): NeighborInterval => {
    const d = diagnose(at(a).midi, at(b).midi, need);
    return { semitones: d.semitones, kind: d.kind, need };
  };
  const before = firstWrong > 0 ? pair(firstWrong - 1, firstWrong, stepAt(scale, firstWrong - 1)) : null;
  const after = firstWrong < 7 ? pair(firstWrong, firstWrong + 1, stepAt(scale, firstWrong)) : null;
  return { ok: false, slots, firstWrong, wrongCount, first: { slot: firstWrong, before, after } };
}

// ───────────────────────── 이름표 달기 (R-32) ─────────────────────────

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

// ───────────────────────── 음계 사이의 관계 (R-40 ~ R-42) ─────────────────────────

/** 나란한조: 장음계의 6번째 음에서 시작하는 단음계, 단음계의 3번째 음에서 시작하는 장음계 */
export function relativeOf(id: string): string {
  const s = buildScale(id);
  return s.mode === 'major' ? noteText(noteAt(s, 5)) + 'm' : noteText(noteAt(s, 2));
}

const BY_SIGNED: Record<Mode, Map<number, string>> = { major: new Map(), minor: new Map() };
for (const id of ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']) BY_SIGNED.major.set(buildScale(id).signed, id);
for (const id of ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm']) BY_SIGNED.minor.set(buildScale(id).signed, id);

/** 5도권에서 조표가 하나 적은 이웃. 조표가 없는 C·Am 은 null */
export function neighborOf(id: string): string | null {
  const s = buildScale(id);
  if (s.signed === 0) return null;
  return BY_SIGNED[s.mode].get(s.signed > 0 ? s.signed - 1 : s.signed + 1) ?? null;
}

/** 소리는 같고 이름만 다른 쌍둥이 음계 */
export function twinOf(id: string): string | null {
  return TWIN_OF[id] ?? null;
}

// ───────────────────────── 주문 만들기 (R-43 ~ R-46) ─────────────────────────

/** 씨앗 값이 같으면 언제나 같은 수열이 나오는 난수 (mulberry32). 0 이상 1 미만의 수를 돌려준다. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = ((t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 빈자리 채우기: 비울 자리(0~7 번호)를 돌려준다. 첫 자리와 끝 자리는 비우지 않는다.
 * 1) [1..6] 을 뒤에서부터 섞는다(피셔–예이츠). 2) 앞에서 blanks 개를 고른다.
 * 3) 반음에 닿은 자리가 하나도 없으면, 가장 큰 번호를 빼고 반음에 닿은 가장 작은 번호를 넣는다. 4) 오름차순 정렬.
 */
export function makeFill(scale: Scale, seed: number, blanks: number): number[] {
  const rnd = mulberry32(seed);
  const c = [1, 2, 3, 4, 5, 6];
  for (let i = 5; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const a = c[i];
    const b = c[j];
    if (a === undefined || b === undefined) throw new Error('섞기 오류');
    c[i] = b;
    c[j] = a;
  }
  const picked = c.slice(0, blanks);
  const half = [1, 2, 3, 4, 5, 6].filter((i) => stepAt(scale, i - 1) === 1 || stepAt(scale, i) === 1);
  if (!picked.some((b) => half.includes(b))) {
    const drop = Math.max(...picked);
    picked.splice(picked.indexOf(drop), 1);
    const add = half.filter((h) => !picked.includes(h));
    const first = add[0];
    if (first === undefined) throw new Error('반음에 닿은 자리를 찾지 못했습니다');
    picked.push(Math.min(...add, first));
  }
  return picked.sort((x, y) => x - y);
}

/**
 * 고쳐 굽기: 완성된 꼬치에서 한 자리(2~7번째)를 틀린 재료로 바꾼다.
 * - 변화표가 붙는 음이면 변화표를 빼먹은 재료(같은 글자의 제자리 음)로 바꾼다.
 * - 아니면 반음 아래·위 가운데 이웃 자리의 재료와 겹치지 않는 것에서 고른다.
 */
export function makeFix(scale: Scale, seed: number): FixOrder {
  const rnd = mulberry32(seed);
  const slot = 1 + Math.floor(rnd() * 6);
  const exp = noteAt(scale, slot);
  const key = exp.midi - scale.tonicMidi;
  let delta: number;
  let kind: FixOrder['kind'];
  if (exp.alter !== 0) {
    delta = -exp.alter;
    kind = 'forgot';
  } else {
    const around = [noteAt(scale, slot - 1).pc, noteAt(scale, slot + 1).pc];
    const cands = [-1, 1].filter((d) => !around.includes(mod(exp.pc + d, 12)));
    const pick = cands[Math.floor(rnd() * cands.length)];
    if (pick === undefined) throw new Error('바꿀 재료를 찾지 못했습니다');
    delta = pick;
    kind = delta < 0 ? 'low' : 'high';
  }
  const wrongKey = key + delta;
  return { slot, wrongKey, wrongName: place(scale, slot, wrongKey).name, kind };
}

/**
 * 이웃 꼬치: 조표가 하나 적은 이웃 음계의 재료를 그대로 이 음계의 으뜸음부터 꽂으면 한 자리만 틀린다.
 * 그 자리와 틀린 재료를 돌려준다. 이웃이 없는 C·Am 은 null.
 */
export function neighborFix(scale: Scale): NeighborFix | null {
  const source = neighborOf(scale.id);
  if (source === null) return null;
  const pcs = new Set(buildScale(source).notes.map((n) => n.pc));
  const slot = scale.notes.slice(0, 7).findIndex((n) => !pcs.has(n.pc));
  if (slot < 1) throw new Error('이웃 음계와 다른 자리를 찾지 못했습니다');
  const key = noteAt(scale, slot).midi - scale.tonicMidi;
  const wrongKey = scale.signed > 0 ? key - 1 : key + 1;
  return { source, slot, wrongKey, wrongName: place(scale, slot, wrongKey).name };
}

// ───────────────────────── 별과 잠금 (R-50 ~ R-52) ─────────────────────────

/** 별: 1 = 배우기 완성, 2 = 도전 주문을 한 번에 통과, 3 = 응용 주문(빈자리·고쳐 굽기·이름표)까지 통과 */
export function stars(record: StarRecord, scale: Scale): 0 | 1 | 2 | 3 {
  if (!record.learned) return 0;
  if (!record.challengeClean) return 1;
  if (record.fill && record.fix && (record.name || !hasNameSlots(scale))) return 3;
  return 2;
}

const CONTENT_IDS: readonly string[] = [...COURSE.basic, ...COURSE.challengeMajor, ...COURSE.challengeMinor, ...TWIN_IDS];

/**
 * 잠금: progress 는 음계 id → 별 수.
 * - all: 메뉴의 음계 전부 열림.
 * - 기본 코스는 앞 음계가 별 1개 이상이면 열림(첫 음계는 항상 열림).
 * - basicOnly: 기본 코스만. sequence: 기본 코스를 모두 마치면 도전 코스가 열리고, 쌍둥이는 짝이 별 1개 이상일 때 열림.
 */
export function isUnlocked(id: string, progress: Readonly<Record<string, number>>, setting: UnlockSetting): boolean {
  if (!CONTENT_IDS.includes(id)) return false;
  if (setting === 'all') return true;
  const got = (x: string): number => progress[x] ?? 0;
  const basic: readonly string[] = COURSE.basic;
  const at = basic.indexOf(id);
  if (at >= 0) {
    const prev = basic[at - 1];
    return at === 0 || (prev !== undefined && got(prev) >= 1);
  }
  if (setting === 'basicOnly') return false;
  const basicDone = basic.every((b) => got(b) >= 1);
  if (TWIN_IDS.includes(id)) {
    const twin = TWIN_OF[id];
    return basicDone && twin !== undefined && got(twin) >= 1;
  }
  return basicDone;
}
