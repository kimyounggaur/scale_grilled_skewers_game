
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
