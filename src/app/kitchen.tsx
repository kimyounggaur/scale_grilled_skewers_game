'use client';

import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Flame, Home, LockKeyhole, Menu, Settings, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { buildScale, COURSE, hasNameSlots, isUnlocked, neighborOf, noteEn, place, relativeOf, scaleLabel, stars, twinOf, type Scale, type Notation } from '../game';
import { createOrder, tapKey, tapSlot, askHint, bake, canBake, currentNameChoices, chooseName, serve, recordPatch, type OrderKind, type OrderTransition as Transition, type Effect } from '../game/order';
import { CONTENT_IDS, emptyRecord, progressOf, todayOrders, useSaveStore, type SaveSettings } from '../store/saveStore';
import { useOrderStore } from '../store/orderStore';
import { cancelAudio, playSequence, playTone, setSound, unlockAudio } from '../audio/engine';
import { formatMessage } from '../lib/strings';
import { Chef, Ingredient, NoteLabel, Skewer, Staff, Tray } from '../components';

const KIND_LABEL: Record<OrderKind,string> = { learn:'배우기',challenge:'도전',fill:'빈자리 채우기',fix:'고쳐 굽기',name:'이름표 달기' };
const KIND_DESC: Record<OrderKind,string> = { learn:'간격을 보며 차근차근 꽂아요',challenge:'혼자 완성하고 한 번에 구워요',fill:'비어 있는 재료를 채워요',fix:'어색한 재료 하나를 찾아 바꿔요',name:'같은 건반의 알맞은 이름을 골라요' };
const QUERY_KINDS: OrderKind[] = ['learn','challenge','fill','fix','name'];
const filledSlots = (scale:Scale) => scale.notes.map((note,i)=>({key:note.midi-scale.tonicMidi,placement:place(scale,i,note.midi-scale.tonicMidi),given:true}));
function displayScale(id:string,n:Notation) { return n==='en'?scaleLabel(id,'en'):n==='ko'?scaleLabel(id,'ko'):`${scaleLabel(id,'ko')}(${scaleLabel(id,'short')})`; }
function sigText(scale:Scale) { return scale.keySig.count ? `${scale.keySig.type==='sharp'?'♯':'♭'} ${scale.keySig.count}개` : '조표 없음'; }
function StarRow({count}:{count:number}) { return <span className="stars" aria-label={`별 ${count}개`}>{[0,1,2].map(i=><span key={i} className={i<count?'earned':''}>★</span>)}</span>; }
function IconButton({label,children,onClick}:{label:string;children:ReactNode;onClick:()=>void}) { return <button className="icon-button" aria-label={label} title={label} onClick={onClick}>{children}</button>; }
function Modal({open,onOpenChange,title,children}:{open:boolean;onOpenChange:(v:boolean)=>void;title:string;children:ReactNode}) { return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog-content" aria-describedby={undefined}><div className="dialog-top"><Dialog.Title>{title}</Dialog.Title><Dialog.Close className="icon-button" aria-label="닫기"><X size={20}/></Dialog.Close></div>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>; }

export function KitchenApp({page}:{page:'home'|'menu'|'order'|'settings'|'compare'|'help'}) {
  const save=useSaveStore(s=>s.save), hydrated=useSaveStore(s=>s.hydrated);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [helpOpen,setHelpOpen]=useState(false);
  useEffect(()=>{useSaveStore.getState().hydrate();},[]);
  useEffect(()=>{
    const settings=save.settings;
    document.documentElement.dataset.theme=settings.theme;
    document.documentElement.dataset.motion=settings.motion;
    document.documentElement.dataset.large=String(settings.largeText);
    setSound(settings.sound);
  },[save.settings]);
  useEffect(()=>()=>{cancelAudio();},[page]);
  if(!hydrated) return <main className="loading"><Chef/><p>주방을 준비하고 있어요…</p></main>;
  const header = <header className="site-header"><Link href="/" className="brand"><span className="brand-mark"><Flame size={20}/></span><span>음계 꼬치구이<small>작은 음악 주방</small></span></Link><nav><IconButton label="도움말" onClick={()=>setHelpOpen(true)}><BookOpen size={20}/></IconButton><IconButton label="설정" onClick={()=>setSettingsOpen(true)}><Settings size={20}/></IconButton></nav></header>;
  return <>{page!=='order'&&header}{page==='home'?<HomePage/>:page==='menu'?<MenuPage/>:page==='order'?<Suspense fallback={<main className="loading"><Chef/><p>주문을 준비해요…</p></main>}><OrderPage onSettings={()=>setSettingsOpen(true)}/></Suspense>:page==='settings'?<main className="content-page settings-page"><PageHeading eyebrow="MY KITCHEN" title="주방 설정"/><SettingsPanel/></main>:page==='compare'?<ComparePage/>:<main className="content-page"><HelpContent/></main>}
    <Modal open={settingsOpen} onOpenChange={setSettingsOpen} title="주방 설정"><SettingsPanel/></Modal>
    <Modal open={helpOpen} onOpenChange={setHelpOpen} title="작은 요리 안내서"><HelpContent/></Modal>
    {!useSaveStore.getState().storageAvailable&&<div className="storage-note" role="status">이 환경에서는 기록이 저장되지 않아요. 게임은 계속할 수 있어요.</div>}
  </>;
}
function PageHeading({eyebrow,title,children}:{eyebrow:string;title:string;children?:ReactNode}) { return <div className="page-heading"><Link href="/" className="back-link"><ArrowLeft size={16}/> 가게로</Link><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children}</div>; }

