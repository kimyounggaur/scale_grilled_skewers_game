import { describe, expect, it } from 'vitest';
import { buildScale, COURSE, nameChoice, noteText, type Scale } from '../index';
import {
  askHint,
  bake,
  canBake,
  chooseName,
  createOrder,
  currentNameChoices,
  initialEffects,
  recordPatch,
  serve,
  tapKey,
  tapSlot,
  type OrderKind,
  type OrderState,
} from './index';

const IDS = [...COURSE.basic, ...COURSE.challengeMajor, ...COURSE.challengeMinor, 'Gb', 'Ebm'];
function answerKey(scale: Scale, slot: number) {
  const n = scale.notes[slot];
  if (!n) throw new Error('Bad test slot');
  return n.midi - scale.tonicMidi;
}
function fillCorrect(state: OrderState): OrderState {
  const scale = buildScale(state.scaleId);
  let s = state;
  let guard = 0;
  while (s.cursor < 8 && guard++ < 10) s = tapKey(s, answerKey(scale, s.cursor)).state;
  return s;
}
function complete(state: OrderState): OrderState {
  expect(canBake(state)).toBe(true);
  const baking = bake(state);
  expect(baking.state.phase).toBe('baking');
  expect(baking.effects.some((x) => x.type === 'sizzle')).toBe(true);
  return serve(baking.state).state;
}

describe('입문과 배우기 주문', () => {
  it('C 입문 대본의 안내 번호와 반음 묶음을 순서대로 낸다', () => {
    let s = createOrder('C', 'learn', 0, { guide: 'full' });
    const ids = [s.message.id];
    const scale = buildScale('C');
    expect(initialEffects(s).some((x) => x.type === 'flash')).toBe(true);
    const pairs: number[][] = [];
    for (let i = 0; i < 8; i++) {
      const transition = tapKey(s, answerKey(scale, i));
      s = transition.state;
      ids.push(s.message.id);
      for (const effect of transition.effects) if (effect.type === 'pair') pairs.push(effect.keys);
    }
    expect(ids).toEqual(['T-01', 'T-10', 'T-10', 'T-11', 'T-10', 'T-10', 'T-10', 'T-12', 'T-16']);
    expect(pairs).toEqual([[4, 5], [11, 12]]);
    s = complete(s);
    expect(s.message.id).toBe('T-30');
    expect(recordPatch(s)).toEqual({ learned: true });
  });

  it('F 네 번째 자리 오답은 세 단계 힌트를 거쳐 B♭ 이름을 설명한다', () => {
    let s = createOrder('F', 'learn', 0, { guide: 'intro2' });
    for (const key of [0, 2, 4]) s = tapKey(s, key).state;
    expect(s.cursor).toBe(3);
    s = tapKey(s, 6).state;
    expect(s.message.id).toBe('T-20');
    expect(s.message.values.diagnosis).toMatchObject({ semitones: 2, kind: 'whole', match: false });
    expect(s.cursor).toBe(3);
    expect(s.hintLevel).toBe(1);
    s = tapKey(s, 6).state;
    expect(s.message.id).toBe('T-22');
    expect(s.flashKeys).toEqual([5]);
    s = tapKey(s, 6).state;
    expect(s.message.id).toBe('T-23');
    expect(s.latestHint?.name).toEqual({ letter: 'B', alter: -1 });
    s = tapKey(s, 5).state;
    expect(s.message.id).toBe('T-15');
    expect(s.message.values.answer).toEqual({ letter: 'B', alter: -1 });
    expect(s.message.values.alternate).toEqual({ letter: 'A', alter: 1 });
    expect(s.hintLevel).toBe(0);
    expect(s.wrongCount).toBe(3);
    expect(s.wrongSlot).toBeNull();
    s = complete(fillCorrect(s));
    expect(s.message.id).toBe('T-31');
    expect(recordPatch(s)).toEqual({ learned: true });
  });

  it.each(IDS)('%s 배우기를 끝내고 같은 PC의 낮은 으뜸음으로 높은 마지막 음을 채운다', (id) => {
    let s = createOrder(id, 'learn');
    const scale = buildScale(id);
    for (let i = 0; i < 8; i++) s = tapKey(s, i === 7 ? 0 : answerKey(scale, i)).state;
    expect(s.slots[7]?.placement?.midi).toBe(scale.tonicMidi + 12);
    s = complete(s);
    expect(s.phase).toBe('served');
    expect(recordPatch(s)).toEqual({ learned: true });
  });

  it('맞은 자리와 주어진 재료는 다시 고를 수 없고 소리만 들려준다', () => {
    let s = createOrder('C', 'learn');
    s = tapKey(s, 0).state;
    const before = JSON.stringify(s);
    const result = tapSlot(s, 0);
    expect(JSON.stringify(result.state)).toBe(before);
    expect(result.effects).toContainEqual({ type: 'tones', midis: [60] });
    expect(result.state.cursor).toBe(1);
  });

  it('힌트는 같은 자리에서 올라가고 새 자리에 가면 초기화된다', () => {
    let s = createOrder('G', 'learn');
    s = askHint(s).state;
    expect(s.hintLevel).toBe(1);
    expect(s.message.id).toBe('T-24');
    s = tapKey(s, 0).state;
    expect(s.hintLevel).toBe(0);
    s = askHint(s).state;
    expect(s.message.id).toBe('T-21');
    s = askHint(s).state;
    expect(s.message.id).toBe('T-22');
    s = askHint(s).state;
    expect(s.message.id).toBe('T-23');
    s = askHint(s).state;
    expect(s.hintLevel).toBe(3);
  });

  it('다음 안내에 방금 완성한 간격과 다음 자리 번호를 구분한다', () => {
    let s = createOrder('C', 'learn');
    s = tapKey(s, 0).state;
    expect(s.message.values.previous).toBeNull();
    expect(s.message.values.nextK).toBe(2);
    s = tapKey(s, 2).state;
    expect(s.message.values.previous).toMatchObject({ letter: 'C' });
    expect(s.message.values.answer).toMatchObject({ letter: 'D' });
    expect(s.message.values.nextK).toBe(3);
  });
});

