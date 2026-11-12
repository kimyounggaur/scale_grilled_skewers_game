import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSave, emptyRecord, loadSave, SAVE_KEY, saveSave, todayOrders } from '../../store/saveStore';
import { cancelAudio, midiToFrequency, playSequence, sequenceTimes, setSound } from '../../audio/engine';
import { formatMessage } from '../strings';
import { josa } from '../josa';

describe('기기 저장과 오늘의 주문', () => {
  it('저장 왕복과 손상된 데이터는 기본값으로 복구한다', () => {
    const save = defaultSave(); save.records.C = { ...emptyRecord(), learned: true };
    expect(loadSave(JSON.stringify(save))).toEqual(save);
    for (const invalid of ['{broken', '{}', 'null', JSON.stringify({ ...save, v: 2 }), JSON.stringify({ ...save, records: { C: { ...emptyRecord(), learned: 'yes' } } })]) expect(loadSave(invalid)).toEqual(defaultSave());
  });
  it('차단된 저장소에서도 읽기와 쓰기가 앱을 멈추지 않는다', () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadSave(undefined, blocked)).toEqual(defaultSave());
    expect(saveSave(defaultSave(), blocked)).toBe(false);
    const setItem = vi.fn(); expect(saveSave(defaultSave(), { getItem: () => null, setItem })).toBe(true);
    expect(setItem).toHaveBeenCalledWith(SAVE_KEY, JSON.stringify(defaultSave()));
  });
  it('열린 음계 중 별이 적은 것부터 고르고 동률이면 코스 순서를 쓴다', () => {
    const save = defaultSave();
    expect(todayOrders(save)).toEqual([{ scaleId: 'C', kind: 'learn' }]);
    save.records.C = { ...emptyRecord(), learned: true };
    expect(todayOrders(save)).toEqual([{ scaleId: 'F', kind: 'learn' }, { scaleId: 'C', kind: 'challenge' }]);
    save.settings.unlock = 'all';
    expect(todayOrders(save)).toEqual([{ scaleId: 'F', kind: 'learn' }, { scaleId: 'G', kind: 'learn' }, { scaleId: 'Bb', kind: 'learn' }]);
  });
});

describe('표기와 안내', () => {
  it('R-62 변화표를 읽는 소리에 맞춰 조사를 고른다', () => {
    expect(josa('B♭', '을/를', 'en')).toBe('을');
    expect(josa('C', '으로/로', 'en')).toBe('로');
    expect(josa('내림나(B♭)', '을/를', 'both')).toBe('를');
  });
  it('이름표 오답은 소리는 맞다는 말로 시작하고 표기에 맞춰 이유를 설명한다', () => {
    const values = { scaleId: 'F', slot: 3, answer: { letter: 'B', alter: -1 }, previous: { letter: 'A', alter: 0 } };
    expect(formatMessage('T-51', values, 'both')).toBe('소리는 맞아요. 하지만 가 다음 이름은 나라서 내림나(B♭)라고 써요.');
    expect(formatMessage('T-51', values, 'en')).toContain('A 다음 글자는 B');
    expect(formatMessage('T-33', { scaleId: 'F' })).toBe('조표 ♭ 1개');
  });
});

describe('소리 예약', () => {
  afterEach(() => { cancelAudio(); vi.useRealTimers(); setSound(true); });
  it('음높이 주파수와 굽기 예약 간격이 맞다', () => {
    expect(midiToFrequency(69)).toBe(440);
    expect(midiToFrequency(60)).toBeCloseTo(261.6256, 3);
    expect(sequenceTimes(3, true)).toEqual([650, 1130, 1610]);
  });
  it('소리가 없어도 강조가 진행되고 재생 취소는 대기 중인 결과를 끝낸다', async () => {
    vi.useFakeTimers(); setSound(false);
    const steps = vi.fn(), first = playSequence([60, 62], steps);
    await vi.advanceTimersByTimeAsync(0); expect(steps).toHaveBeenCalledWith(0);
    const second = playSequence([65], steps, true);
    expect(await first).toBe(false);
    await vi.runAllTimersAsync(); expect(await second).toBe(true);
    expect(steps).toHaveBeenLastCalledWith(-1);
  });
});