function HomePage() {
  const router=useRouter(), save=useSaveStore(s=>s.save);
  const [startOpen,setStartOpen]=useState(false);
  const count=CONTENT_IDS.reduce((sum,id)=>sum+stars(save.records[id]??emptyRecord(),buildScale(id)),0);
  const today=()=>{const orders=todayOrders(save);try{sessionStorage.setItem('skewer:today',JSON.stringify(orders));}catch{} const o=orders[0];if(o)router.push(`/order/?scale=${encodeURIComponent(o.scaleId)}&kind=${o.kind}&today=0`);};
  return <main className="home-page"><div className="hero-copy"><div className="open-pill"><span/> 오늘도 맛있는 음악 수업</div><p className="eyebrow">A LITTLE MUSIC KITCHEN</p><h1>차곡차곡 꽂으면,<br/>음계가 완성돼요.</h1><p className="hero-description">온음은 두 칸, 반음은 한 칸.<br/>나만의 음악 레시피를 만들어 볼까요?</p></div>
    <StallIllustration/>
    <div className="home-actions">{!save.introDone?<button className="button primary start-button" onClick={()=>setStartOpen(true)}><Flame size={21}/> 처음 시작 <ArrowRight size={19}/></button>:<button className="button primary start-button" onClick={today}><Sparkles size={21}/> 오늘의 주문 <ArrowRight size={19}/></button>}<Link className="button secondary" href="/menu/"><Menu size={19}/> 메뉴판 둘러보기</Link></div>
    <div className="home-foot"><span>26가지 음계</span><i/><span>5가지 요리 방법</span><i/><span>시간 제한 없이</span></div>
    {save.introDone&&<div className="recipe-progress"><StarRow count={3}/><span>모은 레시피 별 <strong>{count}</strong> / 78</span></div>}
    <p className="association">한국생활음악강사협회 × ST Planet</p>
    <Modal open={startOpen} onOpenChange={setStartOpen} title="작은 음악 주방에 오신 걸 환영해요"><div className="welcome-chef"><Chef mood="happy"/></div><p className="intro-copy">음 재료를 하나씩 꽂아 음계를 만들어요.<br/>다장조와 바장조, 두 꼬치부터 함께 만들어요.</p><button className="button primary full" onClick={()=>{useSaveStore.getState().updateSettings({sound:true});setSound(true);void unlockAudio();playTone(72);router.push('/order/?scale=C&kind=learn&intro=1');}}>시작하기 (소리 켜기) <Volume2 size={18}/></button><button className="button ghost full" onClick={()=>{useSaveStore.getState().updateSettings({sound:false});router.push('/order/?scale=C&kind=learn&intro=1');}}>소리 없이 시작</button><p className="small-note">{formatMessage('T-70',{},save.settings.notation)}</p></Modal>
  </main>;
}
function StallIllustration() { return <div className="stall-scene" aria-label="재료와 꼬치가 준비된 작은 음악 주방" role="img"><div className="scene-sun"/><span className="scene-note note-one">♪</span><span className="scene-note note-two">♫</span><div className="stall-sign"><Flame size={19}/><b>음계 꼬치구이</b><span>온음 · 반음 · 한 꼬치</span></div><div className="stall-awning">{Array.from({length:9},(_,i)=><i key={i}/>)}</div><div className="stall-back"><div className="hanging-card">오늘의 레시피<br/><b>도 · 레 · 미 · 파</b></div><div className="scene-chef"><Chef mood="happy"/></div><div className="scene-skewers">{[0,2,4,5,7,9,11,0].map((pc,i)=><Ingredient key={i} pc={pc} grilled/>)}</div></div><div className="stall-counter"><div className="ingredient-bowls">{[0,2,5,7].map(pc=><span key={pc}><Ingredient pc={pc}/></span>)}</div><b>느긋하게, 맛있게, 음악답게.</b></div><div className="stall-feet"><i/><i/></div><span className="scene-spark spark-one">✦</span><span className="scene-spark spark-two">✦</span></div>; }

