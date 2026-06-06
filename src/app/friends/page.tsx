'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Copy, Check, X, UserPlus, Users, Trophy, Shield } from 'lucide-react'


// ── Types ─────────────────────────────────────────────────────
interface GroupMember {
  userId:       string
  isMe:         boolean
  displayName:  string
  score:        number
  streak:       number | null
  privacyLevel: string
  joinedAt:     string
}

interface Group {
  id:          string
  name:        string
  mode:        'equipe' | 'competition'
  invite_code: string
  created_by:  string
  teamScore:   number
  members:     GroupMember[]
}

// ── Composant carte membre ────────────────────────────────────
function MemberRow({ member, rank }: { member: GroupMember; rank: number }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`
  const scoreColor = member.score >= 80 ? 'text-green-600' : member.score >= 50 ? 'text-yellow-600' : 'text-zinc-400'

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${member.isMe ? 'bg-tta-light/50' : ''}`}>
      <span className="text-base w-7 text-center flex-shrink-0">{medal}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-sm font-bold truncate ${member.isMe ? 'text-tta-mid' : 'text-zinc-800'}`}>
            {member.displayName}{member.isMe && <span className="text-xs font-normal text-zinc-400 ml-1">(toi)</span>}
          </p>
        </div>
        {member.streak !== null && (
          <p className="text-[10px] text-zinc-400">🔥 Série {member.streak}j</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-lg font-extrabold ${scoreColor}`}>{member.score}%</p>
        <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-0.5">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${member.score}%`, background: member.score >= 80 ? '#22c55e' : member.score >= 50 ? '#eab308' : '#d1d5db' }} />
        </div>
      </div>
    </div>
  )
}

// ── Floor is Lava — progression Sauver Waty ──────────────────
const LAVA_STAGES = [
  { img: '/lava-0.png',   label: 'Prêt à jouer ! Go Go Go !' },
  { img: '/lava-1.png',   label: 'Connecte-toi tous les jours pour progresser !' },
  { img: '/lava-2.png',   label: 'Super ! Continue comme ça !' },
  { img: '/lava-3.png',   label: "Vous êtes une équipe qui déchire !" },
  { img: '/lava-4.png',   label: 'Encore un petit effort !' },
  { img: '/lava-5.png',   label: 'Waw ! Vous y êtes presque !' },
  { img: '/lava-win.png', label: "Bravo l'équipe des Champions ! 🏆" },
]

function getLavaStage(score: number): number {
  if (score >= 70) return 6
  if (score >= 60) return 5
  if (score >= 45) return 4
  if (score >= 30) return 3
  if (score >= 15) return 2
  if (score >= 1)  return 1
  return 0
}

