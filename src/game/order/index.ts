/** Pure order transitions. UI timing, sound creation and persistence live outside this module. */
import {
  altName,
  buildScale,
  diagnose,
  hint,
  judge,
  makeFill,
  makeFix,
  mulberry32,
  nameChoice,
  neighborFix,
  noteText,
  parseNote,
  place,
  relativeOf,
  twinOf,
  type NoteName,
  type Scale,
  type StarRecord,
} from '../index';
import type {
  NameInput,
  OrderEffect,
  OrderKind,
  OrderMessage,
  OrderOptions,
  OrderState,
  OrderTransition,
  SlotState,
} from './types';

export type * from './types';

function noteAt(scale: Scale, slot: number) {
  const n = scale.notes[slot];
  if (!n) throw new Error('자리 번호는 0~7이에요.');
  return n;
}

function keyFor(scale: Scale, slot: number): number {
  return noteAt(scale, slot).midi - scale.tonicMidi;
}

function givenSlot(scale: Scale, slot: number): SlotState {
  const key = keyFor(scale, slot);
  return { key, placement: place(scale, slot, key), given: true };
}

function emptySlot(): SlotState {
  return { key: null, placement: null, given: false };
}

function firstEmpty(slots: readonly SlotState[]): number {
  const at = slots.findIndex((s) => s.key === null);
  return at < 0 ? 8 : at;
}

function message(state: OrderState, id: string, values: Record<string, unknown> = {}): OrderMessage {
  const scale = buildScale(state.scaleId);
  const slot = Math.min(7, state.cursor);
  const n = noteAt(scale, slot);
  return {
    id,
    values: {
      scaleId: state.scaleId,
      tonic: scale.tonic,
      slot,
      k: slot + 1,
      answer: { letter: n.letter, alter: n.alter },
      previous: slot > 0 ? noteAt(scale, slot - 1) : null,
      need: slot > 0 ? (scale.steps[slot - 1] === 1 ? 'half' : 'whole') : null,
      ...values,
    },
  };
}

function withMessage(state: OrderState, id: string, values: Record<string, unknown> = {}, effects: OrderEffect[] = []): OrderTransition {
  const text = message(state, id, values);
  return { state: { ...state, message: text }, effects: [{ type: 'message', ...text }, ...effects] };
}

function unchanged(state: OrderState): OrderTransition {
  return { state, effects: [] };
}

/** The initial state is serializable, deterministic, and contains no browser-specific values. */
export function createOrder(scaleId: string, kind: OrderKind, seed = 0, options: OrderOptions = {}): OrderState {
  const scale = buildScale(scaleId);
  const opts: OrderOptions = { guide: 'light', ...options };
  const state: OrderState = {
    scaleId,
    kind,
    seed,
    options: opts,
    slots: Array.from({ length: 8 }, emptySlot),
    cursor: 0,
    hintLevel: 0,
    wrongCount: 0,
    hintUsed: false,
    phase: 'building',
    nameSolved: [],
    message: { id: 'T-03', values: {} },
    wrongSlot: null,
    flashKeys: [],
    pairKeys: [],
    explainedBlack: false,
    latestHint: null,
    judgement: null,
    clean: true,
  };

  let initialId = opts.guide === 'full' ? 'T-01' : opts.guide === 'intro2' ? 'T-02' : 'T-03';
  let values: Record<string, unknown> = {};
  if (kind === 'fill') {
    const blanks = makeFill(scale, seed, opts.fillPassed ? 4 : 3);
    state.slots = scale.notes.map((_, i) => blanks.includes(i) ? emptySlot() : givenSlot(scale, i));
    state.cursor = firstEmpty(state.slots);
    initialId = 'T-45';
    values = { n: blanks.length, blanks };
  } else if (kind === 'fix') {
    const neighbor = opts.neighborLearned && seed % 2 === 0 ? neighborFix(scale) : null;
    const fault = neighbor ?? makeFix(scale, seed);
    state.slots = scale.notes.map((_, i) => givenSlot(scale, i));
    state.slots[fault.slot] = { key: fault.wrongKey, placement: place(scale, fault.slot, fault.wrongKey), given: false };
    state.fix = { slot: fault.slot, found: false, ...('source' in fault ? { source: fault.source } : {}) };
    state.cursor = 8;
    initialId = 'T-46';
    values = { source: neighbor?.source };
  } else if (kind === 'name') {
    state.slots = scale.notes.map((_, i) => givenSlot(scale, i));
    state.nameSlots = scale.notes.map((_, i) => nameChoice(scale, i) ? i : -1).filter((i) => i >= 0);
    state.nameCursor = 0;
    state.cursor = state.nameSlots[0] ?? 8;
    initialId = 'T-50';
  } else if (kind === 'challenge') {
    initialId = 'T-03';
    values = { challenge: true };
  } else {
    if (opts.guide === 'full') state.flashKeys = [0];
    if (scale.mode === 'minor' && opts.relativeLearned) {
      initialId = 'T-04';
      values = { relative: relativeOf(scaleId) };
    }
    const twin = twinOf(scaleId);
    if (twin && (scaleId === 'Gb' || scaleId === 'Ebm')) values = { ...values, twin };
  }
  state.message = message(state, initialId, values);
  return state;
}