function MenuPage() {
  const router=useRouter(),save=useSaveStore(s=>s.save);
  const [selected,setSelected]=useState<string|null>(null),[lockInfo,setLockInfo]=useState('');
  const progress=progressOf(save);
  const groups=[{name:'첫 번째 레시피',tag:'BASIC COURSE',ids:COURSE.basic,description:'익숙한 음계부터 하나씩 배워요.'},{name:'더 넓은 음악 주방 · 장음계',tag:'MAJOR SCALES',ids:COURSE.challengeMajor,description:'으뜸음을 바꾸어 같은 간격을 만들어요.'},{name:'더 넓은 음악 주방 · 단음계',tag:'NATURAL MINOR',ids:COURSE.challengeMinor,description:'자연단음계의 다른 간격 순서를 만나요.'},{name:'쌍둥이 꼬치',tag:'SAME SOUND, NEW NAME',ids:Object.values(COURSE.twins),description:'소리는 같아도 이름표는 달라요.'}];
  return <main className="content-page menu-page"><PageHeading eyebrow="THE RECIPE BOOK" title="오늘은 어떤 음계를 구울까요?"><p>하나씩 완성하며 나만의 레시피북을 채워요.</p></PageHeading><div className="menu-guide"><Chef/><span><b>별 하나</b>는 배우기, <b>별 둘</b>은 도전!<br/><b>별 셋</b>은 응용 주문까지 완성한 요리사예요.</span></div>{groups.map(group=><section className="menu-group" key={group.tag}><div className="group-title"><div><p className="eyebrow">{group.tag}</p><h2>{group.name}</h2></div><span>{group.ids.length}가지</span></div><p className="group-desc">{group.description}</p><div className="recipe-grid">{group.ids.map((id,i)=>{const scale=buildScale(id),unlocked=isUnlocked(id,progress,save.settings.unlock);return <button className={`recipe-card ${unlocked?'':'locked'}`} key={id} data-testid={`recipe-${id}`} aria-disabled={!unlocked} onClick={()=>{if(unlocked)setSelected(id);else setLockInfo(save.settings.unlock==='basicOnly'?'선생님 설정에서 기본 코스만 열려 있어요.':group.tag.includes('SAME')?'도전 코스를 열고 짝 음계에서 별 하나를 받아 보세요.':group.tag==='BASIC COURSE'?'앞 음계의 배우기 주문을 완성하면 열려요.':'기본 코스 6개의 배우기를 모두 완성하면 열려요.');}}><div className="recipe-top"><span className="recipe-number">{String(i+1).padStart(2,'0')}</span>{unlocked?<Ingredient pc={scale.notes[0]!.pc}/>:<LockKeyhole size={22}/>}</div><h3>{displayScale(id,save.settings.notation)}</h3><div className="recipe-bottom"><span>{sigText(scale)}</span><StarRow count={progress[id]??0}/></div></button>;})}</div></section>)}
    <Modal open={!!lockInfo} onOpenChange={()=>setLockInfo('')} title="아직 준비 중인 레시피"><p>{lockInfo}</p><button className="button primary full" onClick={()=>setLockInfo('')}>알겠어요</button></Modal>
    <Modal open={selected!==null} onOpenChange={v=>{if(!v)setSelected(null);}} title={selected?displayScale(selected,save.settings.notation):'주문 고르기'}>{selected&&<><p className="small-note">요리 방법을 골라 주세요.</p><div className="order-choices">{QUERY_KINDS.filter(k=>k!=='name'||hasNameSlots(buildScale(selected))).map(kind=>{const n=progress[selected]??0,available=kind==='learn'||(kind==='challenge'?n>=1:n>=2);return <button className="order-choice" key={kind} disabled={!available} onClick={()=>router.push(`/order/?scale=${encodeURIComponent(selected)}&kind=${kind}`)}><span className={`choice-icon ${kind}`}>{kind==='learn'?<BookOpen/>:kind==='challenge'?<Flame/>:kind==='fill'?<Sparkles/>:kind==='fix'?<Settings/>:<Check/>}</span><span><b>{KIND_LABEL[kind]}</b><small>{available?KIND_DESC[kind]:kind==='challenge'?'배우기를 먼저 마치세요':'도전을 한 번에 통과하면 열려요'}</small></span>{available?<ChevronRight size={18}/>:<LockKeyhole size={16}/>}</button>;})}</div></>}</Modal>
  </main>;
}

