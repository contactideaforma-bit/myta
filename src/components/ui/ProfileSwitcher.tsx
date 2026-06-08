'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, Baby, Users } from 'lucide-react'

interface Member {
  id:          string
  full_name:   string | null
  family_role: string | null
}

interface ChildProfile {
  id:     string
  name:   string
  gender: string | null
}

interface Props { plan: string | null }

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const ROLE_LABEL: Record<string, string> = {
  partner: 'Partenaire',
  child:   'Enfant',
  owner:   'Titulaire',
}

export function ProfileSwitcher({ plan }: Props) {
  const supabase = createClient()
  const ref      = useRef<HTMLDivElement>(null)

  const [open,       setOpen]       = useState(false)
  const [self,       setSelf]       = useState<Member | null>(null)
  const [members,    setMembers]    = useState<Member[]>([])
  const [children,   setChildren]   = useState<ChildProfile[]>([])
  const [activeId,   setActiveId]   = useState('')
  const [activeName, setActiveName] = useState('')
  const [ready,      setReady]      = useState(false)

  const hasFamilyPlan = !!(plan?.includes('couple') || plan?.includes('famille'))

  useEffect(() => {
    if (!hasFamilyPlan) { setReady(true); return }

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setReady(true); return }

      const storedId   = localStorage.getItem('myta_viewing_as_id')   ?? ''
      const storedName = localStorage.getItem('myta_viewing_as_name') ?? ''
      setActiveId(storedId)
      setActiveName(storedName)

      const res = await fetch('/api/family/members', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSelf(data.self)
        const allOthers: Member[] = [
          ...(data.owner ? [{ ...data.owner, family_role: data.owner.family_role ?? 'owner' }] : []),
          ...(data.members ?? []),
        ]
        setMembers(allOthers)
        setChildren(data.children ?? [])
      }
      setReady(true)
    }
    load()
  }, [plan]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  if (!hasFamilyPlan || !ready || !self) return null

  const isOwnProfile = !activeId || activeId === self.id
  const displayName  = isOwnProfile
    ? (self.full_name?.split(' ')[0] ?? 'Moi')
    : (activeName?.split(' ')[0] ?? 'Profil')

  function switchToUser(member: Member | null) {
    if (member) {
      localStorage.setItem('myta_viewing_as_id',   member.id)
      localStorage.setItem('myta_viewing_as_name', member.full_name ?? 'Membre')
    } else {
      localStorage.removeItem('myta_viewing_as_id')
      localStorage.removeItem('myta_viewing_as_name')
    }
    setOpen(false)
    window.location.reload()
  }

  function switchToChild(child: ChildProfile) {
    localStorage.setItem('myta_viewing_as_id',   `ch_${child.id}`)
    localStorage.setItem('myta_viewing_as_name', child.name)
    setOpen(false)
    window.location.reload()
  }

  const hasOthers = members.length > 0 || children.length > 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 text-white text-xs font-bold px-3 py-1.5 rounded-2xl transition-all ${
          isOwnProfile
            ? 'bg-white/20 hover:bg-white/30'
            : 'bg-white/40 hover:bg-white/50 ring-1 ring-white/70'
        }`}
      >
        <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-[9px] font-extrabold">
          {activeId?.startsWith('ch_')
            ? <Baby size={11} />
            : initials(isOwnProfile ? self.full_name : activeName)
          }
        </div>
        <span>{displayName}</span>
        <ChevronDown size={11} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden z-[60]">

          {/* Mon profil */}
          <button
            onClick={() => switchToUser(null)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              isOwnProfile ? 'bg-tta-light' : 'hover:bg-zinc-50'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4B47A0] to-[#2BA8B0] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials(self.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-900 truncate">{self.full_name ?? 'Moi'}</p>
              <p className="text-[10px] text-zinc-400">Mon profil</p>
            </div>
            {isOwnProfile && <div className="w-2 h-2 rounded-full bg-[#4B47A0]" />}
          </button>

          {/* Membres réels (partenaire / owner) */}
          {members.length > 0 && (
            <>
              <div className="h-px bg-zinc-100" />
              {members.map(member => {
                const isActive = activeId === member.id
                return (
                  <button key={member.id}
                    onClick={() => switchToUser(member)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isActive ? 'bg-tta-light' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 text-xs font-bold flex-shrink-0">
                      {initials(member.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900 truncate">{member.full_name ?? 'Membre'}</p>
                      <p className="text-[10px] text-zinc-400">{ROLE_LABEL[member.family_role ?? ''] ?? ''}</p>
                    </div>
                    {isActive && <div className="w-2 h-2 rounded-full bg-[#4B47A0]" />}
                  </button>
                )
              })}
            </>
          )}

          {/* Enfants (child_profiles) */}
          {children.length > 0 && (
            <>
              <div className="h-px bg-zinc-100" />
              {children.map(child => {
                const childId  = `ch_${child.id}`
                const isActive = activeId === childId
                return (
                  <button key={child.id}
                    onClick={() => switchToChild(child)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isActive ? 'bg-tta-light' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Baby size={15} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900 truncate">{child.name}</p>
                      <p className="text-[10px] text-zinc-400">Enfant</p>
                    </div>
                    {isActive && <div className="w-2 h-2 rounded-full bg-[#4B47A0]" />}
                  </button>
                )
              })}
            </>
          )}

          {!hasOthers && (
            <div className="px-4 py-3 border-t border-zinc-100">
              <p className="text-[11px] text-zinc-400 text-center">
                Aucun membre lié pour l'instant.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
