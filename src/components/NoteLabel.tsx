import type { NoteName, Notation } from '../game';
import { noteKo } from '../game';
import glyphData from '../../docs/reference/staff_glyphs.json';

export function Accidental({ alter, className = '' }: { alter: number; className?: string }) {
  if (!alter) return null;
  const glyph = alter > 0 ? glyphData.glyphs.sharp : glyphData.glyphs.flat;
  const b = glyph.bbox;
  return <svg className={`ss-accidental ${className}`} viewBox={`${b[0]} ${-(b[3] ?? 0)} ${(b[2] ?? 0) - (b[0] ?? 0)} ${(b[3] ?? 0) - (b[1] ?? 0)}`} aria-hidden="true"><path d={glyph.d} /></svg>;
}
function English({ name }: { name: NoteName }) { return <>{name.letter}<Accidental alter={name.alter} /></>; }
export function NoteLabel({ name, notation = 'both' }: { name: NoteName; notation?: Notation }) {
  if (notation === 'en') return <span className="ss-note-label ss-en"><English name={name} /></span>;
  if (notation === 'ko') return <span className="ss-note-label ss-ko">{noteKo(name)}</span>;
  return <span className="ss-note-label ss-both"><span>{noteKo(name)}</span><small><English name={name} /></small></span>;
}