function OrderPage({onSettings}:{onSettings:()=>void}) {
  const router=useRouter(),save=useSaveStore(s=>s.save),order=useOrderStore(s=>s.order);
  const query = useSearchParams().toString();
  const [config,setConfig]=useState<{scaleId:string;kind:OrderKind;intro:number;today:number}|null>(null);
  const [active,setActive]=useState(-1),[lastKey,setLastKey]=useState(-1),[exitOpen,setExitOpen]=useState(false);
  const [earned,setEarned]=useState(0),[comparison,setComparison]=useState<string|null>(null);
  const playback=useRef(0),highlightTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{
    // React may replay effects in development. Each setup owns a matching cleanup.
    playback.current++;
    cancelAudio();
    setConfig(null);
    setActive(-1);
    setLastKey(-1);
    setEarned(0);
    setComparison(null);
    const q=new URLSearchParams(query),raw=q.get('scale')??'C';
    const id=CONTENT_IDS.includes(raw)?raw:'C';
    const requestedKind=q.get('kind');
    const kind:OrderKind=QUERY_KINDS.includes(requestedKind as OrderKind)?requestedKind as OrderKind:'learn';
    const snapshot=useSaveStore.getState().save;
    const record=snapshot.records[id]??emptyRecord();
    const earnedStars=stars(record,buildScale(id));
    const modeAllowed=kind==='learn'||(kind==='challenge'?earnedStars>=1:earnedStars>=2);
    const cleanup=()=>{
      playback.current++;
      if(highlightTimer.current)clearTimeout(highlightTimer.current);
      cancelAudio();
    };
    // A direct learning link is useful in class; advanced modes still follow earned progress.
    if(!modeAllowed||(kind==='name'&&!hasNameSlots(buildScale(id)))){
      router.replace('/menu/');
      return cleanup;
    }
    const requestedIntro=Number(q.get('intro')??0);
    const intro=kind==='learn'&&requestedIntro===1&&id==='C'?1:kind==='learn'&&requestedIntro===2&&id==='F'?2:0;
    const requestedToday=q.has('today')?Number(q.get('today')):-1;
    const today=Number.isInteger(requestedToday)&&requestedToday>=0?requestedToday:-1;
    const rel=relativeOf(id);
    const n=createOrder(id,kind,record.plays[kind],{
      guide:intro===1?'full':intro===2?'intro2':'light',
      fillPassed:record.fill,
      neighborLearned:!!snapshot.records[neighborOf(id)??'']?.learned,
      relativeLearned:!!snapshot.records[rel]?.learned,
    });
    useOrderStore.getState().start(n);
    setConfig({scaleId:id,kind,intro,today});
    return cleanup;
  },[query,router]);
  if(!order||!config) return <main className="loading"><Chef/><p>주문을 준비해요…</p></main>;
  const scale=buildScale(order.scaleId),settings=save.settings;
  const beforeStars=stars(save.records[scale.id]??emptyRecord(),scale);
  const nameSlots=order.nameSlots??[],nameCursor=order.nameCursor??0;
  const hiddenSlots=order.kind==='name'?nameSlots.slice(nameCursor):[];
  const choices=currentNameChoices(order);
  const currentChoice=choices.length>0;
  const ready=canBake(order);
  const message=order.phase==='served'?formatMessage(config.intro===1?'T-30':config.intro===2?'T-31':order.kind==='challenge'?'T-41':'T-32',{...order.message.values,clean:order.wrongCount===0},settings.notation,scale.id):formatMessage(order.message.id,order.message.values,settings.notation,scale.id);
  function effects(list:Effect[]) {for(const e of list){if(e.type==='tones'){void unlockAudio();e.midis.forEach((m,i)=>playTone(m,(e.delay??0)+i*(e.gap??.3)));}if(e.type==='highlight'){setActive(e.slot);setLastKey(e.key);if(highlightTimer.current)clearTimeout(highlightTimer.current);highlightTimer.current=setTimeout(()=>setActive(-1),800);} } }
  function act(t:Transition) {cancelAudio();playback.current++;if(highlightTimer.current)clearTimeout(highlightTimer.current);setActive(-1);useOrderStore.getState().apply(t);effects(t.effects);}
  function key(index:number){const current=useOrderStore.getState().order;if(!current)return;if(current.phase==='served'){void unlockAudio();playTone(scale.tray[index]!.midi);setLastKey(index);return;}if(current.phase==='baking')return;setLastKey(index);act(tapKey(current,index));}
  async function cook(){
    const current=useOrderStore.getState().order;
    if(!current||!canBake(current))return;
    const t=bake(current);
    useOrderStore.getState().apply(t);
    cancelAudio();
    const p=++playback.current;
    if(highlightTimer.current)clearTimeout(highlightTimer.current);
    if(t.state.phase!=='baking'){effects(t.effects);return;}
    await unlockAudio();
    if(playback.current!==p)return;
    const played=await playSequence(t.state.slots.map(s=>s.placement!.midi),i=>{
      if(playback.current===p){setActive(i);setLastKey(t.state.slots[i]?.placement ? t.state.slots[i]!.placement!.midi-scale.tonicMidi : -1);}
    },true);
    if(!played||playback.current!==p)return;
    const done=serve(t.state);
    useOrderStore.getState().apply(done);
    setActive(-1);
    const store=useSaveStore.getState();
    store.completeOrder(t.state.scaleId,t.state.kind,recordPatch(done.state));
    setEarned(Math.max(0,stars(useSaveStore.getState().save.records[scale.id]??emptyRecord(),scale)-beforeStars));
  }
  async function replay(){
    const p=++playback.current;
    if(highlightTimer.current)clearTimeout(highlightTimer.current);
    const audible=order!.slots.flatMap((slot,index)=>slot.placement?[{slot,index}]:[]);
    await unlockAudio();
    if(playback.current!==p)return;
    await playSequence(audible.map(({slot})=>slot.placement!.midi),i=>{
      const entry=audible[i];
      if(playback.current===p){setActive(entry?.index??-1);setLastKey(entry?.slot.placement ? entry.slot.placement.midi-scale.tonicMidi : -1);}
    });
    if(playback.current===p)setActive(-1);
  }
  function next(){cancelAudio();if(config!.intro===1){router.push('/order/?scale=F&kind=learn&intro=2');return;}if(config!.intro===2){useSaveStore.getState().finishIntro();router.push('/compare/?a=C&b=F&intro=1');return;}const twin=twinOf(scale.id),rel=relativeOf(scale.id);if(twin&&['Gb','Ebm'].includes(scale.id)){setComparison(twin);return;}if(order!.kind==='learn'&&scale.mode==='minor'&&save.records[rel]?.learned){setComparison(rel);return;}goNext();}
  function goNext(){if(config!.today>=0){try{const orders=JSON.parse(sessionStorage.getItem('skewer:today')??'[]') as {scaleId:string;kind:OrderKind}[];const next=orders[config!.today+1];if(next){router.push(`/order/?scale=${encodeURIComponent(next.scaleId)}&kind=${next.kind}&today=${config!.today+1}`);return;}}catch{}}router.push('/menu/');}
  const relativePcs=scale.mode==='minor'&&save.records[relativeOf(scale.id)]?.learned?buildScale(relativeOf(scale.id)).notes.slice(0,7).map(n=>n.pc):[];
  return <main className={`order-page ${order.phase==='baking'?'is-baking':''}`} data-testid="order-page">
    <header className="order-ticket"><button className="icon-button" aria-label="메뉴판으로" onClick={()=>setExitOpen(true)}><ArrowLeft size={20}/></button><div className="ticket-copy"><span className="eyebrow">{config.intro?`처음 요리 · 주문 ${config.intro}`:KIND_LABEL[order.kind]}</span><h1>{displayScale(scale.id,settings.notation)}<span> 음계 꼬치 주세요!</span></h1></div><IconButton label={settings.sound?'소리 끄기':'소리 켜기'} onClick={()=>{useSaveStore.getState().updateSettings({sound:!settings.sound});void unlockAudio();}}>{settings.sound?<Volume2 size={20}/>:<VolumeX size={20}/>}</IconButton><IconButton label="설정" onClick={onSettings}><Settings size={20}/></IconButton></header>
    <div className="order-board"><div className="section-cap"><span>나의 음계 꼬치</span><span>{Math.min(order.slots.filter(s=>s.placement).length,8)} / 8</span></div><Skewer scale={scale} slots={order.slots} cursor={order.cursor} kind={order.kind} notation={settings.notation} solfege={settings.solfege} phase={order.phase} active={active} errorSlot={order.wrongSlot??-1} hiddenSlots={hiddenSlots} onSlot={i=>{const current=useOrderStore.getState().order;if(!current||current.phase==='baking')return;act(tapSlot(current,i));}}/></div>
    <section className="guide-panel"><Chef mood={order.phase==='served'?'happy':order.wrongSlot!==null?'wonder':'normal'}/><div className="guide-bubble" role="status" aria-live="polite" data-testid="guide"><p>{order.phase==='baking'?'치익! 음계를 들으며 노릇노릇 굽고 있어요.':message}</p>{order.phase==='served'&&<span className="completion-stars"><StarRow count={stars(save.records[scale.id]??emptyRecord(),scale)}/>{earned>0?`새로운 별 ${earned}개!`:'멋진 꼬치가 완성됐어요!'}</span>}</div></section>
    <section className="staff-panel"><div className="section-cap"><span>음악 레시피</span><span>{order.phase==='served'?'조표로 모였어요':'재료와 같은 음을 그려요'}</span></div><Staff scale={scale} slots={order.slots} kind={order.kind} phase={order.phase} active={active} errorSlot={order.wrongSlot??-1} hiddenSlots={hiddenSlots}/></section>
    <section className="tray-panel"><div className="section-cap"><span>재료 건반</span><span>바로 옆 건반 = 반음</span></div><Tray scale={scale} notation={settings.notation} activeKey={lastKey} hintKey={order.flashKeys[0]??null} pairedKeys={order.pairKeys} relativePcs={relativePcs} onKey={key} disabled={order.phase==='baking'}/></section>
    <footer className="order-actions">{currentChoice&&order.phase==='building'?<div className="name-options" aria-label="이름표 선택">{choices.map(choice=><button className="button secondary" key={noteEn(choice)} onClick={()=>{const current=useOrderStore.getState().order;if(current)act(chooseName(current,choice));}}><NoteLabel name={choice} notation={settings.notation}/></button>)}</div>:order.phase==='served'?<><button className="button secondary" onClick={replay}><Volume2 size={18}/> 다시 듣기</button><button className="button primary" onClick={next}>{config.intro===1?'다음 주문 받기':config.intro===2?'두 꼬치 비교':'다음'}<ArrowRight size={18}/></button></>:<>{order.kind==='fix'?<button className="button secondary" onClick={replay} disabled={order.phase==='baking'}><Volume2 size={17}/> 다시 듣기</button>:settings.hints&&['learn','fill'].includes(order.kind)?<button className="button secondary" onClick={()=>{const current=useOrderStore.getState().order;if(current)act(askHint(current));}} disabled={order.phase==='baking'||order.cursor===8}><Sparkles size={17}/> 힌트</button>:<span className="action-note">{order.kind==='challenge'?'완성한 뒤 한 번에 확인해요':order.kind==='name'?'이름표를 먼저 골라 주세요':''}</span>}<button className="button primary bake-button" onClick={cook} disabled={!ready||order.phase==='baking'}><Flame size={20}/>{order.phase==='baking'?'굽는 중…':'굽기'}</button></>}</footer>
    <Modal open={exitOpen} onOpenChange={setExitOpen} title="메뉴판으로 돌아갈까요?"><p>완성한 꼬치의 별은 남아 있어요. 지금 만들던 주문은 다시 시작해요.</p><div className="modal-actions"><button className="button secondary" onClick={()=>setExitOpen(false)}>계속 만들기</button><button className="button primary" onClick={()=>router.push('/menu/')}>메뉴판으로</button></div></Modal>
    <Modal open={!!comparison} onOpenChange={v=>{if(!v){setComparison(null);goNext();}}} title="두 꼬치를 비교해요">{comparison&&<><ComparePair a={scale.id} b={comparison}/><button className="button primary full" onClick={()=>{setComparison(null);goNext();}}>다음 주문으로 <ArrowRight size={18}/></button></>}</Modal>
  </main>;
}

