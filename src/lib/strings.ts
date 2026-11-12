import { altName, buildScale, noteKo, noteLabel, parseNote, scaleLabel, type Letter, type NoteName, type Notation } from '../game';
import { withJosa } from './josa';

export const ORDER_LABELS = { learn: '배우기', challenge: '도전', fill: '빈자리 채우기', fix: '고쳐 굽기', name: '이름표 달기' } as const;
export const UI = {
  title: '음계 꼬치구이', subtitle: '음으로 만드는 맛있는 한 꼬치', start: '처음 시작', today: '오늘의 주문', menu: '메뉴판', settings: '설정', help: '도움말',
  hint: '힌트', bake: '굽기', replay: '다시 듣기', next: '다음', home: '홈으로', teacher: '선생님용',
} as const;
export type MessageValues = Record<string, unknown>;
const letters: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
function asNote(value: unknown): NoteName | undefined {
  if (typeof value === 'string') { try { return parseNote(value); } catch { return undefined; } }
  if (value && typeof value === 'object' && 'letter' in value && 'alter' in value && letters.includes(value.letter as Letter) && [-1, 0, 1].includes(value.alter as number)) return value as NoteName;
  return undefined;
}
export function displayScale(id: string, notation: Notation = 'both'): string {
  return notation === 'en' ? scaleLabel(id, 'en') : notation === 'ko' ? scaleLabel(id, 'ko') + ' 음계' : scaleLabel(id, 'ko') + '(' + scaleLabel(id, 'short') + ') 음계';
}
export function signatureLabel(scaleId: string): string {
  const signature = buildScale(scaleId).keySig;
  return signature.count ? `조표 ${signature.type === 'flat' ? '♭' : '♯'} ${signature.count}개` : '조표 없음';
}