describe('도전 주문', () => {
  it.each(IDS)('%s 도전은 꽂을 때 채점하지 않고 굽기에서 한 번에 통과한다', (id) => {
    let s = createOrder(id, 'challenge');
    const scale = buildScale(id);
    for (let i = 0; i < 8; i++) {
      const transition = tapKey(s, answerKey(scale, i));
      s = transition.state;
      expect(s.wrongSlot).toBeNull();
      expect(s.wrongCount).toBe(0);
      expect(transition.effects.some((x) => x.type === 'shake' || x.type === 'flash')).toBe(false);
    }
    s = complete(s);
    expect(recordPatch(s)).toEqual({ challengeClean: true });
  });

  it('두 자리가 틀려도 첫 자리만 가리키고 수정해도 깨끗한 통과로 기록하지 않는다', () => {
    let s = createOrder('G', 'challenge');
    const scale = buildScale('G');
    for (let i = 0; i < 8; i++) s = tapKey(s, i === 2 || i === 6 ? answerKey(scale, i) - 1 : answerKey(scale, i)).state;
    expect(s.wrongCount).toBe(0);
    expect(s.wrongSlot).toBeNull();
    s = bake(s).state;
    expect(s.phase).toBe('building');
    expect(s.wrongSlot).toBe(2);
    expect(s.cursor).toBe(2);
    expect(s.message.id).toBe('T-40');
    s = tapKey(s, answerKey(scale, 2)).state;
    expect(s.cursor).toBe(8);
    expect(s.wrongSlot).toBeNull();
    s = bake(s).state;
    expect(s.wrongSlot).toBe(6);
    s = tapKey(s, answerKey(scale, 6)).state;
    s = complete(s);
    expect(recordPatch(s)).toEqual({});
    expect(s.message.values.clean).toBe(false);
  });

  it('굽기 전에 이미 채운 어느 자리든 바꿀 수 있다', () => {
    let s = fillCorrect(createOrder('C', 'challenge'));
    s = tapSlot(s, 3).state;
    expect(s.cursor).toBe(3);
    s = tapKey(s, 6).state;
    expect(s.slots[3]?.key).toBe(6);
    expect(s.wrongCount).toBe(0);
    expect(s.wrongSlot).toBeNull();
  });
});