function ComparePair({a,b}:{a:string;b:string}) {
  const notation=useSaveStore(s=>s.save.settings.notation),[playing,setPlaying]=useState(''),[active,setActive]=useState(-1);
  const twin=twinOf(a)===b;
  async function listen(id:string){setPlaying(id);await unlockAudio();await playSequence(buildScale(id).notes.map(n=>n.midi),setActive);setActive(-1);setPlaying('');}
  return <div className="compare-pair">{[a,b].map(id=>{const scale=buildScale(id);return <section key={id}><div className="compare-label"><h2>{displayScale(id,notation)}</h2><button className="icon-button" aria-label={`${id} 음계 듣기`} onClick={()=>listen(id)}><Volume2 size={19}/></button></div><Skewer scale={scale} slots={filledSlots(scale)} cursor={8} notation={notation} phase="served" active={playing===id?active:-1} onSlot={()=>listen(id)}/></section>;})}<p className="compare-explanation">{twin?'건반과 소리는 똑같아요. 음계의 글자 순서에 따라 이름표가 달라져요.':a==='C'&&b==='F'?formatMessage('T-60',{},notation):'두 음계는 같은 재료 일곱 개를 써요. 시작하는 음과 간격 순서가 달라져요.'}</p></div>;
}
function ComparePage() {const [ids,setIds]=useState(['C','F']);useEffect(()=>{const q=new URLSearchParams(window.location.search);setIds([q.get('a')??'C',q.get('b')??'F'].map(id=>CONTENT_IDS.includes(id)?id:'C'));},[]);return <main className="content-page compare-page"><PageHeading eyebrow="SAME RECIPE, NEW START" title="시작음이 달라도, 간격은 같아요."/><ComparePair a={ids[0]!} b={ids[1]!}/><div className="modal-actions"><Link className="button secondary" href="/order/?scale=C&kind=learn&intro=1">다시 만들기</Link><Link className="button primary" href="/">홈으로 <Home size={18}/></Link></div></main>;}

