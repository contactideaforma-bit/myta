'use client'

/**
 * Hub Mini-jeux Waty v2 — défis du jour, série de jeu, points et tenues de
 * Waty, classement amis de la semaine, jeux à débloquer (7 / 14 / 30 jours).
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GAMES, useGameUnlocks, type GameKey } from '@/lib/games'
import { MytaIcon } from '@/components/ui/MytaIcon'
import { SpriteSvg } from '@/components/ui/SpriteSvg'
import { watySprite, HEALTHY, JUNK } from '@/lib/game-sprites'
import {
  getDailyChallenge, fetchGameMeta, fetchWeekLeaderboard, setSkin as saveSkin, SKINS,
  type GameMeta, type LeaderRow, type SkinKey,
} from '@/lib/game-engine'

const GAME_ART: Record<GameKey, JSX.Element> = {
  tri:    <span className="flex -space-x-2"><SpriteSvg sprite={HEALTHY.pomme} size={34} /><SpriteSvg sprite={JUNK.donut} size={34} /></span>,
  lava:   <svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true"><path d="M8 56c6-10 10-24 24-24s18 14 24 24z" fill="#F97316"/><path d="M14 56c4-6 8-16 18-16s14 10 18 16z" fill="#FBBF24"/><rect x="26" y="8" width="12" height="22" rx="3" fill="#78716C"/><rect x="22" y="4" width="20" height="6" rx="3" fill="#A8A29E"/></svg>,
  runner: <svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true"><path d="M6 50h52" stroke="#4B47A0" strokeWidth="4" strokeLinecap="round"/><path d="M12 40h10M8 32h8M14 24h12" stroke="#7B7FD4" strokeWidth="3" strokeLinecap="round"/><circle cx="44" cy="30" r="12" fill="#22C55E"/><circle cx="40" cy="28" r="2" fill="#15152A"/><circle cx="48" cy="28" r="2" fill="#15152A"/></svg>,
}

export default function GamesPage() {
  const router = useRouter()
  const { loading, daysUsed, unlocked, bestScores } = useGameUnlocks()
  const [meta, setMeta]   = useState<GameMeta | null>(null)
  const [board, setBoard] = useState<LeaderRow[] | null>(null)
  const [boardGame, setBoardGame] = useState<GameKey>('tri')
  const [skinOpen, setSkinOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { fetchGameMeta().then(setMeta) }, [])
  useEffect(() => { setBoard(null); fetchWeekLeaderboard(boardGame).then(setBoard) }, [boardGame])

  async function chooseSkin(k: SkinKey) {
    if (!meta) return
    const def = SKINS.find(s => s.key === k)!
    if (meta.points < def.cost) { setToast(`Il te manque ${def.cost - meta.points} points`); setTimeout(() => setToast(''), 2000); return }
    if (await saveSkin(k)) { setMeta({ ...meta, skin: k }); setSkinOpen(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-tta-mid/30 border-t-tta-mid rounded-full animate-spin" /></div>

  const nextLocked = GAMES.find(g => !unlocked(g.key))
  const defis = GAMES.map(g => ({ g, d: getDailyChallenge(g.key), ok: !!meta?.defiDone[g.key], open: unlocked(g.key) }))
  const doneCount = defis.filter(x => x.ok).length

  return (
    <div className="page">
      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-zinc-900 shadow-lg">{toast}</div>}

      {/* ── Waty + points + série ── */}
      <div className="card-hero flex items-center gap-4">
        <button onClick={() => setSkinOpen(v => !v)} aria-label="Changer la tenue de Waty" className="relative flex-shrink-0 active:scale-95 transition-transform">
          <SpriteSvg sprite={watySprite(meta?.skin ?? 'classic', 'wow')} size={72} />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-tta-mid text-white flex items-center justify-center shadow"><MytaIcon name="settings" size={12} /></span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold t-text tracking-tight">Mini-jeux Waty</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs font-extrabold bg-tta-light text-tta-mid rounded-full px-2.5 py-1 flex items-center gap-1"><MytaIcon name="sparkle" size={12} />{meta?.points ?? 0} points</span>
            <span className={`text-xs font-extrabold rounded-full px-2.5 py-1 flex items-center gap-1 ${(meta?.streak ?? 0) > 0 ? 'bg-orange-50 text-orange-700' : 'bg-raised t-muted'}`}><MytaIcon name="flame" size={12} />{meta?.streak ?? 0} j de jeu</span>
          </div>
          <p className="text-[11px] t-muted mt-1.5">Touche Waty pour changer sa tenue.</p>
        </div>
      </div>

      {/* ── Tenues ── */}
      {skinOpen && (
        <div className="card flex flex-col gap-3">
          <p className="text-sm font-extrabold t-text">Tenues de Waty</p>
          <div className="grid grid-cols-3 gap-2">
            {SKINS.map(s => {
              const owned = (meta?.points ?? 0) >= s.cost
              const active = meta?.skin === s.key
              return (
                <button key={s.key} onClick={() => chooseSkin(s.key)}
                  className={`rounded-2xl p-2 flex flex-col items-center gap-1 border-2 transition-all ${active ? 'border-tta-mid bg-tta-light' : 'border-transparent bg-raised'} ${owned ? '' : 'opacity-60'}`}>
                  <SpriteSvg sprite={watySprite(s.key, 'ok')} size={48} />
                  <span className="text-[11px] font-extrabold t-text">{s.label}</span>
                  <span className="text-[10px] font-bold t-muted flex items-center gap-0.5">{owned ? (active ? 'portée' : 'débloquée') : <><MytaIcon name="lock" size={10} />{s.cost}</>}</span>
                </button>
              )
            })}
          </div>
          <p className="text-[11px] t-muted">Les points se gagnent à chaque partie (1 point par tranche de 10) et avec les défis du jour (+50).</p>
        </div>
      )}

      {/* ── Défis du jour ── */}
      <div className="card flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold t-text">Défis du jour</p>
          <span className="text-xs font-bold t-muted">{doneCount} / {defis.filter(x => x.open).length} réussis</span>
        </div>
        {defis.map(({ g, d, ok, open }) => (
          <button key={g.key} disabled={!open} onClick={() => router.push(g.href)}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${ok ? 'bg-green-50' : open ? 'bg-raised active:scale-[0.98]' : 'bg-raised opacity-50'} transition-transform`}>
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${ok ? 'bg-green-500 text-white' : 'bg-white text-tta-mid'}`}>
              <MytaIcon name={ok ? 'check' : open ? 'target' : 'lock'} size={15} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-extrabold t-text">{g.title}</span>
              <span className="block text-xs t-muted">{open ? `Objectif ${d.label} · +${d.reward} points` : `Se débloque à ${g.unlockDays} jours`}</span>
            </span>
            {open && !ok && <MytaIcon name="chevron" size={14} className="t-faint" />}
          </button>
        ))}
        <p className="text-[11px] t-muted">Même partie pour tout le monde : comparez vos scores entre amis.</p>
      </div>

      {/* ── Progression des paliers ── */}
      {nextLocked && (
        <div className="card-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold t-text">Jours d'utilisation</p>
            <p className="text-lg font-black text-tta-mid">{daysUsed}<span className="text-xs font-semibold t-muted"> j</span></p>
          </div>
          <div className="h-2 bg-raised rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.round((daysUsed / nextLocked.unlockDays) * 100))}%`, background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }} />
          </div>
          <p className="text-xs t-muted">Plus que <b className="t-text">{nextLocked.unlockDays - daysUsed} jour{nextLocked.unlockDays - daysUsed > 1 ? 's' : ''}</b> pour débloquer <b className="t-text">{nextLocked.title}</b> (pas besoin de jours consécutifs).</p>
        </div>
      )}

      {/* ── Jeux ── */}
      <div className="flex flex-col gap-3">
        {GAMES.map(game => {
          const isUnlocked = unlocked(game.key)
          const best = bestScores[game.key]
          return (
            <button key={game.key} onClick={() => isUnlocked && router.push(game.href)} disabled={!isUnlocked}
              className={`card text-left transition-all ${isUnlocked ? 'active:scale-[0.98]' : 'opacity-70'}`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: isUnlocked ? `${game.color}1a` : 'var(--raised)' }}>
                  {isUnlocked ? GAME_ART[game.key] : <MytaIcon name="lock" size={22} className="t-faint" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold t-text">{game.title}</p>
                    {!isUnlocked && <span className="text-[10px] font-bold t-muted bg-raised px-2 py-0.5 rounded-full flex-shrink-0">{Math.min(daysUsed, game.unlockDays)}/{game.unlockDays} j</span>}
                  </div>
                  <p className="text-xs t-muted leading-relaxed mt-0.5">{game.desc}</p>
                  {isUnlocked && best !== undefined && (
                    <p className="flex items-center gap-1 text-xs font-bold mt-1.5" style={{ color: game.color }}><MytaIcon name="trophy" size={12} /> Record : {best} {game.scoreUnit}</p>
                  )}
                </div>
                {isUnlocked && (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, ${game.color}, #2BA8B0)` }}>
                    <MytaIcon name="play" size={16} />
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Classement amis de la semaine ── */}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-extrabold t-text">Cette semaine · amis</p>
          <div className="flex bg-raised rounded-full p-0.5 gap-0.5">
            {GAMES.filter(g => unlocked(g.key)).map(g => (
              <button key={g.key} onClick={() => setBoardGame(g.key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${boardGame === g.key ? 'bg-white text-tta-mid shadow-sm' : 't-muted'}`}>{g.title.split(' ')[0] === 'Le' ? 'Tri' : g.title.split(' ')[0]}</button>
            ))}
          </div>
        </div>
        {board === null ? <p className="text-xs t-muted">Chargement…</p>
          : board.length === 0 ? <p className="text-xs t-muted">Personne n'a encore joué cette semaine. Lance une partie.</p>
          : board.length === 1 && board[0].me ? <p className="text-xs t-muted">Tu es seul·e pour l'instant — rejoins un groupe dans Amis pour comparer vos scores.</p>
          : (
            <div className="flex flex-col gap-1">
              {board.slice(0, 8).map((r, i) => (
                <div key={r.user_id} className={`flex items-center gap-2 text-sm rounded-xl px-2 py-1.5 ${r.me ? 'bg-tta-light font-extrabold text-tta-mid' : 't-text'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-zinc-200 text-zinc-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-raised t-muted'}`}>{i + 1}</span>
                  <span className="flex-1 truncate">{r.me ? 'Toi' : (r.full_name?.split(' ')[0] ?? 'Ami')}</span>
                  <span className="text-[11px] t-muted">{r.runs} partie{r.runs > 1 ? 's' : ''}</span>
                  <span className="tabular-nums font-extrabold w-14 text-right">{r.best}</span>
                </div>
              ))}
            </div>
          )}
      </div>

      <p className="text-center text-[10px] t-faint pb-2">Un jour d'utilisation = un jour où tu ouvres MYTA. Tes repas et séances passés comptent déjà.</p>
    </div>
  )
}
