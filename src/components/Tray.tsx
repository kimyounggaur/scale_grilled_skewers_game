import type { CSSProperties } from 'react';
import type { Scale, Notation } from '../game';
import { noteLabel, noteKo } from '../game';
import { Ingredient } from '../art';
import { art } from '../art/manifest';
import { NoteLabel, Accidental } from './NoteLabel';
export interface TrayProps {
  scale: Scale; notation?: Notation; onKey: (index: number) => void; activeKey?: number;
  hintKey?: number | null; pairedKeys?: number[]; relativePcs?: number[]; disabled?: boolean;
}
export function Tray({ scale, notation = 'both', onKey, activeKey = -1, hintKey = null, pairedKeys = [], relativePcs = [], disabled = false }: TrayProps) {
  const nWhite = scale.tray.filter(k => !k.black).length;
  const edge = scale.tray[0]?.black;
  const whiteWidth = 100 / (nWhite + (edge ? .8 : 0));
  const blackWidth = whiteWidth * .8;
  return <section className="ss-tray" aria-label="재료 건반" data-testid="tray">
    <div className="ss-keys">
      {scale.tray.map(key => {
        const x = (edge ? blackWidth / 2 : 0) + scale.tray.slice(0,key.index).filter(k=>!k.black).length*whiteWidth;
        const left = key.black ? x - blackWidth / 2 : x;
        const width = key.black ? blackWidth : whiteWidth;
        const names = key.names.map(n => noteLabel(n, notation)).join(' 또는 ');
        const style: CSSProperties = { left: `${left}%`, width: `calc(${width}% - ${key.black ? 0 : 1.5}px)` };
        return <button key={key.index} type="button" style={style} className={`ss-key ${key.black ? 'ss-black' : 'ss-white'} ${activeKey === key.index ? 'ss-active' : ''} ${hintKey === key.index ? 'ss-hint' : ''} ${pairedKeys.includes(key.index) ? 'ss-pair' : ''}`} onClick={() => onKey(key.index)} disabled={disabled} aria-label={`${key.top ? '높은 ' : ''}${names} 건반, ${art.names[key.pc] ?? '재료'}`} data-testid={`key-${key.index}`} data-index={key.index} data-midi={key.midi}>
          {relativePcs.includes(key.pc) && <span className="ss-relative-dot" aria-label="나란한조의 재료" />}
          <span className="ss-key-art"><Ingredient pc={key.pc} />{key.top && <span className="ss-high">높은</span>}</span>
          <span className={`ss-key-names ${notation}`}>
            {key.black && notation === 'both' ? <><span>{key.names.map(n => <span key={`${n.letter}${n.alter}`}>{noteKo(n)}</span>)}</span><small>{key.names.map((n, i) => <span key={`${n.letter}${n.alter}`}>{i > 0 ? '·' : ''}{n.letter}<Accidental alter={n.alter} /></span>)}</small></> : key.names.map(n => <NoteLabel key={`${n.letter}${n.alter}`} name={n} notation={notation} />)}
          </span>
        </button>;
      })}
    </div>
  </section>;
}