/** T-xx content stays here; the state machine supplies facts rather than UI copy. */
export function formatMessage(id: string, values: MessageValues = {}, notation: Notation = 'both', scaleId = 'C'): string {
  const actualId = typeof values.scaleId === 'string' ? values.scaleId : scaleId;
  const scale = buildScale(actualId);
  const slot = typeof values.slot === 'number' ? Math.min(7, Math.max(0, values.slot)) : typeof values.k === 'number' ? Math.min(7, Math.max(0, values.k - 1)) : 0;
  const answer = asNote(values.answer) ?? scale.notes[slot] ?? scale.tonic;
  const previous = asNote(values.previous) ?? scale.notes[Math.max(0, slot - 1)] ?? scale.tonic;
  const pressed = asNote(values.pressed) ?? answer;
  const tonic = noteLabel(scale.tonic, notation), correct = noteLabel(answer, notation), prev = noteLabel(previous, notation), tap = noteLabel(pressed, notation);
  const k = typeof values.k === 'number' ? values.k : slot + 1;
  const half = values.need === 'half' || (values.need === undefined && scale.steps[slot - 1] === 1);
  const interval = half ? '반음' : '온음', move = half ? '바로 옆 건반' : '건반 두 칸';
  const title = displayScale(actualId, notation);
  const letterWord = notation === 'en' ? '글자' : '이름';
  const prevLetter = notation === 'en' ? previous.letter : noteKo({ letter: previous.letter, alter: 0 });
  const correctLetter = notation === 'en' ? answer.letter : noteKo({ letter: answer.letter, alter: 0 });
  const diagnosis = values.diagnosis && typeof values.diagnosis === 'object' ? values.diagnosis as { kind?: string; semitones?: number } : undefined;
  const distance = diagnosis?.kind === 'half' ? '반음' : diagnosis?.kind === 'whole' ? '온음' : `건반 ${diagnosis?.semitones ?? 0}칸`;
  const diagnosticText = diagnosis?.kind === 'notHigher' ? `${withJosa(tap, '은/는', notation)} ${prev}보다 높지 않아요.` : `${prev}에서 ${tap}까지는 ${distance}이에요.`;
  let result: string;
  switch (id) {
    case 'T-01': result = `${tonic}에서 시작해 높은 ${tonic}까지 올라가요. 아래 건반에서 ${tonic} 재료를 눌러 보세요.`; break;
    case 'T-02': result = `시작음이 달라져도 간격은 같아요. ${tonic}에서 출발해 같은 순서로 꽂아 보세요.`; break;
    case 'T-03': result = values.challenge ? `${title}의 간격을 떠올려 8자리를 꽂아 보세요. 굽기를 누르면 확인해요.` : `${tonic}에서 시작해요. 아래 건반에서 ${tonic} 재료를 눌러 첫 자리에 꽂아 보세요.`; break;
    case 'T-04': result = `${displayScale(typeof values.relative === 'string' ? values.relative : 'C', notation)}와 같은 재료를 써요. 점 찍힌 재료로 ${tonic}부터 꽂아 보세요.`; break;
    case 'T-10': result = `${k}번째 자리는 ${interval}. ${prev}에서 ${move}으로 올라가요.${k === 2 ? ' 검은건반도 한 칸으로 세요.' : ''}`; break;
    case 'T-11': result = `이번에는 반음! ${prev}와 ${correct} 사이에는 다른 건반이 없어요. 바로 옆 건반으로 가요.`; break;
    case 'T-12': result = `마지막도 반음! ${prev} 바로 옆 건반, 높은 ${withJosa(tonic, '으로/로', notation)} 올라가요.`; break;
    case 'T-13': result = values.challenge ? `${k}번째 자리를 골랐어요. 다른 재료로 바꿀 수 있어요.` : `${k}번째 자리예요. 위쪽 간격 표시를 보고 골라 보세요.`; break;
    case 'T-14': result = `${values.previous === null ? '좋아요!' : `${prev}–${correct} ${interval} ✓`} ${typeof values.nextK === 'number' ? values.nextK : k}번째 자리예요. 위쪽 간격 표시를 보고 골라 보세요.`; break;
    case 'T-15': result = `${k}번째 음은 ${correct}! ${prevLetter} 다음 ${letterWord} ${withJosa(correctLetter, '을/를', notation)} 써서 ${withJosa(correct, '이라고/라고', notation)} 해요. (${withJosa(noteLabel(asNote(values.alternate) ?? altName(answer), notation), '과/와', notation)} 같은 건반)`; break;
    case 'T-16': result = '다 꽂았어요! 굽기를 눌러 꼬치를 구워 보세요.'; break;
    case 'T-20': result = `${diagnosticText} 여기는 ${interval} 자리! ${interval}은 ${move}이에요.`; break;
    case 'T-21': result = `${k}번째 자리는 ${interval}! ${interval}은 ${move}이에요.`; break;
    case 'T-22': result = `${prev}에서 ${move}을 찾아보세요. 반짝이는 건반이에요.`; break;
    case 'T-23': result = `정답은 ${correct}! 반짝이는 건반을 눌러 꽂아 보세요.`; break;
    case 'T-24': result = values.fromButton ? `첫 자리는 으뜸음 ${tonic}! 반짝이는 건반을 눌러 보세요.` : `${withJosa(title, '은/는', notation)} ${tonic}에서 시작해요. ${tonic} 재료를 찾아 눌러 보세요.`; break;
    case 'T-30': result = `${title} 완성! 3→4번째, 7→8번째 자리가 반음이었어요. (미–파, 시–도)`; break;
    case 'T-31': result = `${title} 완성! ${noteLabel(scale.notes[2] ?? scale.tonic, notation)} 다음에 ${withJosa(noteLabel(scale.notes[3] ?? scale.tonic, notation), '을/를', notation)} 넣어 반음을 만들었어요. 간격은 다장조(C) 음계와 같아요.`; break;
    case 'T-32': result = `${title} 완성! ${scale.keySig.count ? signatureLabel(actualId) + '.' : '조표는 없어요.'} 반음은 ${scale.mode === 'major' ? '3→4번째, 7→8번째 자리 (미–파, 시–도)' : '2→3번째, 5→6번째 자리 (시–도, 미–파)'}예요.`; break;
    case 'T-33': result = signatureLabel(actualId); break;
    case 'T-40': result = `${k}번째 자리를 다시 볼까요? ${diagnosticText} 여기는 ${interval} 자리예요.`; break;
    case 'T-41': result = values.clean === false ? `${title} 꼬치 완성! 다음에는 한 번에 구워 봐요.` : `한 번에 통과! ${title} 꼬치 완성이에요.`; break;
    case 'T-45': result = `빈자리 ${typeof values.n === 'number' ? values.n : 3}곳을 채워 ${title} 꼬치를 완성해 보세요.`; break;
    case 'T-46': result = typeof values.source === 'string' ? `${displayScale(values.source, notation)} 재료를 그대로 꽂았더니 한 군데가 달라요. 찾아서 눌러 보세요.` : `${title} 꼬치에 잘못 꽂힌 재료가 하나 있어요. 찾아서 눌러 보세요.`; break;
    case 'T-47': result = values.found ? `맞아요, ${k}번째 자리예요. 여기는 ${interval} 자리! 알맞은 재료로 바꿔 보세요.` : `${k}번째 자리는 맞게 꽂혀 있어요. 앞뒤 간격을 들어 보고 다시 찾아보세요.`; break;
    case 'T-50': result = '소리는 다 맞아요. 빈 이름표에 알맞은 이름을 골라 보세요.'; break;
    case 'T-51': result = `소리는 맞아요. 하지만 ${prevLetter} 다음 ${notation === 'en' ? '글자는' : '이름은'} ${correctLetter}라서 ${withJosa(correct, '이라고/라고', notation)} 써요.`; break;
    case 'T-52': result = `${correct}! ${prevLetter} 다음이니까 ${withJosa(correctLetter, '을/를', notation)} 써요.`; break;
    case 'T-60': result = '장음계는 온음–온음–반음–온음–온음–온음–반음이에요. 어떤 음에서 시작하든 이 순서로 재료를 고르면 장음계가 돼요.'; break;
    case 'T-61': result = `${displayScale(typeof values.twin === 'string' ? values.twin : 'F#', notation)} 꼬치와 건반은 똑같아요. 이름표만 달라요.`; break;
    case 'T-70': result = '소리가 들리지 않으면 휴대폰 볼륨과 무음 설정을 확인하세요. 소리 없이도 끝까지 할 수 있어요.'; break;
    default: result = '재료를 골라 음계 꼬치를 만들어 보세요.';
  }
  if (typeof values.twin === 'string' && id !== 'T-61') result += ' ' + formatMessage('T-61', values, notation, actualId);
  return result;
}
