'use client';
import Link from 'next/link';
import { useState } from 'react';
import { buildScale, place, scaleLabel, type Notation } from '../../../game';
import { CONTENT_IDS } from '../../../store/saveStore';
import { Skewer, Staff, type VisualSlot } from '../../../components';
import '../dev.css';
export default function StaffPage() {
  const [id,setId] = useState('F#'); const [notation,setNotation] = useState<Notation>('both'); const [wrongKey,setWrongKey] = useState(1);
  const scale=buildScale(id);
  const filled=scale.notes.map((note,i): VisualSlot=>{const key=scale.tray.find(k=>k.pc===note.pc&&(i!==7||k.top))?.index??0;return {key,placement:place(scale,i,key),given:false};});
  const wrong=filled.map((slot,i)=>i===3?{key:wrongKey,placement:place(scale,i,wrongKey),given:false}:slot);
  return <main className="dev-shell"><h1>악보 점검</h1><p>음표의 높이와 변화표, 조표, 덧줄을 확인합니다.</p><nav className="dev-nav"><Link href="/dev/">화면 크기</Link><Link href="/dev/parts/">부품</Link><Link href="/dev/sound/">소리</Link><Link href="/">홈</Link></nav>
    <div className="dev-controls"><label>음계<select value={id} onChange={e=>setId(e.target.value)}>{CONTENT_IDS.map(x=><option key={x} value={x}>{`${scaleLabel(x,'ko')} (${scaleLabel(x,'short')})`}</option>)}</select></label><label>표기<select value={notation} onChange={e=>setNotation(e.target.value as Notation)}><option value="both">한글+영어</option><option value="ko">한글</option><option value="en">영어</option></select></label><label>4번째 자리 오답 건반<select value={wrongKey} onChange={e=>setWrongKey(Number(e.target.value))}>{scale.tray.map(k=><option key={k.index} value={k.index}>{k.index} (MIDI {k.midi})</option>)}</select></label></div>
    <div className="dev-samples"><article className="dev-card"><h2>조립 중 · 음표마다 변화표</h2><Skewer scale={scale} slots={filled} cursor={8} notation={notation} /><Staff scale={scale} slots={filled} /></article><article className="dev-card"><h2>굽기 뒤 · 조표로 모으기</h2><Skewer scale={scale} slots={filled} cursor={8} notation={notation} phase="served" /><Staff scale={scale} slots={filled} phase="served" /></article><article className="dev-card"><h2>틀린 재료의 악보</h2><Skewer scale={scale} slots={wrong} cursor={3} notation={notation} /><Staff scale={scale} slots={wrong} errorSlot={3} /></article><article className="dev-card"><h2>이름표 주문 · 정답 음표 숨김</h2><Skewer scale={scale} slots={filled} cursor={3} notation={notation} kind="name" /><Staff scale={scale} slots={filled} kind="name" /></article></div>
  </main>;
}