describe('빈자리와 고쳐 굽기', () => {
  it.each(IDS)('%s 빈자리는 결정적이고 첫/끝 재료는 잠겨 있다', (id) => {
    let s = createOrder(id, 'fill', 7);
    expect(s).toEqual(createOrder(id, 'fill', 7));
    expect(s.slots.filter((x) => !x.given)).toHaveLength(3);
    expect(s.slots[0]?.given).toBe(true);
    expect(s.slots[7]?.given).toBe(true);
    const at = s.cursor;
    s = tapSlot(s, 0).state;
    expect(s.cursor).toBe(at);
    s = complete(fillCorrect(s));
    expect(recordPatch(s)).toEqual({ fill: true });
    expect(createOrder(id, 'fill', 7, { fillPassed: true }).slots.filter((x) => !x.given)).toHaveLength(4);
  });

  it('빈자리 힌트는 한 단계까지만이고 오답이 있으면 통과로 기록하지 않는다', () => {
    let s = createOrder('F', 'fill');
    s = askHint(askHint(s).state).state;
    expect(s.hintLevel).toBe(1);
    const scale = buildScale('F');
    s = tapKey(s, answerKey(scale, s.cursor) + 1).state;
    s = complete(fillCorrect(s));
    expect(recordPatch(s)).toEqual({});
  });

  it.each(IDS)('%s 고쳐 굽기는 잘못된 자리 하나를 찾아 바꾸고 통과한다', (id) => {
    let s = createOrder(id, 'fix', 13);
    const scale = buildScale(id);
    expect(s).toEqual(createOrder(id, 'fix', 13));
    expect(s.slots.filter((x) => x.placement?.ok === false)).toHaveLength(1);
    expect(s.wrongSlot).toBeNull();
    expect(canBake(s)).toBe(false);
    const fault = s.fix?.slot;
    expect(fault).toBeDefined();
    if (fault === undefined) throw new Error('No fault');
    s = tapSlot(s, fault).state;
    expect(s.fix?.found).toBe(true);
    expect(s.message.values.found).toBe(true);
    s = tapKey(s, answerKey(scale, fault)).state;
    s = complete(s);
    expect(recordPatch(s)).toEqual({ fix: true });
  });

  it('F 이웃 꼬치는 C 재료의 B를 B♭으로 바꾸고 홀수 번은 일반 고치기를 낸다', () => {
    let s = createOrder('F', 'fix', 0, { neighborLearned: true });
    expect(s.fix).toMatchObject({ slot: 3, found: false, source: 'C' });
    expect(s.slots[3]?.key).toBe(6);
    s = tapSlot(s, 3).state;
    s = tapKey(s, 5).state;
    expect(recordPatch(complete(s))).toEqual({ fix: true });
    expect(createOrder('F', 'fix', 1, { neighborLearned: true }).fix?.source).toBeUndefined();
  });

  it('맞는 재료를 잘못 지목한 뒤 완성하면 통과로 기록하지 않는다', () => {
    let s = createOrder('F', 'fix', 0, { neighborLearned: true });
    s = tapSlot(s, 0).state;
    expect(s.message.values.found).toBe(false);
    expect(s.wrongCount).toBe(1);
    expect(s.fix?.found).toBe(false);
    s = tapSlot(s, 3).state;
    s = tapKey(s, 5).state;
    expect(recordPatch(complete(s))).toEqual({});
  });
});

