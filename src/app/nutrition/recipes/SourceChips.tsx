'use client'
/**
 * Pastilles Instagram / TikTok.
 * Les logos officiels sont des marques déposées : on ne les redessine pas. Dépose les
 * fichiers fournis par les plateformes (kits de marque) dans :
 *   public/brands/instagram.svg   (ou .png)
 *   public/brands/tiktok.svg      (ou .png)
 * S'ils sont présents, ils s'affichent ; sinon, un picto vidéo générique prend le relais.
 */
import { useState } from 'react'

function BrandIcon({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  return <img src={src} alt={alt} width={14} height={14} className="w-3.5 h-3.5 object-contain" onError={() => setFailed(true)} />
}

export function SourceChips({ light = false, active }: { light?: boolean; active?: 'instagram' | 'tiktok' | null }) {
  const base = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-all'
  const dim = (k: string) => (active && active !== k ? 'opacity-40' : '')
  return (
    <div className="flex items-center gap-1.5">
      <span className={`${base} ${dim('instagram')} ${light ? 'text-white' : 'text-zinc-900'}`}
        style={light ? { background: 'rgba(255,255,255,0.18)' } : { background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <BrandIcon src="/brands/instagram.svg" alt="" />Instagram
      </span>
      <span className={`${base} ${dim('tiktok')} ${light ? 'text-white' : 'text-zinc-900'}`}
        style={light ? { background: 'rgba(255,255,255,0.18)' } : { background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <BrandIcon src="/brands/tiktok.svg" alt="" />TikTok
      </span>
    </div>
  )
}
