import type { Scale, Notation } from '../game';
import { noteLabel } from '../game';
import { Ingredient } from '../art';
import { NoteLabel } from './NoteLabel';
import type { VisualSlot } from './types';

export interface SkewerProps {
  scale: Scale; slots: VisualSlot[]; cursor: number; kind?: string; notation?: Notation;
  solfege?: boolean; phase?: string; active?: number; onSlot?: (slot: number) => void;
  revealed?: number[]; hiddenSlots?: number[]; errorSlot?: number;
}
export function Skewer({ scale, slots, cursor, kind = 'learn', notation = 'both', solfege = true, phase = 'building', active = -1, onSlot, revealed = [], hiddenSlots, errorSlot = -1 }: SkewerProps) {
  const final = phase === 'served';
  return <section className={`ss-skewer ${final ? 'ss-baked' : ''}`} aria-label="음계 꼬치" data-testid="skewer">
    {kind !== 'challenge' && <div className="ss-intervals" aria-label="음계의 간격">
      {scale.steps.map((step, i) => {
        const before = slots[i]?.placement, after = slots[i + 1]?.placement;
        const complete = before && after;
        const bad = (kind === 'learn' || kind === 'fill') && complete && after.midi - before.midi !== step;
        return <span key={i} className={`ss-interval ${step === 1 ? 'ss-half' : 'ss-whole'} ${complete ? 'ss-complete' : ''} ${bad ? 'ss-bad' : ''}`}>{step === 1 ? '반음' : '온음'}</span>;
      })}
    </div>}
    <div className="ss-slots">
      <div className="ss-stick" aria-hidden="true" />
      {slots.map((slot, i) => {
        const p = slot.placement;
        const hidden = hiddenSlots?.includes(i) ?? (kind === 'name' && i > 0 && i < 7 && !!scale.notes[i]?.alter && !revealed.includes(i));
        const bad = i === errorSlot || ((kind === 'learn' || kind === 'fill') && p && !p.ok);
        const label = `${i + 1}번째 자리${p ? `, ${hidden ? '이름표를 골라 주세요' : noteLabel(p.name, notation)}` : ', 비어 있음'}${slot.given && kind !== 'fix' ? ', 처음 주어진 재료' : ''}${i === 7 ? ', 높은 으뜸음' : ''}`;
        return <button key={i} type="button" className={`ss-slot ${p ? 'ss-filled' : ''} ${i === cursor && phase === 'building' ? 'ss-current' : ''} ${i === active ? 'ss-active' : ''} ${bad ? 'ss-bad' : ''}`} data-testid={`slot-${i}`} data-filled={!!p} data-key={slot.key ?? ''} onClick={() => onSlot?.(i)} aria-label={label}>
          <span className="ss-slot-box">{p ? <Ingredient pc={p.pc} grilled={final} /> : <span className="ss-slot-number">{i + 1}</span>}{i === 7 && <span className="ss-high">높은</span>}</span>
          <span className={`ss-name-tag ${notation === 'both' ? 'ss-two-lines' : ''}`}>{p && !hidden ? <NoteLabel name={p.name} notation={notation} /> : hidden ? '?' : '\u00a0'}</span>
          {solfege && <span className="ss-solfege">{scale.solfege[i]}</span>}
        </button>;
      })}
    </div>
  </section>;
}