describe('이름표 달기와 관계', () => {
  it.each(IDS)('%s 이름표 질문과 보기 순서는 결정적이며 완료 후에만 드러난다', (id) => {
    let s = createOrder(id, 'name', 21);
    const scale = buildScale(id);
    expect(s.nameSolved).toEqual([]);
    expect(currentNameChoices(s)).toEqual(currentNameChoices(createOrder(id, 'name', 21)));
    while (s.cursor < 8) {
      const choice = nameChoice(scale, s.cursor);
      if (!choice) throw new Error('No question');
      const slot = s.cursor;
      expect(currentNameChoices(s).map(noteText).sort()).toEqual([choice.answer, choice.other].map(noteText).sort());
      s = chooseName(s, choice.answer).state;
      expect(s.nameSolved).toContain(slot);
    }
    s = complete(s);
    expect(recordPatch(s)).toEqual({ name: true });
  });

  it('F 이름표 오답은 소리가 맞다는 안내이며 음높이를 바꾸지 않는다', () => {
    let s = createOrder('F', 'name');
    expect(s.nameSlots).toEqual([3]);
    const slots = JSON.stringify(s.slots);
    s = chooseName(s, 'A#').state;
    expect(s.message.id).toBe('T-51');
    expect(s.cursor).toBe(3);
    expect(s.nameSolved).toEqual([]);
    expect(JSON.stringify(s.slots)).toBe(slots);
    s = chooseName(s, 'B♭').state;
    expect(s.message.id).toBe('T-52');
    expect(s.nameSolved).toEqual([3]);
    expect(recordPatch(complete(s))).toEqual({});
  });

  it('F♯의 E♯/F 질문과 C♭/B 질문도 만든다', () => {
    const fs = createOrder('F#', 'name');
    expect(fs.nameSlots).toHaveLength(5);
    expect(nameChoice(buildScale('F#'), 6)).toMatchObject({ answer: { letter: 'E', alter: 1 }, other: { letter: 'F', alter: 0 } });
    expect(nameChoice(buildScale('Gb'), 3)).toMatchObject({ answer: { letter: 'C', alter: -1 }, other: { letter: 'B', alter: 0 } });
  });

  it('Am 연결 안내와 쌍둥이 관계를 준비한다', () => {
    const am = createOrder('Am', 'learn', 0, { relativeLearned: true });
    expect(am.message.id).toBe('T-04');
    expect(am.message.values.relative).toBe('C');
    const gb = createOrder('Gb', 'learn');
    expect(gb.message.values.twin).toBe('F#');
  });
});

describe('안정성과 불변성', () => {
  it('각 동작은 받은 상태를 바꾸지 않는다', () => {
    const s = createOrder('F', 'learn');
    const before = JSON.stringify(s);
    tapKey(s, 0);
    tapSlot(s, 0);
    askHint(s);
    bake(s);
    serve(s);
    chooseName(s, 'Bb');
    expect(JSON.stringify(s)).toBe(before);
  });

  it('잘못된 입력과 굽기 도중의 입력을 무시한다', () => {
    const s = createOrder('C', 'learn');
    for (const key of [-1, 13, 1.5, NaN]) expect(tapKey(s, key).state).toBe(s);
    for (const slot of [-1, 8, 1.5, NaN]) expect(tapSlot(s, slot).state).toBe(s);
    expect(bake(s).state).toBe(s);
    expect(serve(s).state).toBe(s);
    const baking = bake(fillCorrect(s)).state;
    expect(tapKey(baking, 0).state).toBe(baking);
    expect(tapSlot(baking, 0).state).toBe(baking);
    expect(askHint(baking).state).toBe(baking);
  });

  it.each(['challenge', 'name'] satisfies OrderKind[])('%s 주문은 힌트를 제공하지 않는다', (kind) => {
    const s = createOrder('F', kind);
    expect(askHint(s).effects).toEqual([]);
  });
});
