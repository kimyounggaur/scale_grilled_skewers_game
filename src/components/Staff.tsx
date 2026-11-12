import { ledgerLines, noteEn, type Placement, type Scale } from '../game';
import glyphData from '../../docs/reference/staff_glyphs.json';

export interface StaffSlot {
  key: number | null;
  placement: Placement | null;
  given: boolean;
}

export interface StaffProps {
  scale: Scale;
  slots: StaffSlot[];
  phase?: string;
  active?: number;
  kind?: string;
  revealed?: number[];
  hiddenSlots?: number[];
  errorSlot?: number;
}

/** Musical geometry comes from the rule engine; Bravura outlines retain OFL attribution in docs. */
export function Staff({
  scale, slots, phase = 'building', active = -1, kind = 'learn',
  revealed = [], hiddenSlots, errorSlot = -1,
}: StaffProps) {
  const glyphs = glyphData.glyphs;
  const final = phase === 'served' || phase === 'baked';
  const width = 400;
  const spacing = 10;
  const glyphScale = spacing / 250;
  const top = 38;
  const yOf = (step: number) => top + (38 - step) * spacing / 2;
  const clefX = 8;
  const sigX = clefX + 3.23 * spacing;
  const sigAdvance = spacing * 1.06;
  const firstX = sigX + (final ? scale.keySig.count * sigAdvance + spacing * 0.5 : spacing * 0.2);
  const noteSpacing = (width - 7 - firstX) / 8;
  const headWidth = glyphs.whole.bbox[2]! * glyphScale;
  const shouldHide = (index: number) => hiddenSlots
    ? hiddenSlots.includes(index)
    : kind === 'name' && index > 0 && index < 7 && scale.notes[index]?.alter !== 0 && !revealed.includes(index);
  const shown = slots.flatMap((slot, index) => slot.placement && !shouldHide(index) ? [{ placement: slot.placement, index }] : []);
  const highY = Math.min(0, ...shown.map(({ placement }) => yOf(placement.step) - 9));
  const lowY = Math.max(111, ...shown.map(({ placement }) => yOf(placement.step) + 10));
  const aria = shown.length ? `악보: ${shown.map(({ placement }) => noteEn(placement.name)).join(', ')}` : '악보: 아직 음표가 없어요';

  return (
    <div className={`ss-staff ${final ? 'ss-staff-final' : ''}`} data-testid="staff">
      <svg viewBox={`0 ${highY} ${width} ${lowY - highY}`} role="img" aria-label={aria} preserveAspectRatio="xMidYMid meet">
        {Array.from({ length: 5 }, (_, i) => <line key={i} x1={4} x2={width - 4} y1={top + i * spacing} y2={top + i * spacing} className="ss-staff-line" stroke="currentColor" strokeWidth="0.7" opacity="0.46" />)}
        <path d={glyphs.gClef.d} fill="currentColor" transform={`translate(${clefX} ${top + 3 * spacing}) scale(${glyphScale})`} />
        {final && <g className="ss-signature" data-testid="key-signature" data-count={scale.keySig.count} data-type={scale.keySig.type}>
          {scale.keySig.steps.map((step, index) => <path key={index} data-step={step} d={(scale.keySig.type === 'sharp' ? glyphs.sharp : glyphs.flat).d} fill="currentColor" transform={`translate(${sigX + sigAdvance * index} ${yOf(step)}) scale(${glyphScale})`} />)}
        </g>}
        {shown.map(({ placement: p, index }) => {
          const x = firstX + (index + 0.5) * noteSpacing;
          const y = yOf(p.step);
          const wrong = errorSlot === index || ((kind === 'learn' || kind === 'fill') && !p.ok);
          const accidental = p.name.alter > 0 ? glyphs.sharp : glyphs.flat;
          const accidentalWidth = accidental.bbox[2]! * glyphScale;
          return <g key={index} className={`ss-note ${wrong ? 'ss-bad' : ''} ${active === index ? 'ss-active' : ''}`} data-testid={`staff-note-${index}`} data-step={p.step} data-midi={p.midi} data-alter={p.name.alter} style={{ transform: `translate(${x}px,${y}px)`, transition: 'transform .7s ease' }}>
            {active === index && <ellipse rx={headWidth * 0.85} ry={spacing * 0.96} fill="var(--gold,#FFC83D)" opacity=".45" />}
            {ledgerLines(p.step).map(step => <line key={step} x1={-headWidth * 0.78} x2={headWidth * 0.78} y1={(p.step - step) * spacing / 2} y2={(p.step - step) * spacing / 2} stroke="currentColor" strokeWidth="1" />)}
            <path d={glyphs.whole.d} fill="currentColor" transform={`translate(${-headWidth / 2} 0) scale(${glyphScale})`} />
            {!final && p.name.alter !== 0 && <path className="ss-accidental" d={accidental.d} fill="currentColor" transform={`translate(${-headWidth / 2 - spacing * .22 - accidentalWidth} 0) scale(${glyphScale})`} />}
          </g>;
        })}
      </svg>
      {final && <div className="ss-staff-caption" data-testid="signature-caption">{scale.keySig.type === 'none' ? '조표 없음' : `조표 ${scale.keySig.type === 'sharp' ? '♯' : '♭'} ${scale.keySig.count}개`}</div>}
    </div>
  );
}