// ── Composant carte groupe ────────────────────────────────────
function GroupCard({ group, onLeave, onCopyCode }: {
  group: Group
  onLeave: (id: string) => void
  onCopyCode: (code: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const isSaved = group.teamScore >= 70
  const lava    = LAVA_STAGES[getLavaStage(group.teamScore)]

  function handleCopy() {
    onCopyCode(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card flex flex-col gap-0 overflow-hidden p-0">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-zinc-900 text-base">{group.name}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                group.mode === 'equipe' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {group.mode === 'equipe' ? '🤝 Équipe' : '⚔️ Compétition'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{group.members.length} membre{group.members.length > 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => onLeave(group.id)}
            className="p-1.5 rounded-xl hover:bg-red-50 text-zinc-300 hover:text-red-400 transition-colors flex-shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Code invitation */}
        <div className="flex items-center gap-2 bg-zinc-50 rounded-2xl px-4 py-2.5">
          <div className="flex-1">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Code d'invitation</p>
            <p className="text-base font-black tracking-widest text-tta-mid font-mono">{group.invite_code}</p>
          </div>
          <button onClick={handleCopy}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-tta-mid text-white hover:bg-tta'}`}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>

        {/* Floor is Lava — Sauver Waty (mode équipe) */}
        {group.mode === 'equipe' && (
          <div className="flex flex-col gap-2">
            {/* Image de progression */}
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={lava.img}
                alt={lava.label}
                className="w-full object-cover rounded-2xl"
              />
            </div>

            {/* Jauge + score */}
            <div className="bg-zinc-50 rounded-2xl px-4 py-2.5">
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1.5">
                <span>Score équipe cette semaine</span>
                <span className="font-bold text-tta-mid">
                  {group.teamScore}% {isSaved ? '✓ Waty sauvé !' : '— objectif 70%'}
                </span>
              </div>
              <div className="h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${group.teamScore}%`,
                    background: isSaved
                      ? '#22c55e'
                      : 'linear-gradient(90deg, #4B47A0, #2BA8B0)',
                  }} />
              </div>
              {/* Marqueur objectif 70% */}
              <div className="relative h-0">
                <div className="absolute top-0 w-0.5 h-3 bg-zinc-400 rounded-full -translate-y-4"
                  style={{ left: '70%' }} />
              </div>
              <p className="text-[10px] text-zinc-400 text-right mt-2.5">🎯 70% pour sauver Waty</p>
            </div>
          </div>
        )}

        {/* Avertissement compétition */}
        {group.mode === 'competition' && (
          <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-2xl px-3 py-2.5">
            <Shield size={13} className="text-orange-500 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-orange-700 leading-relaxed">
              Compétition bienveillante — vos objectifs personnels restent 100% confidentiels.
              Seul votre % de progression est visible.
            </p>
          </div>
        )}
      </div>

      {/* Classement membres */}
      <div className="border-t border-zinc-100 divide-y divide-zinc-50">
        {group.members.map((m, i) => (
          <MemberRow key={m.userId} member={m} rank={i + 1} />
        ))}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function FriendsPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [groups, setGroups]       = useState<Group[]>([])
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState<'list' | 'create' | 'join'>('list')

  // Création
  const [createName, setCreateName]   = useState('')
  const [createMode, setCreateMode]   = useState<'equipe' | 'competition'>('equipe')
  const [createPrivacy, setCreatePrivacy] = useState<'minimum' | 'standard'>('standard')
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState('')

  // Rejoindre
  const [joinCode, setJoinCode]     = useState('')
  const [joinPrivacy, setJoinPrivacy] = useState<'minimum' | 'standard'>('standard')
  const [joining, setJoining]       = useState(false)
  const [joinError, setJoinError]   = useState('')

  const [toast, setToast] = useState('')

  useEffect(() => { loadGroups() }, [])

  async function getToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) return session.access_token
    // Tente un refresh si la session est expirée
    const { data: { session: refreshed } } = await supabase.auth.refreshSession()
    return refreshed?.access_token ?? ''
  }

  async function loadGroups() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const token = await getToken()
    const res = await fetch('/api/groups', {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setGroups(data.groups ?? [])
    }
    setLoading(false)
  }

  async function handleCreate() {
    if (!createName.trim()) { setCreateError('Donne un nom à ton groupe'); return }
    setCreating(true); setCreateError('')
    const token = await getToken()
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify({ action: 'create', name: createName, mode: createMode, privacyLevel: createPrivacy }),
    })
    const data = await res.json()
    if (!res.ok) { setCreateError(data.error ?? 'Erreur'); setCreating(false); return }
    showToast('Groupe créé ! Partage le code avec tes amis 🎉')
    setCreateName(''); setView('list')
    await loadGroups()
    setCreating(false)
  }

  async function handleJoin() {
    if (!joinCode.trim()) { setJoinError('Entre un code d\'invitation'); return }
    setJoining(true); setJoinError('')
    const token = await getToken()
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify({ action: 'join', inviteCode: joinCode, privacyLevel: joinPrivacy }),
    })
    const data = await res.json()
    if (!res.ok) { setJoinError(data.error ?? 'Code invalide'); setJoining(false); return }
    showToast('Tu as rejoint le groupe ! 🙌')
    setJoinCode(''); setView('list')
    await loadGroups()
    setJoining(false)
  }

  async function handleLeave(groupId: string) {
    if (!confirm('Quitter ce groupe ?')) return
    const token = await getToken()
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify({ action: 'leave', groupId }),
    })
    showToast('Tu as quitté le groupe')
    await loadGroups()
  }

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code)
    showToast('Code copié !')
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-nutri/30 border-t-nutri rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="page">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900">🤝 Amis & Challenges</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Progressez ensemble, sauvez Waty !</p>
      </div>

      {/* Vue liste */}
      {view === 'list' && (
        <>
          {/* Boutons action */}
          <div className="flex gap-2">
            <button onClick={() => { setView('join'); setJoinError('') }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-tta-mid text-tta-mid font-bold text-sm hover:bg-tta-light transition-all">
              <UserPlus size={16} />Rejoindre
            </button>
            <button onClick={() => { setView('create'); setCreateError('') }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-tta-mid text-white font-bold text-sm hover:bg-tta transition-all">
              <Users size={16} />Créer un groupe
            </button>
          </div>

          {/* Groupes */}
          {groups.length === 0 ? (
            <div className="card flex flex-col items-center py-12 gap-4 text-center">
              <img src="/waty-nutrition.png" alt="Waty" className="w-16 h-16 object-contain opacity-60" />
              <div>
                <p className="font-bold text-zinc-700">Pas encore de groupe</p>
                <p className="text-sm text-zinc-400 mt-1">
                  Crée un groupe ou rejoins celui d'un ami avec un code WATY-XXXX.
                </p>
              </div>
              <p className="text-xs text-zinc-400 italic bg-zinc-50 rounded-2xl px-4 py-3 max-w-xs">
                💬 Waty dit : "La motivation décuple quand on est ensemble !"
              </p>
            </div>
          ) : (
            groups.map(g => (
              <GroupCard key={g.id} group={g} onLeave={handleLeave} onCopyCode={handleCopyCode} />
            ))
          )}
        </>
      )}

      {/* Vue rejoindre */}
      {view === 'join' && (
        <div className="card flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-zinc-900">Rejoindre un groupe</h2>
            <button onClick={() => setView('list')} className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400">
              <X size={14} />
            </button>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Code d'invitation</label>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="WATY-XXXX"
              className="input font-mono tracking-widest text-center text-lg font-bold uppercase"
              maxLength={9}
            />
          </div>

          {/* Confidentialité */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Que partager avec le groupe ?</label>
            <div className="flex flex-col gap-2">
              {[
                { value: 'minimum', label: 'Minimum', desc: 'Uniquement mon score %', icon: '🔒' },
                { value: 'standard', label: 'Standard', desc: 'Score + série + badges', icon: '✅' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setJoinPrivacy(opt.value as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all ${
                    joinPrivacy === opt.value ? 'border-tta-mid bg-tta-light' : 'border-zinc-100 bg-zinc-50'
                  }`}>
                  <span>{opt.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">{opt.label}</p>
                    <p className="text-xs text-zinc-400">{opt.desc}</p>
                  </div>
                  {joinPrivacy === opt.value && <span className="ml-auto text-tta-mid font-bold">✓</span>}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-400 mt-2 text-center">
              🔒 Tes objectifs personnels restent toujours confidentiels.
            </p>
          </div>

          {joinError && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{joinError}</p>}

          <button onClick={handleJoin} disabled={joining}
            className="btn-primary justify-center py-3">
            {joining ? <Loader2 size={16} className="animate-spin" /> : <><UserPlus size={16} />Rejoindre</>}
          </button>
        </div>
      )}

      {/* Vue créer */}
      {view === 'create' && (
        <div className="card flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-zinc-900">Créer un groupe</h2>
            <button onClick={() => setView('list')} className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400">
              <X size={14} />
            </button>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Nom du groupe</label>
            <input type="text" value={createName} onChange={e => setCreateName(e.target.value)}
              placeholder="ex: Les Warriors du lundi" className="input" maxLength={40} />
          </div>

          {/* Mode */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Mode</label>
            <div className="flex flex-col gap-2">
              {[
                { value: 'equipe',       label: 'Équipe — Sauver Waty',  desc: 'Coopération : unissez vos forces pour sauver Waty chaque semaine !', icon: '🤝' },
                { value: 'competition',  label: 'Compétition',           desc: 'Classement hebdo — qui est le plus proche de ses objectifs ?',       icon: '⚔️' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setCreateMode(opt.value as any)}
                  className={`flex items-start gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all ${
                    createMode === opt.value ? 'border-tta-mid bg-tta-light' : 'border-zinc-100 bg-zinc-50'
                  }`}>
                  <span className="text-xl flex-shrink-0 mt-0.5">{opt.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-800">{opt.label}</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{opt.desc}</p>
                  </div>
                  {createMode === opt.value && <span className="text-tta-mid font-bold mt-0.5">✓</span>}
                </button>
              ))}
            </div>

            {createMode === 'competition' && (
              <div className="flex items-start gap-2 mt-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5">
                <Shield size={12} className="text-orange-400 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-orange-700 leading-relaxed">
                  La compétition est bienveillante et basée sur le % de progression personnelle.
                  Aucun objectif ni donnée sensible n'est partagé.
                </p>
              </div>
            )}
          </div>

          {/* Confidentialité créateur */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Tes partages</label>
            <div className="flex gap-2">
              {[
                { value: 'minimum', label: '🔒 Minimum' },
                { value: 'standard', label: '✅ Standard' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setCreatePrivacy(opt.value as any)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                    createPrivacy === opt.value ? 'border-tta-mid bg-tta-light text-tta-mid' : 'border-zinc-100 text-zinc-500'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1.5 text-center">
              Minimum = score % · Standard = score + série + badges
            </p>
          </div>

          {createError && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{createError}</p>}

          <button onClick={handleCreate} disabled={creating}
            className="btn-primary justify-center py-3">
            {creating ? <Loader2 size={16} className="animate-spin" /> : <><Trophy size={16} />Créer le groupe</>}
          </button>
        </div>
      )}

    </div>
  )
}
