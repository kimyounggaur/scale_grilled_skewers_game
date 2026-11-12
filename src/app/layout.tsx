import type { Metadata, Viewport } from 'next';
import './globals.css';
import '../components/components.css';
export const metadata: Metadata = { title: '음계 꼬치구이 · 작은 음악 주방', description: '재료를 꼬치에 꽂고 구우며 배우는 장음계와 자연단음계. 26개 음계, 다섯 가지 주문, 나만의 음악 레시피.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#FDF5E9' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ko"><body>{children}</body></html>; }
