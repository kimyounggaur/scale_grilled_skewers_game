import Image from 'next/image';
import { art } from './manifest';

export function Ingredient({ pc, grilled = false, className = '' }: { pc: number; grilled?: boolean; className?: string }) {
  const entry = art.ingredients[pc];
  if (entry?.src) return <Image className={`ss-ingredient ${grilled ? 'ss-grilled' : ''} ${className}`} src={entry.src} width={320} height={320} style={{ objectFit: 'contain' }} alt="" aria-hidden="true" />;
  return <svg className={`ss-ingredient ${grilled ? 'ss-grilled' : ''} ${className}`} viewBox="0 0 40 40" aria-hidden="true">
    <g dangerouslySetInnerHTML={{ __html: entry?.svg ?? '' }} />
    {grilled && <path d={art.grillMarks} fill="none" stroke="#3A2019" strokeWidth="2.3" opacity=".55" strokeLinecap="round" />}
  </svg>;
}
export function Chef({ mood = 'normal', className = '' }: { mood?: 'normal' | 'happy' | 'wonder'; className?: string }) {
  return <Image className={`ss-chef ${className}`} src={art.chef[mood]} width={400} height={500} style={{ objectFit: 'contain' }} alt="" aria-hidden="true" />;
}
