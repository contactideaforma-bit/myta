'use client'
/**
 * Onglet « Statistiques » de l'espace admin : usage agrégé et anonyme.
 * Aucune donnée individuelle n'est affichée — uniquement des comptages.
 */
import { useEffect, useState } from 'react'
import { MytaIcon } from '@/components/ui/MytaIcon'
import { MytaIllustration, type MytaIllustrationName } from '@/components/ui/MytaIllustration'

interface Feat { count: number; users: number; [k: string]: any }
interface Stats {
  days: number; from: string; generatedAt: string
  users: { total: number; new7: number; new30: number; neverSignedIn: number; byStatus: Record<string, number>; byPlan: Record<string, number>; paying: number; trialing: number; vip: number; partners: number; profileComplete: number; pushEnabled: number }
  activity: { dau: number; wau: number; mau: number; activeInPeriod: number; avgDaysPerActive: number; freqBuckets: Record<string, number>; retention7: { cohort: number; retained: number }; dormant30: number }
  features: { journal: Feat; sessions: Feat; sleep: Feat; weight: Feat; recipes: Feat; challenges: Feat; promo: Feat }
  games: Record<string, { runs: number; users: number; defis: number; defisOk: number }>
  social: { groups: number; members: number; messages: number }
  series: { day: string; active: number; meals: number; sessions: number }[]
}

const PERIODS = [7, 30, 90] as const
const n = (v: number | undefined | null) => (v ?? 0).toLocaleString('fr-FR')
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)
const per = (a: number, b: number) => (b > 0 ? (a / b).toFixed(1).replace('.0', '') : '0')
const STATUS_LABEL: Record<string, string> = { active: 'Abonnés', trialing: 'Essai', vip: 'Offert / VIP', free: 'Gratuit', canceled: 'Résiliés', past_due: 'Impayés' }
const PLAN_LABEL: Record<string, string> = { premium: 'Premium', essentiel: 'Essentiel', premium_famille: 'Premium Famille', aucun: 'Sans plan' }
const GAME_LABEL: Record<string, string> = { tri: 'Le Grand Tri', runner: 'Waty Runner', lava: 'Floor is Lava' }

export function AdminStats({ headers }: { headers: () => Promise<Record<string, string>> }) {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30)
  const [stats, setStats] = useState<Stats | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true); setErr('')
      const res = await fetch(`/api/admin/stats?days=${days}`, { headers: await headers() })
      const d = await res.json().catch(() => null)
      if (!alive) return
      if (!res.ok || !d) setErr(d?.error ?? 'Impossible de charger les statistiques (la fonction admin_stats est-elle créée ?)')
      else setStats(d)
      setLoading(false)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days])

  return (
    <>
      <div className="flex bg-raised rounded-full p-1 gap-1">
        {PERIODS.map(p => (
          <button key={p} onClick={() => setDays(p)} className={`flex-1 py-1.5 rounded-full text-xs font-extrabold transition-all ${days === p ? 'bg-white text-tta-mid shadow-sm' : 't-muted'}`}>{p} jours</button>
        ))}
      </div>

      {err && <div className="card text-sm text-red-500">{err}</div>}
      {loading && !stats && <p className="text-xs t-muted text-center py-6">Calcul en cours…</p>}
      {stats && <StatsBody s={stats} dim={loading} />}
    </>
  )
}

