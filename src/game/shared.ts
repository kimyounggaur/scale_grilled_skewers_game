import type { NoteName, Letter, Alter } from './types';
import { LETTERS, NATURAL_PC } from './data';
export const mod = (n: number, m: number): number => ((n % m) + m) % m;
export const pcOfName = (n: NoteName): number => mod(NATURAL_PC[n.letter] + n.alter, 12);
export const letterIndex = (l: Letter): number => LETTERS.indexOf(l);

export function letterAt(i: number): Letter {
  const l = LETTERS[mod(i, 7)];
  if (l === undefined) throw new Error('글자 번호가 잘못되었습니다');
  return l;
}

export function toAlter(n: number): Alter {
  if (n === -1 || n === 0 || n === 1) return n;
  throw new Error('이 앱이 다루지 않는 변화표입니다: ' + n);
}

export function naturalLetterOf(pc: number): Letter | null {
  for (const l of LETTERS) if (NATURAL_PC[l] === pc) return l;
  return null;
}
export function sharpNameOf(pc: number): NoteName {
  const l = naturalLetterOf(mod(pc - 1, 12));
  if (l === null) throw new Error('검은건반이 아닙니다');
  return { letter: l, alter: 1 };
}
export function flatNameOf(pc: number): NoteName {
  const l = naturalLetterOf(mod(pc + 1, 12));
  if (l === null) throw new Error('검은건반이 아닙니다');
  return { letter: l, alter: -1 };
}
