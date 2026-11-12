import Link from 'next/link';
import './dev.css';
export default function DevPage() {
  const sizes = [[360,560],[360,640],[390,844],[1024,768],[1280,800],[1920,1080]] as const;
  return <main className="dev-shell dev-wide"><h1>음계 꼬치구이 · 화면 점검</h1><p>실제 크기의 주문 화면입니다. 각 화면 안에서 주문을 진행할 수 있습니다.</p>
    <nav className="dev-nav"><Link href="/">게임 홈</Link><Link href="/dev/parts/">꼬치와 재료 건반</Link><Link href="/dev/staff/">악보</Link><Link href="/dev/sound/">소리</Link></nav>
    <div className="dev-frames">{sizes.map(([width,height]) => <figure className="dev-frame" key={`${width}-${height}`}><figcaption>{width} × {height}</figcaption><iframe title={`주문 화면 ${width} × ${height}`} src="/order/?scale=F&kind=learn" width={width} height={height} style={{width,height}} /></figure>)}</div>
  </main>;
}
