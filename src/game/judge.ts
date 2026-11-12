import type { Scale, Placement, Judgement, NeighborInterval } from './types';
import { place, diagnose } from './place';
import { stepAt } from './scale';
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