function SettingsPanel() {
  const settings=useSaveStore(s=>s.save.settings),update=useSaveStore(s=>s.updateSettings),[teacher,setTeacher]=useState(false),[resetOpen,setResetOpen]=useState(false),[holding,setHolding]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  function startHold(){setHolding(true);timer.current=setTimeout(()=>{setTeacher(true);setHolding(false);},2000);}
  function endHold(){if(timer.current)clearTimeout(timer.current);setHolding(false);}
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const toggle=(key:'solfege'|'sound'|'largeText'|'hints',label:string,sub?:string)=><label className="setting-toggle"><span><b>{label}</b>{sub&&<small>{sub}</small>}</span><input type="checkbox" checked={settings[key]} onChange={e=>update({[key]:e.target.checked})}/></label>;
  return <div className="settings-panel"><fieldset><legend>음 이름 표기</legend><div className="segmented">{([['both','한글+영어'],['ko','한글'],['en','영어']] as const).map(([value,label])=><button key={value} className={settings.notation===value?'selected':''} onClick={()=>update({notation:value})} aria-pressed={settings.notation===value}>{label}</button>)}</div></fieldset>{toggle('solfege','계이름 보기','꼬치 아래에 도·레·미를 표시해요')}{toggle('sound','소리 켜기')}{toggle('largeText','글자 크게','큰 화면에서 1.25배로 읽어요')}<label className="setting-select"><span>움직임</span><select aria-label="움직임" value={settings.motion} onChange={e=>update({motion:e.target.value as SaveSettings['motion']})}><option value="system">기기 설정을 따름</option><option value="reduce">항상 줄이기</option></select></label><label className="setting-select"><span>화면 테마</span><select aria-label="화면 테마" value={settings.theme} onChange={e=>update({theme:e.target.value as SaveSettings['theme']})}><option value="system">기기 설정을 따름</option><option value="light">밝은 주방</option><option value="dark">어두운 주방</option></select></label>
    <button className={`teacher-entry ${holding?'holding':''}`} onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold} onPointerCancel={endHold} onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();startHold();}}} onKeyUp={endHold}>선생님용 <small>2초간 길게 눌러 주세요</small></button>
    {teacher&&<section className="teacher-panel"><h3>선생님 설정</h3><label className="setting-select"><span>열어 둘 범위</span><select aria-label="열어 둘 범위" value={settings.unlock} onChange={e=>update({unlock:e.target.value as SaveSettings['unlock']})}><option value="sequence">차례대로</option><option value="basicOnly">기본 코스만</option><option value="all">모두 열기</option></select></label>{toggle('hints','힌트 버튼 보이기')}<button className="button danger full" onClick={()=>setResetOpen(true)}>기록 지우기</button><p className="small-note">여러 학생이 한 기기를 쓴다면 ‘모두 열기’로 수업하세요.</p></section>}
    <Modal open={resetOpen} onOpenChange={setResetOpen} title="모든 별과 기록을 지울까요?"><p>학습 기록과 입문 완료 기록이 지워져요. 되돌릴 수 없어요.</p><div className="modal-actions"><button className="button secondary" onClick={()=>setResetOpen(false)}>취소</button><button className="button danger" onClick={()=>{useSaveStore.getState().resetRecords();setResetOpen(false);}}>모든 기록 지우기</button></div></Modal>
  </div>;
}
function HelpContent(){const c=buildScale('C'),am=buildScale('Am'),f=buildScale('F');return <div className="help-content"><p className="eyebrow">A RECIPE FOR EVERY NOTE</p><h2>재료로 음악을 배워요</h2><section><span className="help-number">01</span><h3>바로 옆은 반음, 두 칸은 온음</h3><div className="interval-illustration"><div><Ingredient pc={4}/><span>→</span><Ingredient pc={5}/><b>반음 · 바로 옆 건반</b></div><div><Ingredient pc={0}/><span>→</span><Ingredient pc={2}/><b>온음 · 건반 두 칸</b></div></div><p>검은건반도 한 칸으로 세요. 미–파와 시–도 사이에는 다른 건반이 없어요.</p></section><section><span className="help-number">02</span><h3>간격 순서가 음계의 레시피</h3><p>장음계는 온·온·반·온·온·온·반, 자연단음계는 온·반·온·온·반·온·온이에요.</p><Skewer scale={c} slots={filledSlots(c)} cursor={8} notation="en" solfege/><Skewer scale={am} slots={filledSlots(am)} cursor={8} notation="en" solfege/></section><section><span className="help-number">03</span><h3>변화표가 모이면 조표가 돼요</h3><Staff scale={f} slots={filledSlots(f)} phase="served"/><p>바장조는 나(B)를 반음 내려 내림나(B♭)를 써요. 굽고 나면 내림표가 악보 앞으로 모여 조표가 돼요.</p></section><section><span className="help-number">04</span><h3>요리사 별은 이렇게 받아요</h3><p>★ 배우기 완성<br/>★★ 도전을 한 번에 통과<br/>★★★ 빈자리·고쳐 굽기·이름표를 오답 없이 완성</p><p>힌트를 써도 배우기 별을 받을 수 있어요. 틀린 자리는 그 자리에서 고치면 돼요.</p></section></div>;}
