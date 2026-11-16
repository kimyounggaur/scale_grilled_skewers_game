'use client';

import Image from 'next/image';
import { useId, useRef, type ReactNode } from 'react';
import { Chef, Ingredient } from '../art';

const chapters = [
  ['welcome', '게임 소개'], ['screen', '화면 살펴보기'], ['first', '첫 주문'],
  ['steps', '반음과 온음'], ['scales', '장음계와 단음계'], ['notation', '악보와 조표'],
  ['orders', '다섯 가지 주문'], ['stars', '별과 잠금'], ['settings', '설정과 저장'], ['questions', '자주 묻는 질문'],
] as const;
const pictures = [
  '음악 주방에 찾아온 요리사', '다양한 음 재료를 모아 놓은 그림', '재료를 골라 꼬치를 만드는 모습',
  '건반과 손을 표현한 개념 그림: 실제 건반 배열과 다를 수 있어요', '다양한 재료로 완성한 두 꼬치', '음악 레시피를 살펴보는 요리사',
  '불 위에서 익어가는 꼬치 그림', '완성한 요리와 별을 기뻐하는 요리사', '거울과 재료를 바라보는 요리사 그림', '완성된 꼬치를 들고 있는 요리사 그림',
];

/** Illustrated, read-only guide shared by the header dialog and the help page. */
export function Rulebook() {
  const id = useId().replace(/:/g, '');
  const root = useRef<HTMLDivElement>(null);
  const go = (name: string) => root.current?.querySelector<HTMLElement>(`[data-chapter="${name}"]`)?.scrollIntoView({ behavior: 'auto', block: 'start' });
  const section = (index: number, children: ReactNode) => {
    const [key, title] = chapters[index]!;
    return <section className="rb-chapter" data-chapter={key} aria-labelledby={`${id}-${key}`} key={key}>
      <div className="rb-heading"><span className="rb-num">{String(index + 1).padStart(2, '0')}</span><h3 id={`${id}-${key}`}>{title}</h3></div>
      <div className="rb-body"><figure className="rb-figure"><Image src={`/assets/rulebook/chapter-${String(index + 1).padStart(2, '0')}.webp`} width={512} height={512} alt={pictures[index]!} /><figcaption>{pictures[index]}</figcaption></figure><div className="rb-copy">{children}</div></div>
    </section>;
  };
  return <div className="rb-book" ref={root}>
    <div className="rb-hero"><p className="rb-label">THE MUSIC KITCHEN GUIDE</p><h2>음계 꼬치구이 요리책</h2><p>그림을 보며 재료를 고르고, 음계의 비밀을 하나씩 익혀요.</p><div className="rb-intro-meta"><span>26가지 음계</span><span>5가지 주문</span><span>시간 제한 없이</span></div></div>
    <nav className="rb-nav" aria-label="롤북 목차">{chapters.map(([key, title], i)=><button type="button" className="rb-nav-link" key={key} onClick={()=>go(key)}><span>{String(i+1).padStart(2, '0')}</span> {title}</button>)}</nav>
    {section(0, <><p>음 하나하나가 맛있는 재료가 돼요. 주문받은 음계의 음을 <strong>낮은 음부터 높은 음까지 8개</strong> 차례로 꽂아 꼬치를 완성해 보세요.</p><div className="rb-diagram rb-pitches" aria-label="다장조 재료가 차례로 모여 꼬치가 되는 예시">{[0,2,4,5,7,9,11,0].map((pc,i)=><span key={i}><Ingredient pc={pc}/><small>{i===7?'높은 도':['도','레','미','파','솔','라','시'][i]}</small></span>)}</div><p className="rb-callout">처음에는 다장조와 바장조를 함께 만든 뒤 두 꼬치를 비교해요.</p></>)}
    {section(1, <><p>주문 화면을 위에서 아래로 살펴보세요.</p><ol className="rb-steps"><li><b>주문서</b>에서 만들어야 할 음계와 요리 방법을 확인해요.</li><li><b>나의 음계 꼬치</b>에 고른 재료와 현재 자리가 보여요.</li><li><b>요리사의 말풍선</b>을 읽고 다음에 할 일을 알아봐요.</li><li><b>음악 레시피</b>에서 재료가 악보에 어떻게 그려지는지 살펴봐요.</li><li><b>재료 건반</b>을 눌러 음을 고르고, 준비되면 <b>굽기</b>를 눌러요.</li></ol></>)}
    {section(2, <><ol className="rb-steps"><li>홈에서 <b>처음 시작</b>을 누르고 소리 사용 여부를 골라요.</li><li>요리사가 알려주는 건반을 하나씩 눌러 꼬치의 빈자리를 채워요.</li><li>8개를 채우면 <b>굽기</b>를 눌러 완성해요.</li><li><b>다음 주문 받기</b>로 바장조를 만들고 두 음계를 비교해요.</li></ol><p className="rb-callout">헷갈리면 힌트를 사용하세요. 배우기는 틀린 음을 고쳐도 별을 받을 수 있어요.</p></>)}
    {section(3, <><p>건반을 셀 때는 <strong>검은 건반도 한 칸</strong>이에요. 바로 이웃한 두 건반 사이가 반음, 반음 두 칸이 온음이에요.</p><div className="rb-diagram"><p className="rb-label">건반 순서로 살펴보기</p><div className="rb-example"><span>도 C</span><span>→ 반음 →</span><span>도♯ C♯</span><span>→ 반음 →</span><span>레 D</span></div><p>도에서 레까지는 반음 두 칸, 즉 <b>온음</b>이에요.</p><div className="rb-example"><span>미 E</span><span>→ 반음 →</span><span>파 F</span></div><p>미–파와 시–도는 사이에 검은 건반이 없어 바로 반음이에요.</p></div></>)}
    {section(4, <><p>같은 음에서 시작해도 <b>간격 순서</b>에 따라 서로 다른 음계를 만들 수 있어요. 마지막 여덟 번째 음은 시작음보다 한 옥타브 높아요.</p><div className="rb-pattern"><b>장음계</b><span>온 · 온 · 반 · 온 · 온 · 온 · 반</span><small>예: 다장조 C–D–E–F–G–A–B–C</small></div><div className="rb-pattern"><b>자연단음계</b><span>온 · 반 · 온 · 온 · 반 · 온 · 온</span><small>예: 가단조 A–B–C–D–E–F–G–A</small></div><p>다장조와 가단조는 같은 음 재료를 쓰지만 시작음과 간격 순서가 달라요.</p></>)}
    {section(5, <><p>꼬치에서 고른 음이 아래 오선에도 표시돼요. 완성 후에는 조표가 악보 앞쪽에 모여 보입니다.</p><div className="rb-grid"><div className="rb-card"><b>♯ 올림표</b><p>기준 음을 반음 올려요.</p></div><div className="rb-card"><b>♭ 내림표</b><p>기준 음을 반음 내려요.</p></div><div className="rb-card"><b>♮ 제자리표</b><p>변화된 음을 원래 높이로 돌려요.</p></div></div><p className="rb-callout">예: 바장조는 B를 반음 내린 B♭을 사용해요. 같은 소리라도 음계의 글자 순서에 맞는 이름이 중요해요.</p></>)}
    {section(6, <><p>메뉴판에서 음계를 선택한 다음 열려 있는 요리 방법을 골라요.</p><div className="rb-grid"><div className="rb-card"><b>📖 배우기</b><p>안내와 힌트를 보며 차근차근 완성해요.</p></div><div className="rb-card"><b>🔥 도전</b><p>혼자 8음을 채우고 굽기에서 확인해요. 고치려면 꼬치 자리를 선택한 뒤 건반을 눌러요.</p></div><div className="rb-card"><b>✨ 빈자리 채우기</b><p>이미 놓인 재료를 보고 비어 있는 자리를 채워요.</p></div><div className="rb-card"><b>🔎 고쳐 굽기</b><p>틀린 재료 하나를 찾아 해당 자리를 누르고 올바른 건반으로 바꿔요.</p></div><div className="rb-card"><b>🏷️ 이름표 달기</b><p>같은 건반의 이름 중 음계에 맞는 이름을 골라요. 2~7번째 자리 중 변화표가 있는 음이 대상이에요.</p></div></div><figure className="rb-figure rb-extra-figure"><Image src="/assets/rulebook/chapter-11.webp" width={512} height={512} alt="꼬치의 재료를 바꾸는 모습"/><figcaption>틀린 재료를 찾아 고쳐 보세요.</figcaption></figure></>)}
    {section(7, <><div className="rb-stars"><p><b>★</b> 배우기 주문을 완성하면 별 하나!</p><p><b>★★</b> 도전 주문을 오답 없이 완성하면 별 둘!</p><p><b>★★★</b> 빈자리와 고쳐 굽기, 이름표 달기 주문을 각각 오답 없이 완성하면 별 셋!</p></div><p>이름표 주문이 없는 음계는 빈자리와 고쳐 굽기를 각각 오답 없이 완성하면 돼요. 실수했다면 다시 주문해 오답 없이 도전할 수 있어요.</p><p>기본 순차 설정에서는 앞 음계의 배우기를 마치면 다음 기본 음계가 열려요. 기본 코스 6개를 배우면 더 많은 장·단음계가 열리고, 쌍둥이 음계는 짝 음계의 별도 필요해요. 교사 설정에 따라 열리는 범위가 달라질 수 있어요.</p><figure className="rb-figure rb-extra-figure"><Image src="/assets/rulebook/chapter-12.webp" width={512} height={512} alt="트로피를 들고 기뻐하는 요리사"/><figcaption>차근차근 완성하며 별을 모아요.</figcaption></figure></>)}
    {section(8, <><p>상단의 <b>설정</b>에서 음이름 표기, 계이름, 소리, 큰 글씨와 화면 테마 등을 바꿀 수 있어요. 힌트 버튼과 열림 범위는 설정의 ‘선생님용’을 2초간 길게 눌러 조정해요.</p><p>별과 설정은 이 기기의 브라우저에 저장돼요. 다른 기기나 브라우저로 자동 이동하지 않으며, 브라우저 데이터를 지우면 기록도 사라질 수 있어요.</p><div className="rb-callout"><Chef mood="wonder"/> 저장을 사용할 수 없는 환경에서는 안내가 표시돼요. 그때도 게임은 할 수 있어요.</div></>)}
    {section(9, <div className="rb-faq"><h4>틀리면 처음부터 해야 하나요?</h4><p>배우기에서는 안내에 따라 고칠 수 있어요. 도전과 응용에서 별 조건을 이루려면 오답 없이 다시 완성해 보세요.</p><h4>검은 건반도 재료인가요?</h4><p>네. 흰 건반과 검은 건반을 모두 같은 간격의 이웃 건반으로 세어요.</p><h4>소리가 안 들려요.</h4><p>설정에서 소리가 켜져 있는지, 기기의 음량과 무음 상태를 확인해요. 브라우저에서는 화면을 한 번 누른 뒤 소리가 시작될 수 있어요.</p><h4>잠긴 메뉴는 어떻게 여나요?</h4><p>앞 음계의 배우기와 기본 코스 진행도를 살펴보세요. 선생님이 설정에서 열림 범위를 바꿀 수도 있어요.</p></div>)}
  </div>;
}