export const startOrder = createOrder;

export function initialEffects(state: OrderState): OrderEffect[] {
  return [
    { type: 'message', ...state.message },
    ...(state.flashKeys.length ? [{ type: 'flash' as const, keys: state.flashKeys }] : []),
  ];
}

function guidedNext(state: OrderState, effects: OrderEffect[], completedSlot: number): OrderTransition {
  if (state.cursor >= 8) return withMessage(state, 'T-16', {}, effects);
  if (state.options.guide === 'full') {
    const scale = buildScale(state.scaleId);
    let id = 'T-10';
    let pairKeys: number[] = [];
    if (state.cursor === 3) id = 'T-11';
    if (state.cursor === 7) id = 'T-12';
    if (id === 'T-11' || id === 'T-12') {
      pairKeys = [keyFor(scale, state.cursor - 1), keyFor(scale, state.cursor)];
      effects = [...effects, { type: 'pair', keys: pairKeys }];
    }
    return withMessage({ ...state, pairKeys }, id, {}, effects);
  }
  const scale = buildScale(state.scaleId);
  return withMessage(state, 'T-14', {
    slot: completedSlot, k: completedSlot + 1,
    previous: completedSlot > 0 ? noteAt(scale, completedSlot - 1) : null,
    answer: noteAt(scale, completedSlot),
    need: completedSlot > 0 ? (scale.steps[completedSlot - 1] === 1 ? 'half' : 'whole') : null,
    nextK: state.cursor + 1, nextId: 'T-13',
  }, effects);
}

function wrongHint(state: OrderState, fromButton: boolean, effects: OrderEffect[] = []): OrderTransition {
  const scale = buildScale(state.scaleId);
  const cap = state.kind === 'learn' ? 3 : 1;
  const level = Math.min(cap, state.hintLevel + 1) as 1 | 2 | 3;
  const h = hint(scale, state.cursor, level);
  const newState = { ...state, hintLevel: level, hintUsed: state.hintUsed || fromButton, latestHint: h, flashKeys: h.targetKey === null ? [] : [h.targetKey] };
  const placed = state.slots[state.cursor]?.placement;
  const prev = state.slots[state.cursor - 1]?.placement;
  const diagnosis = placed && prev && state.cursor > 0 ? diagnose(prev.midi, placed.midi, scale.steps[state.cursor - 1] ?? 2) : null;
  const id = state.cursor === 0 ? 'T-24' : level === 1 ? (fromButton ? 'T-21' : 'T-20') : level === 2 ? 'T-22' : 'T-23';
  if (h.targetKey !== null) effects.push({ type: 'flash', keys: [h.targetKey] });
  if (level === 3 && h.name) effects.push({ type: 'tones', midis: [noteAt(scale, state.cursor).midi] });
  return withMessage(newState, id, { hint: h, diagnosis, pressed: placed?.name, fromButton }, effects);
}

