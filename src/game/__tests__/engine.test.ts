import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildScale, place, parseNote, ledgerLines } from '../index';

describe('기획서 R-10~R-62 규칙 엔진', () => {
  it('독립 Python 정답 자료 5,277건을 원본 대조기로 모두 확인한다', () => {
    const output = execFileSync(process.execPath, [
      '--import', 'tsx',
      resolve('docs/reference/check-golden.mts'),
      resolve('src/game/index.ts'),
    ], { encoding: 'utf8', timeout: 30000 });
    expect(output).toContain('검증 자료 5277건 모두 일치');
  });

  it('잘못된 입력은 조용히 잘못 계산하지 않는다', () => {
    expect(() => parseNote('H')).toThrow();
    expect(() => parseNote('C##')).toThrow();
    expect(() => place(buildScale('C'), 8, 0)).toThrow();
    expect(() => place(buildScale('C'), 0, 13)).toThrow();
  });

  it('낮은 으뜸음도 마지막 자리에서는 높은 으뜸음으로 맞춘다', () => {
    const scale = buildScale('F#');
    expect(place(scale, 7, 0)).toMatchObject({ ok: true, midi: scale.tonicMidi + 12 });
    expect(ledgerLines(41)).toEqual([40]);
  });
});
