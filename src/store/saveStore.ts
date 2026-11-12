'use client';

import { create } from 'zustand';
import { COURSE, buildScale, hasNameSlots, isUnlocked, stars, type Notation, type StarRecord, type UnlockSetting } from '../game';

export type OrderKind = 'learn' | 'challenge' | 'fill' | 'fix' | 'name';
export const ORDER_KINDS: readonly OrderKind[] = ['learn', 'challenge', 'fill', 'fix', 'name'];
export const SAVE_KEY = 'scale-skewer:v1';
export const CONTENT_IDS: readonly string[] = [...COURSE.basic, ...COURSE.challengeMajor, ...COURSE.challengeMinor, ...Object.values(COURSE.twins)];
export type SavedRecord = StarRecord & { plays: Record<OrderKind, number> };
export interface SaveSettings {
  notation: Notation; solfege: boolean; sound: boolean; unlock: UnlockSetting;
  hints: boolean; motion: 'system' | 'reduce'; largeText: boolean; theme: 'system' | 'light' | 'dark';
}
export interface SaveV1 { v: 1; records: Record<string, SavedRecord>; settings: SaveSettings; introDone: boolean }
export const DEFAULT_SETTINGS: SaveSettings = { notation: 'both', solfege: true, sound: true, unlock: 'sequence', hints: true, motion: 'system', largeText: false, theme: 'system' };
export function emptyRecord(): SavedRecord {
  return { learned: false, challengeClean: false, fill: false, fix: false, name: false, plays: { learn: 0, challenge: 0, fill: 0, fix: 0, name: 0 } };
}
export function defaultSave(): SaveV1 { return { v: 1, records: {}, settings: { ...DEFAULT_SETTINGS }, introDone: false }; }
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const flags: readonly (keyof StarRecord)[] = ['learned', 'challengeClean', 'fill', 'fix', 'name'];
function validateSave(value: unknown): SaveV1 {
  if (!isObject(value) || value.v !== 1 || !isObject(value.records) || !isObject(value.settings) || typeof value.introDone !== 'boolean') return defaultSave();
  const settings = value.settings;
  if (!['both', 'ko', 'en'].includes(String(settings.notation)) || !['sequence', 'basicOnly', 'all'].includes(String(settings.unlock)) || !['system', 'reduce'].includes(String(settings.motion)) || !['solfege', 'sound', 'hints'].every(k => typeof settings[k] === 'boolean')) return defaultSave();
  const records: SaveV1['records'] = {};
  for (const [id, raw] of Object.entries(value.records)) {
    if (!CONTENT_IDS.includes(id)) continue;
    if (!isObject(raw) || !flags.every(k => typeof raw[k] === 'boolean') || !isObject(raw.plays)) return defaultSave();
    const record = emptyRecord();
    for (const key of flags) record[key] = raw[key] === true;
    for (const kind of ORDER_KINDS) {
      const count = raw.plays[kind];
      if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) return defaultSave();
      record.plays[kind] = count;
    }
    records[id] = record;
  }
  return { v: 1, records, introDone: value.introDone, settings: {
    notation: settings.notation as Notation, solfege: settings.solfege === true, sound: settings.sound === true,
    unlock: settings.unlock as UnlockSetting, hints: settings.hints === true, motion: settings.motion as SaveSettings['motion'],
    largeText: settings.largeText === true, theme: ['light', 'dark'].includes(String(settings.theme)) ? settings.theme as 'light' | 'dark' : 'system',
  } };
}
function browserStorage(): StorageLike | undefined { try { return typeof window === 'undefined' ? undefined : window.localStorage; } catch { return undefined; } }
export function loadSave(raw?: string | null, storage?: StorageLike): SaveV1 {
  try { const text = raw === undefined ? (storage ?? browserStorage())?.getItem(SAVE_KEY) : raw; return text ? validateSave(JSON.parse(text)) : defaultSave(); } catch { return defaultSave(); }
}
export function saveSave(save: SaveV1, storage?: StorageLike): boolean {
  try { const target = storage ?? browserStorage(); if (!target) return false; target.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; }
}
export function progressOf(save: SaveV1): Record<string, number> {
  return Object.fromEntries(CONTENT_IDS.map(id => [id, stars(save.records[id] ?? emptyRecord(), buildScale(id))]));
}
export function todayOrders(save: SaveV1): { scaleId: string; kind: OrderKind }[] {
  const progress = progressOf(save);
  return CONTENT_IDS.map((scaleId, index) => ({ scaleId, index, count: progress[scaleId] ?? 0 }))
    .filter(x => isUnlocked(x.scaleId, progress, save.settings.unlock))
    .sort((a, b) => a.count - b.count || a.index - b.index).slice(0, 3)
    .map(({ scaleId }) => {
      const record = save.records[scaleId] ?? emptyRecord();
      const kind: OrderKind = !record.learned ? 'learn' : !record.challengeClean ? 'challenge' : !record.fill ? 'fill' : !record.fix ? 'fix' : hasNameSlots(buildScale(scaleId)) && !record.name ? 'name' : 'challenge';
      return { scaleId, kind };
    });
}
interface SaveStore {
  save: SaveV1; hydrated: boolean; storageAvailable: boolean;
  hydrate: () => void;
  updateSettings: (settings: Partial<SaveSettings>) => void;
  completeOrder: (id: string, kind: OrderKind, patch: Partial<StarRecord>) => void;
  finishIntro: () => void;
  resetRecords: () => void;
}
export const useSaveStore = create<SaveStore>((set, get) => {
  const commit = (save: SaveV1) => set({ save, storageAvailable: saveSave(save) });
  return {
    save: defaultSave(), hydrated: false, storageAvailable: true,
    hydrate: () => { if (!get().hydrated) set({ save: loadSave(), hydrated: true, storageAvailable: browserStorage() !== undefined }); },
    updateSettings: patch => { const save = get().save; commit({ ...save, settings: { ...save.settings, ...patch } }); },
    completeOrder: (id, kind, patch) => {
      if (!CONTENT_IDS.includes(id)) return;
      const save = get().save, before = save.records[id] ?? emptyRecord();
      const record: SavedRecord = { ...before, plays: { ...before.plays, [kind]: before.plays[kind] + 1 } };
      for (const flag of flags) record[flag] = before[flag] || patch[flag] === true;
      commit({ ...save, records: { ...save.records, [id]: record } });
    },
    finishIntro: () => { const save = get().save; const records = { ...save.records }; for (const id of ['C', 'F']) records[id] = { ...(records[id] ?? emptyRecord()), learned: true }; commit({ ...save, records, introDone: true }); },
    resetRecords: () => { const save = get().save; commit({ ...save, records: {}, introDone: false }); },
  };
});
