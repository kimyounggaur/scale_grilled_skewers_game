import type { StarRecord, Scale, UnlockSetting } from './types';
import { COURSE, TWIN_IDS, TWIN_OF } from './data';
import { hasNameSlots } from './names';
/** 별: 1 = 배우기 완성, 2 = 도전 주문을 한 번에 통과, 3 = 응용 주문(빈자리·고쳐 굽기·이름표)까지 통과 */
export function stars(record: StarRecord, scale: Scale): 0 | 1 | 2 | 3 {
  if (!record.learned) return 0;
  if (!record.challengeClean) return 1;
  if (record.fill && record.fix && (record.name || !hasNameSlots(scale))) return 3;
  return 2;
}

const CONTENT_IDS: readonly string[] = [...COURSE.basic, ...COURSE.challengeMajor, ...COURSE.challengeMinor, ...TWIN_IDS];

/**
 * 잠금: progress 는 음계 id → 별 수.
 * - all: 메뉴의 음계 전부 열림.
 * - 기본 코스는 앞 음계가 별 1개 이상이면 열림(첫 음계는 항상 열림).
 * - basicOnly: 기본 코스만. sequence: 기본 코스를 모두 마치면 도전 코스가 열리고, 쌍둥이는 짝이 별 1개 이상일 때 열림.
 */
export function isUnlocked(id: string, progress: Readonly<Record<string, number>>, setting: UnlockSetting): boolean {
  if (!CONTENT_IDS.includes(id)) return false;
  if (setting === 'all') return true;
  const got = (x: string): number => progress[x] ?? 0;
  const basic: readonly string[] = COURSE.basic;
  const at = basic.indexOf(id);
  if (at >= 0) {
    const prev = basic[at - 1];
    return at === 0 || (prev !== undefined && got(prev) >= 1);
  }
  if (setting === 'basicOnly') return false;
  const basicDone = basic.every((b) => got(b) >= 1);
  if (TWIN_IDS.includes(id)) {
    const twin = TWIN_OF[id];
    return basicDone && twin !== undefined && got(twin) >= 1;
  }
  return basicDone;
}