function StatsBody({ s, dim }: { s: Stats; dim: boolean }) {
  const u = s.users, a = s.activity, f = s.features
  const active = a.activeInPeriod
  const insights = buildInsights(s)

  return (
    <div className={`flex flex-col gap-3 transition-opacity ${dim ? 'opacity-50' : ''}`}>
      {/* ── Vue d'ensemble ── */}
      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Comptes" value={n(u.total)} sub={`+${n(u.new7)} cette semaine`} tone="violet" />
        <Kpi label={`Actifs sur ${s.days} j`} value={n(active)} sub={`${pct(active, u.total)} % des comptes`} tone="green" />
        <Kpi label="Aujourd'hui / 7 j / 30 j" value={`${n(a.dau)} · ${n(a.wau)} · ${n(a.mau)}`} sub="utilisateurs actifs" tone="blue" />
        <Kpi label="Fréquence" value={`${a.avgDaysPerActive} j`} sub="d'ouverture par actif" tone="amber" />
      </div>

      {/* ── Courbe d'activité ── */}
      <div className="card flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold t-text">Utilisateurs actifs par jour</p>
          <span className="text-[11px] t-faint">depuis le {new Date(s.from).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
        </div>
        <Bars data={s.series.map(d => d.active)} labels={s.series.map(d => d.day)} color="#4B47A0" />
        <div className="grid grid-cols-2 gap-2 pt-1">
          <MiniSeries label="Repas notés" data={s.series.map(d => d.meals)} color="#22C55E" />
          <MiniSeries label="Séances" data={s.series.map(d => d.sessions)} color="#F59E0B" />
        </div>
      </div>

      {/* ── Fidélité ── */}
      <div className="card flex flex-col gap-3">
        <p className="text-sm font-extrabold t-text">Fidélité</p>
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-bold t-muted uppercase tracking-wide">Jours d'ouverture sur {s.days} j (par utilisateur actif)</p>
          {(['1', '2-4', '5-9', '10+'] as const).map(k => (
            <HBar key={k} label={`${k} jour${k === '1' ? '' : 's'}`} value={a.freqBuckets[k] ?? 0} max={Math.max(1, active)} color="#4B47A0" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Stat label="Rétention J+7" value={a.retention7.cohort ? `${pct(a.retention7.retained, a.retention7.cohort)} %` : '—'} sub={a.retention7.cohort ? `${a.retention7.retained}/${a.retention7.cohort} inscrits` : 'pas de cohorte'} />
          <Stat label="Dormants" value={n(a.dormant30)} sub="0 ouverture / 30 j" />
          <Stat label="Jamais connectés" value={n(u.neverSignedIn)} sub="compte créé seulement" />
        </div>
      </div>

      {/* ── Fonctionnalités ── */}
      <p className="text-sm font-extrabold t-text px-1 pt-1">Fonctionnalités sur {s.days} jours</p>
      <Feature art="repas" title="Journal alimentaire" count={f.journal.count} unit="entrées" users={f.journal.users} active={active}
        extra={[`${pct(f.journal.photo, f.journal.count)} % avec photo`, `${n(f.journal.supplements)} compléments`]} />
      <Feature art="seance" title="Sport" count={f.sessions.count} unit="séances" users={f.sessions.users} active={active}
        extra={[`${n(f.sessions.minutes)} min au total`, `${per(f.sessions.minutes, f.sessions.count)} min / séance`]} />
      <Feature art="nuit" title="Sommeil" count={f.sleep.count} unit="nuits" users={f.sleep.users} active={active}
        extra={[f.sleep.avgMinutes ? `${Math.floor(f.sleep.avgMinutes / 60)} h ${String(Math.round(f.sleep.avgMinutes % 60)).padStart(2, '0')} en moyenne` : 'durée moyenne —']} />
      <Feature art="recette" title="Recettes" count={f.recipes.count} unit="recettes" users={f.recipes.users} active={active}
        extra={[`${n(f.recipes.imported)} importées`, ...Object.entries(f.recipes.byKind ?? {}).map(([k, v]) => `${v} ${KIND_LABEL[k] ?? k}`)]} />
      <Feature art="trophee" title="Défis" count={f.challenges.count} unit="validés" users={f.challenges.users} active={active} />
      <Feature art="eau" title="Poids" count={f.weight.count} unit="pesées" users={f.weight.users} active={active} />

      {/* ── Mini-jeux ── */}
      <div className="card flex flex-col gap-2">
        <div className="flex items-center gap-2"><MytaIcon name="games" size={18} className="text-tta-mid" /><p className="text-sm font-extrabold t-text">Mini-jeux</p></div>
        {Object.keys(s.games).length === 0 ? <p className="text-xs t-muted">Aucune partie sur la période.</p> : Object.entries(s.games).map(([k, g]) => (
          <div key={k} className="flex items-center justify-between gap-2 bg-raised rounded-2xl px-3 py-2">
            <div>
              <p className="text-sm font-bold t-text">{GAME_LABEL[k] ?? k}</p>
              <p className="text-[11px] t-muted">{n(g.users)} joueur{g.users > 1 ? 's' : ''} · {per(g.runs, g.users)} parties / joueur</p>
            </div>
            <div className="text-right">
              <p className="text-base font-extrabold t-text">{n(g.runs)}</p>
              <p className="text-[11px] t-muted">parties · défi réussi {pct(g.defisOk, g.defis)} %</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Abonnements ── */}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center gap-2"><MytaIcon name="crown" size={18} className="text-amber-500" /><p className="text-sm font-extrabold t-text">Comptes et abonnements</p></div>
        <div className="flex flex-col gap-1.5">
          {Object.entries(u.byStatus).sort((x, y) => y[1] - x[1]).map(([k, v]) => (
            <HBar key={k} label={STATUS_LABEL[k] ?? k} value={v} max={Math.max(1, u.total)} color={k === 'active' ? '#22C55E' : k === 'trialing' ? '#F59E0B' : k === 'vip' ? '#4B47A0' : '#A1A1AA'} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(u.byPlan).map(([k, v]) => <Chip key={k}>{PLAN_LABEL[k] ?? k} : {v}</Chip>)}
          <Chip>{u.partners} partenaire{u.partners > 1 ? 's' : ''}</Chip>
          <Chip>{n(f.promo.count)} code{f.promo.count > 1 ? 's' : ''} utilisé{f.promo.count > 1 ? 's' : ''}</Chip>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Profil complet" value={`${pct(u.profileComplete, u.total)} %`} sub="poids, taille, âge" />
          <Stat label="Notifications" value={`${pct(u.pushEnabled, u.total)} %`} sub={`${n(u.pushEnabled)} appareils`} />
          <Stat label="Nouveaux / 30 j" value={n(u.new30)} sub={`${pct(u.new30, u.total)} % des comptes`} />
        </div>
      </div>

      {/* ── Social ── */}
      <div className="card flex items-center gap-3">
        <MytaIcon name="friends" size={22} className="text-tta-mid shrink-0" />
        <p className="text-sm t-text"><strong>{n(s.social.groups)}</strong> groupe{s.social.groups > 1 ? 's' : ''} d'amis · <strong>{n(s.social.members)}</strong> membre{s.social.members > 1 ? 's' : ''} · <strong>{n(s.social.messages)}</strong> message{s.social.messages > 1 ? 's' : ''} sur {s.days} j</p>
      </div>

      {/* ── Points d'attention ── */}
      {insights.length > 0 && (
        <div className="card flex flex-col gap-2">
          <div className="flex items-center gap-2"><MytaIcon name="advice" size={18} className="text-tta-mid" /><p className="text-sm font-extrabold t-text">Points d'attention</p></div>
          {insights.map((t, i) => <p key={i} className="text-sm t-text leading-snug pl-3 border-l-2 border-tta-mid/40">{t}</p>)}
        </div>
      )}

      <p className="text-[11px] t-faint text-center pb-2">Données agrégées et anonymes · calculées le {new Date(s.generatedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  )
}

const KIND_LABEL: Record<string, string> = { ia: 'générées par Waty', instagram: 'Instagram', tiktok: 'TikTok', web: 'site web', capture: 'capture d\'écran', photo: 'photo', texte: 'texte collé' }

function buildInsights(s: Stats): string[] {
  const out: string[] = []
  const u = s.users, a = s.activity, f = s.features
  if (u.total > 0 && u.neverSignedIn / u.total >= 0.15) out.push(`${u.neverSignedIn} comptes (${pct(u.neverSignedIn, u.total)} %) n'ont jamais ouvert l'app : un e-mail de relance après inscription pourrait les récupérer.`)
  if (u.total > 5 && a.dormant30 / u.total >= 0.5) out.push(`${pct(a.dormant30, u.total)} % des comptes sont dormants depuis 30 jours : une notification « Waty t'attend » ou un défi hebdo peut les réveiller.`)
  const once = a.freqBuckets['1'] ?? 0
  if (a.activeInPeriod >= 4 && once / a.activeInPeriod >= 0.5) out.push(`La moitié des actifs n'ouvrent l'app qu'un seul jour sur la période : le défi du jour et la série sont les leviers à pousser.`)
  if (u.total > 0 && u.pushEnabled === 0) out.push(`Aucun appareil n'a activé les notifications : vérifie que la demande d'autorisation est bien proposée au bon moment (après un premier repas noté, par exemple).`)
  if (f.journal.count > 0 && f.journal.photo / f.journal.count < 0.2) out.push(`Seulement ${pct(f.journal.photo, f.journal.count)} % des repas sont notés avec une photo : la bulle « Photo » du journal mérite d'être mise en avant.`)
  if (a.activeInPeriod > 0 && f.sleep.users / a.activeInPeriod < 0.3) out.push(`Le sommeil n'est renseigné que par ${pct(f.sleep.users, a.activeInPeriod)} % des actifs : un rappel du matin ou l'import Santé/Health Connect augmenterait la couverture.`)
  if (a.activeInPeriod > 0 && f.recipes.count === 0) out.push(`Aucune recette créée ou importée sur la période : l'import depuis un lien Instagram/TikTok gagnerait à être présenté sur l'accueil.`)
  if (u.total > 0 && u.profileComplete / u.total < 0.6) out.push(`${pct(u.profileComplete, u.total)} % des profils seulement sont complets (poids, taille, âge) : sans ces données, les objectifs calculés par Waty sont approximatifs.`)
  return out.slice(0, 5)
}

/* ── petits composants ────────────────────────────────────────────────── */

const TONES: Record<string, string> = {
  violet: 'rgba(75,71,160,0.12)', green: 'rgba(34,197,94,0.14)', blue: 'rgba(59,130,246,0.14)', amber: 'rgba(245,158,11,0.16)',
}
function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: keyof typeof TONES }) {
  return (
    <div className="card relative overflow-hidden py-3">
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none" style={{ background: `radial-gradient(closest-side, ${TONES[tone]}, transparent)` }} />
      <p className="text-[11px] font-bold t-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-extrabold t-text tracking-tight mt-0.5 leading-none">{value}</p>
      <p className="text-[11px] t-faint mt-1">{sub}</p>
    </div>
  )
}
function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-raised rounded-2xl px-3 py-2">
      <p className="text-[10px] font-bold t-muted uppercase tracking-wide leading-tight">{label}</p>
      <p className="text-lg font-extrabold t-text leading-tight mt-0.5">{value}</p>
      <p className="text-[10px] t-faint leading-tight">{sub}</p>
    </div>
  )
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-bold bg-raised rounded-full px-2.5 py-1 t-text">{children}</span>
}
function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 t-muted font-semibold truncate">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-raised overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${Math.max(value > 0 ? 3 : 0, (value / max) * 100)}%`, background: color }} /></div>
      <span className="w-8 text-right font-extrabold t-text">{n(value)}</span>
    </div>
  )
}
function Feature({ art, title, count, unit, users, active, extra = [] }: { art: MytaIllustrationName; title: string; count: number; unit: string; users: number; active: number; extra?: string[] }) {
  return (
    <div className="card flex items-center gap-3 py-3">
      <MytaIllustration name={art} size={48} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-extrabold t-text">{title}</p>
          <p className="text-base font-extrabold t-text">{n(count)} <span className="text-[11px] font-bold t-muted">{unit}</span></p>
        </div>
        <p className="text-[11px] t-muted">{n(users)} utilisateur{users > 1 ? 's' : ''} ({pct(users, active)} % des actifs) · {per(count, users)} par utilisateur</p>
        {extra.length > 0 && <p className="text-[11px] t-faint truncate">{extra.join(' · ')}</p>}
      </div>
    </div>
  )
}
function Bars({ data, labels, color }: { data: number[]; labels: string[]; color: string }) {
  const W = 320, H = 72, max = Math.max(1, ...data), gap = data.length > 40 ? 1 : 2
  const bw = (W - gap * (data.length - 1)) / Math.max(1, data.length)
  const first = labels[0], last = labels[labels.length - 1]
  const lbl = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[72px]" preserveAspectRatio="none" role="img" aria-label="Actifs par jour">
        {data.map((v, i) => {
          const h = Math.max(v > 0 ? 3 : 1.5, (v / max) * (H - 4))
          return <rect key={i} x={i * (bw + gap)} y={H - h} width={bw} height={h} rx={Math.min(3, bw / 2)} fill={color} opacity={v > 0 ? 0.9 : 0.18} />
        })}
      </svg>
      <div className="flex justify-between text-[10px] t-faint mt-1"><span>{lbl(first)}</span><span>max {max}</span><span>{lbl(last)}</span></div>
    </div>
  )
}
function MiniSeries({ label, data, color }: { label: string; data: number[]; color: string }) {
  const total = data.reduce((s, v) => s + v, 0)
  const W = 140, H = 28, max = Math.max(1, ...data)
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * W},${H - (v / max) * (H - 2) - 1}`).join(' ')
  return (
    <div className="bg-raised rounded-2xl px-3 py-2">
      <div className="flex items-baseline justify-between"><p className="text-[10px] font-bold t-muted uppercase tracking-wide">{label}</p><p className="text-sm font-extrabold t-text">{n(total)}</p></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-7 mt-1" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" /></svg>
    </div>
  )
}
