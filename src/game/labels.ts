import type { NoteName, Notation } from './types';
import { KO_LETTER } from './data';
import { parseScaleId } from './names';
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