export function tapKey(state: OrderState, keyIndex: number): OrderTransition {
  if (!Number.isInteger(keyIndex) || keyIndex < 0 || keyIndex > 12 || state.phase !== 'building') return unchanged(state);
  const scale = buildScale(state.scaleId);
  if (state.kind === 'name') return { state, effects: [{ type: 'tones', midis: [scale.tonicMidi + keyIndex] }] };
  if (state.kind === 'fix' && !state.fix?.found) return withMessage(state, 'T-46', { source: state.fix?.source }, [{ type: 'tones', midis: [scale.tonicMidi + keyIndex] }]);
  if (state.cursor >= 8) return { state, effects: [{ type: 'tones', midis: [scale.tonicMidi + keyIndex] }] };
  const slot = state.cursor;
  const current = state.slots[slot];
  if (!current) return unchanged(state);
  if (current.given || (state.kind !== 'challenge' && current.placement?.ok)) return unchanged(state);
  const p = place(scale, slot, keyIndex);
  const slots = state.slots.map((s, i) => i === slot ? { key: keyIndex, placement: p, given: false } : s);
  if (state.kind === 'challenge') {
    const next = { ...state, slots, cursor: firstEmpty(slots), hintLevel: 0 as const, wrongSlot: null, flashKeys: [], pairKeys: [], latestHint: null };
    const effects: OrderEffect[] = [{ type: 'tones', midis: [scale.tonicMidi + keyIndex] }, { type: 'highlight', slot, key: keyIndex }];
    return withMessage(next, next.cursor === 8 ? 'T-16' : 'T-13', { challenge: true }, effects);
  }
  const prev = state.slots[slot - 1]?.placement;
  if (!p.ok) {
    const midis = prev ? [prev.midi, p.midi] : [p.midi];
    return wrongHint({ ...state, slots, wrongCount: state.wrongCount + 1, clean: false, wrongSlot: slot }, false, [
      { type: 'tones', midis, gap: 0.32 },
      { type: 'shake', slot },
    ]);
  }
  const pairSound = prev && scale.steps[slot - 1] === 1;
  const effects: OrderEffect[] = [
    { type: 'tones', midis: pairSound && prev ? [prev.midi, p.midi] : [p.midi], gap: 0.32 },
    { type: 'highlight', slot, key: keyFor(scale, slot) },
  ];
  const next = {
    ...state,
    slots,
    cursor: state.kind === 'fix' ? 8 : firstEmpty(slots),
    hintLevel: 0 as const,
    wrongSlot: null,
    flashKeys: [],
    pairKeys: [],
    latestHint: null,
  };
  const n = noteAt(scale, slot);
  const isBlack = scale.tray.find((k) => k.pc === n.pc)?.black ?? false;
  const explain = n.alter !== 0 && ((!isBlack) || !state.explainedBlack);
  if (state.kind === 'learn' && explain) {
    const answer = { letter: n.letter, alter: n.alter };
    return withMessage({ ...next, explainedBlack: state.explainedBlack || isBlack }, 'T-15', {
      slot, k: slot + 1, answer, previous: slot ? noteAt(scale, slot - 1) : null,
      alternate: altName(answer), nextId: next.cursor === 8 ? 'T-16' : 'T-13', nextK: next.cursor + 1,
    }, effects);
  }
  return guidedNext(next, effects, slot);
}

export function tapSlot(state: OrderState, slot: number): OrderTransition {
  if (!Number.isInteger(slot) || slot < 0 || slot > 7 || state.phase === 'baking') return unchanged(state);
  const current = state.slots[slot];
  if (!current) return unchanged(state);
  const effects: OrderEffect[] = current.placement && current.key !== null ? [
    { type: 'tones', midis: [current.placement.midi] }, { type: 'highlight', slot, key: current.key },
  ] : [];
  if (state.phase === 'served') return { state, effects };
  if (state.kind === 'challenge') return withMessage({ ...state, cursor: slot, hintLevel: 0, flashKeys: [], pairKeys: [] }, 'T-13', { challenge: true }, effects);
  if (state.kind === 'fix') {
    if (state.fix?.found) return { state, effects };
    if (slot === state.fix?.slot) {
      return withMessage({ ...state, cursor: slot, fix: { ...state.fix, found: true }, wrongSlot: slot }, 'T-47', { found: true, slot, k: slot + 1 }, effects);
    }
    return withMessage({ ...state, wrongCount: state.wrongCount + 1, clean: false }, 'T-47', { found: false, slot, k: slot + 1 }, effects);
  }
  return { state, effects };
}

export function askHint(state: OrderState): OrderTransition {
  if (state.phase !== 'building' || state.kind === 'challenge' || state.kind === 'name' || state.cursor >= 8) return unchanged(state);
  return wrongHint(state, true);
}

export function canBake(state: OrderState): boolean {
  if (state.phase !== 'building') return false;
  if (state.kind === 'name') return state.nameSolved.length === (state.nameSlots?.length ?? 0);
  if (state.kind === 'fix') return state.fix?.found === true && state.slots.every((s) => s.placement?.ok === true);
  if (state.kind === 'challenge') return state.slots.every((s) => s.key !== null);
  return state.slots.every((s) => s.placement?.ok === true);
}

