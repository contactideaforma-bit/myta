/**
 * Pastilles « Instagram » et « TikTok » : couleurs évocatrices des plateformes,
 * sans reproduire leurs logos (marques déposées) — un pictogramme vidéo générique suffit.
 */
function VideoGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SourceChips({ light = false, active }: { light?: boolean; active?: 'instagram' | 'tiktok' | null }) {
  const base = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-all'
  const dim = (k: string) => (active && active !== k ? 'opacity-40' : '')
  return (
    <div className="flex items-center gap-1.5">
      <span className={`${base} ${dim('instagram')} text-white`}
        style={light ? { background: 'rgba(255,255,255,0.18)' } : { background: 'linear-gradient(45deg, #F58529, #DD2A7B 55%, #8134AF)' }}>
        <VideoGlyph />Instagram
      </span>
      <span className={`${base} ${dim('tiktok')} text-white ${light ? '' : 'bg-zinc-900'}`} style={light ? { background: 'rgba(255,255,255,0.18)' } : undefined}>
        <VideoGlyph />TikTok
      </span>
    </div>
  )
}
