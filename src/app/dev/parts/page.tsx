'use client';
import Link from 'next/link';
import { useState } from 'react';
import { buildScale, place, scaleLabel, type Notation } from '../../../game';
import { CONTENT_IDS } from '../../../store/saveStore';
import { Skewer, Tray, Staff, type VisualSlot } from '../../../components';
import { playTone } from '../../../audio/engine';
import '../dev.css';
export default function PartsPage() {
  const [id,setId] = useState('F'); const [notation,setNotation] = useState<Notation>('both'); const [active,setActive] = useState(-1);
  const scale = buildScale(id);
  const filled = scale.notes.map((note,i): VisualSlot => { const key = scale.tray.find(k => k.pc === note.pc && (i !== 7 || k.top))?.index ?? 0; return { key, placement:place(scale,i,key),given:false }; });
  const empty = filled.map((): VisualSlot => ({ key:null,placement:null,given:false }));
  const half = filled.map((slot,i) => i < 4 ? slot : empty[i]!);
  const examples = [{title:'빈 꼬치',slots:empty,cursor:0,phase:'building'},{title:'반쯤 꽂은 꼬치',slots:half,cursor:4,phase:'building'},{title:'완성한 꼬치',slots:filled,cursor:8,phase:'building'},{title:'구운 꼬치',slots:filled,cursor:8,phase:'served'}];
  return <main className="dev-shell"><h1>꼬치와 재료 건반</h1><nav className="dev-nav"><Link href="/dev/">화면 크기</Link><Link href="/dev/staff/">악보</Link><Link href="/dev/sound/">소리</Link><Link href="/">홈</Link></nav>
    <div className="dev-controls"><label>음계<select value={id} onChange={e=>{setId(e.target.value);setActive(-1);}}>{CONTENT_IDS.map(x=><option key={x} value={x}>{`${scaleLabel(x,'ko')} (${scaleLabel(x,'short')})`}</option>)}</select></label><label>표기<select value={notation} onChange={e=>setNotation(e.target.value as Notation)}><option value="both">한글+영어</option><option value="ko">한글</option><option value="en">영어</option></select></label></div>
    <div className="dev-samples">{examples.map(example=><article className="dev-card" key={example.title}><h2>{example.title}</h2><Skewer scale={scale} slots={example.slots} cursor={example.cursor} notation={notation} phase={example.phase} onSlot={i=>{const midi=example.slots[i]?.placement?.midi;if(midi!==undefined)playTone(midi);}} /><Staff scale={scale} slots={example.slots} phase={example.phase} /></article>)}</div>
    <h2>재료 건반 · 13칸</h2><div className="dev-stage"><Tray scale={scale} notation={notation} activeKey={active} onKey={key=>{setActive(key);const midi=scale.tray[key]?.midi;if(midi!==undefined)playTone(midi);}} /></div>
  </main>;
}