/** Bake only enters the animation phase. The UI calls serve once playback/animation ends. */
export function bake(state: OrderState): OrderTransition {
  if (!canBake(state)) return unchanged(state);
  const scale = buildScale(state.scaleId);
  if (state.kind === 'challenge') {
    const result = judge(scale, state.slots.map((s) => s.key ?? 0));
    if (!result.ok) {
      const slot = result.firstWrong;
      const cursor = Math.max(0, slot);
      return withMessage({ ...state, cursor, wrongCount: state.wrongCount + 1, clean: false, wrongSlot: cursor, judgement: result }, cursor === 0 ? 'T-24' : 'T-40', {
        judgement: result, first: result.first, pressed: state.slots[cursor]?.placement?.name,
        diagnosis: result.first?.before ?? result.first?.after,
      }, [{ type: 'shake', slot: cursor }]);
    }
  }
  const next: OrderState = { ...state, phase: 'baking', cursor: 8, wrongSlot: null, flashKeys: [], pairKeys: [], judgement: state.kind === 'challenge' ? judge(scale, state.slots.map((s) => s.key ?? 0)) : state.judgement };
  return {
    state: next,
    effects: [
      { type: 'sizzle' },
      { type: 'tones', midis: state.slots.map((s, i) => s.placement?.midi ?? noteAt(scale, i).midi), gap: 0.48, delay: 0.65 },
    ],
  };
}

/** Moves a baked order to its completion view; cannot bypass building/validation. */
export function serve(state: OrderState): OrderTransition {
  if (state.phase !== 'baking') return unchanged(state);
  const next: OrderState = { ...state, phase: 'served' };
  const id = state.kind === 'challenge' ? 'T-41' : state.options.guide === 'full' ? 'T-30' : state.options.guide === 'intro2' ? 'T-31' : 'T-32';
  return withMessage(next, id, { clean: state.wrongCount === 0, guide: state.options.guide }, [{ type: 'signature' }]);
}

export function currentNameChoices(state: OrderState): NoteName[] {
  if (state.kind !== 'name' || state.cursor >= 8) return [];
  const choice = nameChoice(buildScale(state.scaleId), state.cursor);
  if (!choice) return [];
  const random = mulberry32(state.seed);
  for (let i = 0; i < (state.nameCursor ?? 0); i++) random();
  return random() < 0.5 ? [choice.answer, choice.other] : [choice.other, choice.answer];
}

export function chooseName(state: OrderState, name: NameInput): OrderTransition {
  if (state.phase !== 'building' || state.kind !== 'name' || state.cursor >= 8) return unchanged(state);
  let picked: NoteName;
  try {
    picked = typeof name === 'string' ? parseNote(name.replaceAll('♯', '#').replaceAll('♭', 'b')) : name;
  } catch {
    return unchanged(state);
  }
  const scale = buildScale(state.scaleId);
  const choice = nameChoice(scale, state.cursor);
  if (!choice) return unchanged(state);
  if (noteText(picked) !== noteText(choice.answer)) {
    return withMessage({ ...state, wrongCount: state.wrongCount + 1, clean: false }, 'T-51', {
      answer: choice.answer, previous: noteAt(scale, state.cursor - 1), picked,
    }, [{ type: 'tones', midis: [noteAt(scale, state.cursor).midi] }]);
  }
  const slot = state.cursor;
  const nextCursor = (state.nameCursor ?? 0) + 1;
  const next: OrderState = {
    ...state,
    nameSolved: [...state.nameSolved, slot],
    nameCursor: nextCursor,
    cursor: state.nameSlots?.[nextCursor] ?? 8,
    wrongSlot: null,
  };
  return withMessage(next, 'T-52', {
    slot, k: slot + 1, answer: choice.answer, previous: noteAt(scale, slot - 1),
    nextId: next.cursor === 8 ? 'T-16' : 'T-50',
  }, [{ type: 'tones', midis: [noteAt(scale, slot).midi] }, { type: 'highlight', slot, key: keyFor(scale, slot) }]);
}

export function orderPassed(state: OrderState): boolean {
  return state.phase === 'served' && (state.kind === 'learn' || state.wrongCount === 0);
}

export function recordPatch(state: OrderState): Partial<StarRecord> {
  if (state.phase !== 'served') return {};
  if (state.kind === 'learn') return { learned: true };
  if (state.wrongCount > 0) return {};
  if (state.kind === 'challenge') return { challengeClean: true };
  return { [state.kind]: true };
}
