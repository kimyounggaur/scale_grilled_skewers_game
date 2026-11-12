'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buildScale, scaleLabel } from '../../../game';
import { CONTENT_IDS } from '../../../store/saveStore';
import { Tray } from '../../../components';
import { playTone,playSequence,playSizzle,cancelAudio,setSound,unlockAudio,midiToFrequency } from '../../../audio/engine';
import '../dev.css';
export default function SoundPage() {
  const [id,setId]=useState('C'); const [muted,setMuted]=useState(false); const [active,setActive]=useState(-1); const [status,setStatus]=useState('건반 또는 재생 버튼을 누르면 소리를 시작합니다.');
  const scale=buildScale(id);
  useEffect(()=>()=>cancelAudio(),[]);
  const run=async(sizzle=false)=>{setStatus('음계를 재생합니다.');await unlockAudio();const played=await playSequence(scale.notes.map(n=>n.midi),i=>setActive(i<0?-1:scale.tray.find(k=>k.pc===scale.notes[i]?.pc&&(i!==7||k.top))?.index??0),sizzle);setStatus(played?'재생이 끝났습니다.':'재생을 취소했습니다.');};
  return <main className="dev-shell"><h1>소리 점검</h1><p>사용자 입력으로 소리를 켭니다. 소리가 없어도 강조 표시는 진행됩니다.</p><nav className="dev-nav"><Link href="/dev/">화면 크기</Link><Link href="/dev/parts/">부품</Link><Link href="/dev/staff/">악보</Link><Link href="/">홈</Link></nav>
    <div className="dev-controls"><label>음계<select value={id} onChange={e=>{cancelAudio();setActive(-1);setId(e.target.value);}}>{CONTENT_IDS.map(x=><option key={x} value={x}>{`${scaleLabel(x,'ko')} (${scaleLabel(x,'short')})`}</option>)}</select></label><button onClick={()=>void run()}>음계 재생</button><button onClick={()=>void run(true)}>굽기와 음계</button><button onClick={()=>{cancelAudio();playSizzle();setStatus('굽는 소리 (0.65초)');}}>굽는 소리</button><button onClick={()=>{cancelAudio();setActive(-1);setStatus('재생을 취소했습니다.');}}>취소</button><button aria-pressed={muted} onClick={()=>{const next=!muted;setMuted(next);setSound(!next);setStatus(next?'소리를 껐습니다.':'소리를 켰습니다.');}}>{muted?'소리 켜기':'소리 끄기'}</button></div>
    <div className="dev-stage"><Tray scale={scale} activeKey={active} onKey={key=>{cancelAudio();setActive(key);const midi=scale.tray[key]?.midi;if(midi!==undefined){playTone(midi);setStatus(`건반 ${key}: MIDI ${midi} · ${midiToFrequency(midi).toFixed(2)} Hz`);}}} /><div className="dev-status" aria-live="polite">{status}</div></div>
  </main>;
}
