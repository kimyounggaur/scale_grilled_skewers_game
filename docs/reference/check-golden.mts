/**
 * 검증 자료 대조 스크립트.
 * 실행: npx tsx check-golden.mts            (같은 폴더의 engine.reference.ts 를 검사)
 *       npx tsx check-golden.mts ../../src/game/index.ts   (앱의 엔진을 검사. 같은 이름의 함수를 내보내야 한다)
 * 앱에서는 이 대조를 Vitest 테스트로 옮겨 쓴다.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type AnyRec = Record<string, any>;
const here = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : join(here, 'engine.reference.ts');
const E: AnyRec = await import(pathToFileURL(target).href);
const G: AnyRec = JSON.parse(readFileSync(join(here, 'skewer_golden_v1.json'), 'utf8'));

let checked = 0;
const fails: string[] = [];
function eq(label: string, got: unknown, want: unknown): void {
  checked++;
  if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}\n   나온 값: ${JSON.stringify(got)}\n   정답:    ${JSON.stringify(want)}`);
}
const nt = (n: AnyRec | null): string | null => (n ? E.noteText(n) : null);
const counts: Record<string, number> = {};
const section = (name: string, before: number): void => { counts[name] = checked - before; };

// 1. 음계
let c0 = checked;
for (const [id, w] of Object.entries<AnyRec>(G.scales)) {
  const s = E.buildScale(id);
  eq(`음계 ${id} 기본`, [s.mode, E.noteText(s.tonic), s.tonicMidi, s.signed, s.steps, s.solfege], [w.mode, w.tonic, w.tonicMidi, w.signed, w.steps, w.solfege]);
  eq(`음계 ${id} 음`, s.notes.map((n: AnyRec) => ({ name: E.noteText(n), midi: n.midi, step: n.step, ledger: n.ledger, ko: E.noteKo(n), en: E.noteEn(n) })), w.notes);
  eq(`음계 ${id} 음높이 종류·자리 번호`, s.notes.map((n: AnyRec) => [n.pc, n.degree]), w.notes.map((n: AnyRec, i: number) => [n.midi % 12, i + 1]));
  eq(`음계 ${id} 조표`, s.keySig, w.keySig);
  eq(`음계 ${id} 재료 건반`, s.tray.map((k: AnyRec) => ({ midi: k.midi, black: k.black, names: k.names.map(E.noteText) })), w.tray);
  eq(`음계 ${id} 건반 번호·끝 건반`, s.tray.map((k: AnyRec) => [k.index, k.top, k.pc]), w.tray.map((k: AnyRec, i: number) => [i, i === 12, k.midi % 12]));
  eq(`음계 ${id} 이름`, { ko: E.scaleLabel(id, 'ko'), en: E.scaleLabel(id, 'en'), short: E.scaleLabel(id, 'short') }, w.labels);
  eq(`음계 ${id} 관계`, [E.relativeOf(id), E.neighborOf(id), E.twinOf(id), E.hasNameSlots(s)], [w.relative, w.neighbor, w.twin, w.hasNameSlots]);
}
eq('코스', { basic: E.COURSE.basic, challengeMajor: E.COURSE.challengeMajor, challengeMinor: E.COURSE.challengeMinor, twins: E.COURSE.twins, engineOnly: E.COURSE.engineOnly }, G.course);
eq('조표 자리', E.KEY_SIG_STEPS, G.keySigSteps);
section('음계', c0);

// 2. 자리 판정
c0 = checked;
for (const [id, rows] of Object.entries<string[][]>(G.place)) {
  const s = E.buildScale(id);
  rows.forEach((row, slot) => row.forEach((want, key) => {
    const p = E.place(s, slot, key);
    eq(`자리 판정 ${id} ${slot + 1}번째 자리 건반 ${key}`, `${p.ok ? 1 : 0}|${E.noteText(p.name)}|${p.midi}|${p.step}`, want);
  }));
}
section('자리 판정', c0);

// 3. 간격 진단
c0 = checked;
for (const [prev, cur, need, kind, match] of G.diagnose as [number, number, number, string, boolean][]) {
  const d = E.diagnose(prev, cur, need);
  eq(`간격 진단 ${cur - prev}칸, 필요 ${need}`, [d.semitones, d.kind, d.match], [cur - prev, kind, match]);
}
section('간격 진단', c0);

// 4. 힌트
c0 = checked;
for (const [id, rows] of Object.entries<any[][]>(G.hint)) {
  const s = E.buildScale(id);
  rows.forEach((levels, slot) => levels.forEach((want: any[], li: number) => {
    const h = E.hint(s, slot, li + 1);
    eq(`힌트 ${id} ${slot + 1}번째 자리 ${li + 1}단계`, [h.kind, h.need, h.targetKey, nt(h.name)], want);
  }));
}
section('힌트', c0);

// 5. 굽기 판정
c0 = checked;
for (const w of G.judge as AnyRec[]) {
  const j = E.judge(E.buildScale(w.scale), w.keys);
  const side = (x: AnyRec | null): any[] | null => (x ? [x.semitones, x.kind, x.need] : null);
  eq(`굽기 판정 ${w.scale} ${w.keys.join(',')}`,
    { ok: j.ok, slots: j.slots.map((b: boolean) => (b ? '1' : '0')).join(''), firstWrong: j.firstWrong, wrongCount: j.wrongCount, first: j.first ? { slot: j.first.slot, before: side(j.first.before), after: side(j.first.after) } : null },
    { ok: w.ok, slots: w.slots, firstWrong: w.firstWrong, wrongCount: w.wrongCount, first: w.first });
}
section('굽기 판정', c0);

// 6. 이름표 달기
c0 = checked;
for (const [id, rows] of Object.entries<(AnyRec | null)[]>(G.nameChoice)) {
  const s = E.buildScale(id);
  rows.forEach((want, slot) => {
    const c = E.nameChoice(s, slot);
    eq(`이름표 ${id} ${slot + 1}번째 자리`, c ? { answer: E.noteText(c.answer), other: E.noteText(c.other), prevLetter: c.prevLetter, letter: c.letter } : null, want);
  });
}
section('이름표 달기', c0);

// 7. 난수와 주문 만들기
c0 = checked;
for (const [seed, want] of G.rng as [number, number[]][]) {
  const r = E.mulberry32(seed);
  eq(`난수 씨앗 ${seed}`, want.map(() => Math.floor(r() * 1e9)), want);
}
for (const w of G.fill as AnyRec[]) eq(`빈자리 ${w.scale} 씨앗 ${w.seed} ${w.blanks}칸`, E.makeFill(E.buildScale(w.scale), w.seed, w.blanks), w.expect);
for (const w of G.fix as AnyRec[]) {
  const f = E.makeFix(E.buildScale(w.scale), w.seed);
  eq(`고쳐 굽기 ${w.scale} 씨앗 ${w.seed}`, { slot: f.slot, wrongKey: f.wrongKey, wrongName: E.noteText(f.wrongName), kind: f.kind }, { slot: w.slot, wrongKey: w.wrongKey, wrongName: w.wrongName, kind: w.kind });
}
for (const [id, want] of Object.entries<AnyRec | null>(G.neighborFix)) {
  const f = E.neighborFix(E.buildScale(id));
  eq(`이웃 꼬치 ${id}`, f ? { source: f.source, slot: f.slot, wrongKey: f.wrongKey, wrongName: E.noteText(f.wrongName) } : null, want);
}
section('난수·주문 만들기', c0);

// 8. 별과 잠금
c0 = checked;
for (const w of G.stars as AnyRec[]) eq(`별 ${w.scale} ${JSON.stringify(w.record)}`, E.stars(w.record, E.buildScale(w.scale)), w.expect);
for (const w of G.unlock as AnyRec[]) {
  const got: Record<string, boolean> = {};
  for (const id of Object.keys(w.expect)) got[id] = E.isUnlocked(id, w.progress, w.setting);
  eq(`잠금 ${w.setting} ${JSON.stringify(w.progress)}`, got, w.expect);
}
section('별·잠금', c0);

console.log(Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' | '));
if (fails.length > 0) {
  console.log(`\n불일치 ${fails.length}건 (처음 10건)\n` + fails.slice(0, 10).join('\n'));
  process.exit(1);
}
console.log(`검증 자료 ${checked}건 모두 일치`);
