import type { Mode } from './types';
import { TWIN_OF } from './data';
import { buildScale, noteAt } from './scale';
import { noteText } from './names';
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
