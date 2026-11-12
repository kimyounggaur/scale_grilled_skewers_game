import { art } from './manifest';

export function Ingredient({ pc, grilled = false, className = '' }: { pc: number; grilled?: boolean; className?: string }) {
  const entry = art.ingredients[pc];
  if (entry?.src) return <img className={`ss-ingredient ${className}`} src={entry.src} alt="" aria-hidden="true" />;
  return <svg className={`ss-ingredient ${grilled ? 'ss-grilled' : ''} ${className}`} viewBox="0 0 40 40" aria-hidden="true">
    <g dangerouslySetInnerHTML={{ __html: entry?.svg ?? '' }} />
    {grilled && <path d={art.grillMarks} fill="none" stroke="#3A2019" strokeWidth="2.3" opacity=".55" strokeLinecap="round" />}
  </svg>;
}
export function Chef({ mood = 'normal', className = '' }: { mood?: 'normal' | 'happy' | 'wonder'; className?: string }) {
  return <svg className={`ss-chef ${className}`} viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="26" r="10.5" fill="#FFDCC0" stroke="#43281C" strokeWidth="1.5" />
    <path d="M10.5 18.5c-4.5-.8-5.3-7.3-.3-8.3 1-4.3 7.6-5.5 9.8-2 2.8-3.2 9.3-1.4 8.8 3 4.5.8 4.7 6.5.7 7.5v2.8h-19z" fill="#FFF" stroke="#43281C" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="16.3" cy="26.5" r="1.3" fill="#43281C" /><circle cx="23.7" cy="26.5" r="1.3" fill="#43281C" />
    <path d={mood === 'wonder' ? 'M17 31h6' : mood === 'happy' ? 'M16 30q4 5 8 0Z' : 'M16.5 30.5c2 1.8 5 1.8 7 0'} fill={mood === 'happy' ? '#CF3B25' : 'none'} stroke="#43281C" strokeWidth="1.5" strokeLinecap="round" />
  </svg>;
}
