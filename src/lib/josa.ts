import type { Notation } from '../game';

export function hasBatchim(label: string, notation: Notation): boolean {
  // R-62: Korean note names end in an open syllable; English altered notes end in 샵/플랫.
  return notation === 'en' && /[#b♯♭]/.test(label);
}
export function josa(label: string, pair: '을/를' | '은/는' | '이/가' | '으로/로' | '과/와' | '이라고/라고', notation: Notation = 'both'): string {
  const [closed = '', open = ''] = pair.split('/');
  return hasBatchim(label, notation) ? closed : open;
}
export const withJosa = (label: string, pair: Parameters<typeof josa>[1], notation: Notation = 'both'): string => label + josa(label, pair, notation);
