import type { Letter, Mode } from './types';
export const LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const NATURAL_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const PATTERN: Record<Mode, readonly number[]> = {
  major: [2, 2, 1, 2, 2, 2, 1],
  minor: [2, 1, 2, 2, 1, 2, 2],
};
export const SOLFEGE: Record<Mode, readonly string[]> = {
  major: ['도', '레', '미', '파', '솔', '라', '시', '도'],
  minor: ['라', '시', '도', '레', '미', '파', '솔', '라'],
};
export const SHARP_ORDER: readonly Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const FLAT_ORDER: readonly Letter[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
/** 높은음자리표의 조표 자리(붙는 순서대로) */
export const KEY_SIG_STEPS: Record<'sharp' | 'flat', readonly number[]> = {
  sharp: [38, 35, 39, 36, 33, 37, 34],
  flat: [34, 37, 33, 36, 32, 35, 31],
};
export const BLACK_PCS: ReadonlySet<number> = new Set([1, 3, 6, 8, 10]);
export const KO_LETTER: Record<Letter, string> = { C: '다', D: '라', E: '마', F: '바', G: '사', A: '가', B: '나' };

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

export const TWIN_OF: Record<string, string> = { 'F#': 'Gb', Gb: 'F#', 'D#m': 'Ebm', Ebm: 'D#m' };
export const TWIN_IDS: readonly string[] = ['Gb', 'Ebm'];
