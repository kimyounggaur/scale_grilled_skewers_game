import type { Scale, FixOrder, NeighborFix } from './types';
import { mulberry32 } from './rng';
import { noteAt, stepAt, buildScale } from './scale';
import { mod } from './shared';
import { place } from './place';
import { neighborOf } from './relations';
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
