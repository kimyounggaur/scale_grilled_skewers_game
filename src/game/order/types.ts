import type { Hint, Judgement, NoteName, Placement } from '../index';

export type OrderKind = 'learn' | 'challenge' | 'fill' | 'fix' | 'name';
export type GuideMode = 'full' | 'intro2' | 'light';

export interface OrderOptions {
  guide?: GuideMode;
  fillPassed?: boolean;
  neighborLearned?: boolean;
  relativeLearned?: boolean;
}

export interface SlotState {
  key: number | null;
  placement: Placement | null;
  given: boolean;
}

export interface OrderMessage {
  id: string;
  values: Record<string, unknown>;
}

export type OrderEffect =
  | ({ type: 'message' } & OrderMessage)
  | { type: 'tones'; midis: number[]; gap?: number; delay?: number }
  | { type: 'highlight'; slot: number; key: number }
  | { type: 'flash'; keys: number[] }
  | { type: 'pair'; keys: number[] }
  | { type: 'shake'; slot: number }
  | { type: 'sizzle' }
  | { type: 'signature' };

export type Effect = OrderEffect;

export interface OrderState {
  scaleId: string;
  kind: OrderKind;
  seed: number;
  options: OrderOptions;
  slots: SlotState[];
  cursor: number;
  hintLevel: 0 | 1 | 2 | 3;
  wrongCount: number;
  hintUsed: boolean;
  phase: 'building' | 'baking' | 'served';
  fix?: { slot: number; found: boolean; source?: string };
  nameSlots?: number[];
  nameCursor?: number;
  nameSolved: number[];
  message: OrderMessage;
  wrongSlot: number | null;
  flashKeys: number[];
  pairKeys: number[];
  explainedBlack: boolean;
  latestHint: Hint | null;
  judgement: Judgement | null;
  /** The completion patch is earned after baking, even when an exercise had corrections. */
  clean: boolean;
}

export interface OrderTransition {
  state: OrderState;
  effects: OrderEffect[];
}

export type NameInput = NoteName | string;
