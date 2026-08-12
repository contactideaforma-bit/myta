'use client'

/**
 * Tuto d'introduction MYTA — parcours post-inscription.
 * Accompagne le nouvel utilisateur pour renseigner ses informations
 * (profil complet → calcul calories/macros) puis lance la découverte
 * de l'app (tour spotlight sur le dashboard via ?welcome=1).
 * Chaque étape est skippable ; « Passer l'introduction » saute tout.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { hasActiveAccess } from '@/lib/access'
import { advanceOnboarding } from '@/lib/onboarding'
import {
  ArrowLeft, ArrowRight, Check, Loader2,
  Salad, Dumbbell, Moon, Bot, BarChart3, Target,
  Flame, Beef, Wheat, Droplet,
} from 'lucide-react'

// ─── Étapes ───────────────────────────────────────────────────────────────────
type StepId = 'welcome' | 'name' | 'about' | 'body' | 'goal' | 'activity' | 'ready'

const STEPS: { id: StepId; title: string; subtitle: string }[] = [
  { id: 'welcome',  title: 'Bienvenue sur MYTA',
    subtitle: 'Ton coach digital nutrition, sport & sommeil. 2 minutes pour tout personnaliser — tu peux passer chaque étape.' },
  { id: 'name',     title: 'Comment tu t’appelles ?',
    subtitle: 'Waty, ton coach IA, veut savoir comment t’appeler.' },
  { id: 'about',    title: 'Parle-nous de toi',
    subtitle: 'Ton sexe et ton année de naissance servent au calcul de tes besoins caloriques.' },
  { id: 'body',     title: 'Poids & taille',
    subtitle: 'Indispensables pour des calories et des macros vraiment adaptées à toi.' },
  { id: 'goal',     title: 'Quel est ton objectif ?',
    subtitle: 'On personnalise ton expérience en fonction de tes ambitions.' },
  { id: 'activity', title: 'Ton niveau d’activité ?',
    subtitle: 'Pour calculer tes besoins caloriques avec précision.' },
  { id: 'ready',    title: 'Tout est prêt !',
    subtitle: 'Voici ce que MYTA a calculé pour toi. Modifiable à tout moment dans ton profil.' },
]

const FEATURES = [
  { Icon: Salad, label: 'Journal alimentaire avec IA' },
  { Icon: Dumbbell, label: 'Suivi sportif et Tabata' },
  { Icon: Moon, label: 'Analyse du sommeil' },
  { Icon: Bot, label: 'Coach Waty personnalisé' },
  { Icon: BarChart3, label: 'Bilan santé hebdomadaire' },
]

const GOALS = [
  { value: 'perte de poids', label: 'Perdre du poids',     desc: 'Déficit calorique, cardio' },
  { value: 'prise de masse', label: 'Prendre de la masse', desc: 'Surplus calorique, musculation' },
  { value: 'forme generale', label: 'Forme générale',       desc: 'Équilibre et bien-être' },
  { value: 'endurance',      label: 'Endurance',            desc: 'Cardio, résistance' },
  { value: 'performance',    label: 'Performance',          desc: 'Optimisation sportive' },
]

const ACTIVITIES = [
  { value: 1.2,   label: 'Sédentaire',       desc: 'Bureau, peu de sport' },
  { value: 1.375, label: 'Légèrement actif',  desc: '1 à 3 séances par semaine' },
  { value: 1.55,  label: 'Modérément actif',  desc: '3 à 5 séances par semaine' },
  { value: 1.725, label: 'Très actif',         desc: '6 à 7 séances par semaine' },
  { value: 1.9,   label: 'Extrêmement actif', desc: 'Sport intensif quotidien' },
]

// ─── Calculs (mêmes formules que /profile : Mifflin-St Jeor) ──────────────────
function calcTDEE(w: number, h: number, age: number, sex: string, activity: number) {
  const bmr = sex === 'femme'
    ? 10 * w + 6.25 * h - 5 * age - 161
    : 10 * w + 6.25 * h - 5 * age + 5
  return { bmr: Math.round(bmr), tdee: Math.round(bmr * activity) }
}

/** Macros suggérées — aligné sur computeMacros() de /profile. */
function suggestMacros(cal: number, weight: number | null, goal: string) {
  const protPerKg: Record<string, number> = {
    'perte de poids': 1.8, 'prise de masse': 1.6, 'endurance': 1.8,
    'performance': 1.8, 'forme generale': 1.4,
  }
  const prot = weight
    ? Math.round(weight * (protPerKg[goal] ?? 1.4))
    : Math.round(cal * 0.25 / 4)
  const remaining = cal - prot * 4
  const carb = Math.round(remaining * 0.6 / 4)
  const fat  = Math.round((remaining - carb * 4) / 9)
  return { prot, carb, fat }
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [stepIdx, setStepIdx] = useState(0)
  const [saving,  setSaving]  = useState(false)

  // Champs collectés (tous optionnels — chaque étape est skippable)
  const [name,      setName]      = useState('')
  const [sex,       setSex]       = useState<'homme' | 'femme' | ''>('')
  const [birthYear, setBirthYear] = useState('')
  const [weight,    setWeight]    = useState('')
  const [height,    setHeight]    = useState('')
  const [goal,      setGoal]      = useState('')
  const [activity,  setActivity]  = useState<number | null>(null)

  const step     = STEPS[stepIdx]
  const isLast   = stepIdx === STEPS.length - 1
  const progress = ((stepIdx + 1) / STEPS.length) * 100

  // Pré-remplir le prénom depuis le compte + exiger une session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }
      const n = session.user.user_metadata?.full_name?.split(' ')[0]
      if (n) setName(prev => prev || n)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Récap calculé (uniquement si assez d'infos)
  const summary = useMemo(() => {
    const w = parseFloat(weight), h = parseFloat(height), y = parseInt(birthYear)
    if (!w || !h || !y || !sex || !activity) return null
    const age = new Date().getFullYear() - y
    if (age < 13 || age > 100) return null
    const { bmr, tdee } = calcTDEE(w, h, age, sex, activity)
    return { bmr, tdee, macros: suggestMacros(tdee, w, goal) }
  }, [weight, height, birthYear, sex, activity, goal])

  // ── Sauvegarde + sortie du tuto ─────────────────────────────────────────────
  async function finish(skipped: boolean) {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }

      // 1. Enregistrer tout ce qui a été renseigné
      const updates: Record<string, unknown> = {}
      if (name.trim())  updates.full_name = name.trim()
      if (sex)          updates.sex = sex
      if (parseInt(birthYear) > 1900) updates.birth_date = `${parseInt(birthYear)}-01-01`
      if (parseFloat(weight) > 0)     updates.weight_kg  = parseFloat(weight)
      if (parseFloat(height) > 0)     updates.height_cm  = parseFloat(height)
      if (goal)         updates.goal = goal
      if (activity)     updates.activity_factor = activity
      if (summary) {
        updates.calorie_target = summary.tdee
        updates.prot_target    = summary.macros.prot
        updates.carb_target    = summary.macros.carb
        updates.fat_target     = summary.macros.fat
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('profiles').upsert({ id: user.id, ...updates }, { onConflict: 'id' })
      }

      // 2. Profil complet → le parcours Waty saute l'étape « profile »
      if (summary && goal) await advanceOnboarding(user.id, 'profile')

      // 3. Destination : dashboard (tour guidé) si accès actif, sinon paywall
      const { data: profile } = await supabase
        .from('profiles').select('subscription_status, trial_ends_at').eq('id', user.id).single()
      const hasAccess = hasActiveAccess(profile?.subscription_status, profile?.trial_ends_at)
      router.push(hasAccess ? (skipped ? '/dashboard' : '/dashboard?welcome=1') : '/pricing')
    } catch (err) {
      console.error(err)
      router.push('/dashboard')
    }
  }

  function handleNext() {
    if (isLast) { finish(false); return }
    setStepIdx(i => i + 1)
  }
  function handleSkipStep() {
    if (isLast) { finish(false); return }
    setStepIdx(i => i + 1)
  }

  function canProceed() {
    if (step.id === 'name')     return name.trim().length > 0
    if (step.id === 'about')    return !!sex && parseInt(birthYear) > 1900 && parseInt(birthYear) <= new Date().getFullYear() - 13
    if (step.id === 'body')     return parseFloat(weight) > 0 && parseFloat(height) > 0
    if (step.id === 'goal')     return !!goal
    if (step.id === 'activity') return !!activity
    return true
  }

  const inputCls = 'w-full px-4 py-3.5 border-2 border-zinc-200 rounded-2xl text-sm bg-white ' +
    'focus:outline-none focus:border-[#4B47A0] focus:ring-2 focus:ring-[#4B47A0]/15 transition-all'

  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-5 py-10 page-gradient">
      <div className="w-full max-w-sm flex flex-col gap-6 flex-1">

        {/* Logo */}
        <div className="flex justify-center">
          <img src="/logo_my_twin_app.png" alt="MYTA" className="h-10 object-contain" />
        </div>

        {/* Progression */}
        <div>
          <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-zinc-400">Étape {stepIdx + 1} sur {STEPS.length}</p>
            <button onClick={() => finish(true)} disabled={saving}
              className="text-xs text-zinc-400 hover:text-zinc-600 underline disabled:opacity-50">
              Passer l&apos;introduction
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex flex-col gap-6 flex-1">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{step.title}</h1>
            <p className="text-zinc-500 text-sm mt-2 leading-relaxed">{step.subtitle}</p>
          </div>

          {/* ── welcome ── */}
          {step.id === 'welcome' && (
            <div className="flex flex-col gap-3">
              {FEATURES.map(f => (
                <div key={f.label} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm">
                  <f.Icon size={19} className="text-tta-mid" />
                  <p className="text-sm font-semibold text-zinc-800">{f.label}</p>
                  <Check size={16} className="ml-auto text-nutri-mid" />
                </div>
              ))}
            </div>
          )}

          {/* ── name ── */}
          {step.id === 'name' && (
            <input type="text" placeholder="Ton prénom" value={name} autoFocus
              onChange={e => setName(e.target.value)} className={inputCls} />
          )}

          {/* ── about ── */}
          {step.id === 'about' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2">
                {(['homme', 'femme'] as const).map(s => (
                  <button key={s} onClick={() => setSex(s)}
                    className={`bg-white rounded-2xl px-4 py-4 shadow-sm border-2 transition-all text-sm font-bold text-zinc-900 ${
                      sex === s ? 'border-tta-mid bg-tta-light' : 'border-transparent hover:border-zinc-200'}`}>
                    {s === 'homme' ? 'Homme' : 'Femme'}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 mb-1.5 block">Année de naissance</label>
                <input type="number" inputMode="numeric" placeholder="Ex : 1990" value={birthYear}
                  min={1920} max={new Date().getFullYear() - 13}
                  onChange={e => setBirthYear(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          {/* ── body ── */}
          {step.id === 'body' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-500 mb-1.5 block">Poids (kg)</label>
                <input type="number" inputMode="decimal" placeholder="70" value={weight}
                  min={30} max={300} onChange={e => setWeight(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 mb-1.5 block">Taille (cm)</label>
                <input type="number" inputMode="numeric" placeholder="175" value={height}
                  min={100} max={250} onChange={e => setHeight(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          {/* ── goal / activity ── */}
          {(step.id === 'goal' || step.id === 'activity') && (
            <div className="flex flex-col gap-2">
              {(step.id === 'goal' ? GOALS : ACTIVITIES).map(opt => {
                const selected = step.id === 'goal' ? goal === opt.value : activity === opt.value
                return (
                  <button key={String(opt.value)}
                    onClick={() => step.id === 'goal' ? setGoal(opt.value as string) : setActivity(opt.value as number)}
                    className={`flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-sm border-2 transition-all text-left ${
                      selected ? 'border-tta-mid bg-tta-light' : 'border-transparent hover:border-zinc-200'}`}>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-zinc-900">{opt.label}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{opt.desc}</p>
                    </div>
                    {selected && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #4B47A0, #2BA8B0)' }}>
                        <Check size={13} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* ── ready ── */}
          {step.id === 'ready' && (
            <div className="flex flex-col items-center gap-5">
              <Target size={60} className="mx-auto text-tta-mid animate-bounce" strokeWidth={1.5} />

              {summary ? (
                <div className="bg-white rounded-2xl p-5 shadow-sm w-full flex flex-col gap-3">
                  <p className="text-sm font-bold text-zinc-900">
                    {name ? `${name}, voici` : 'Voici'} tes objectifs quotidiens :
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Calories',  val: `${summary.tdee}`,        unit: 'kcal', color: '#f97316', Icon: Flame },
                      { label: 'Protéines', val: `${summary.macros.prot}`, unit: 'g',    color: '#3b82f6', Icon: Beef },
                      { label: 'Glucides',  val: `${summary.macros.carb}`, unit: 'g',    color: '#22c55e', Icon: Wheat },
                      { label: 'Lipides',   val: `${summary.macros.fat}`,  unit: 'g',    color: '#eab308', Icon: Droplet },
                    ].map(m => (
                      <div key={m.label} className="bg-zinc-50 rounded-2xl p-3 text-center">
                        <m.Icon size={17} style={{ color: m.color }} className="mx-auto mb-1" />
                        <p className="text-lg font-black" style={{ color: m.color }}>
                          {m.val}<span className="text-xs font-semibold text-zinc-400"> {m.unit}</span>
                        </p>
                        <p className="text-[10px] text-zinc-400 font-semibold">{m.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Formule Mifflin-St Jeor · métabolisme de base {summary.bmr} kcal.
                    Ajustable à tout moment dans Profil.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-5 shadow-sm w-full">
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    Tu pourras compléter tes infos plus tard dans <span className="font-bold">Profil</span> —
                    Waty t&apos;y guidera pour calculer tes calories et macros personnalisées.
                  </p>
                </div>
              )}

              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm w-full flex items-center gap-2 text-sm text-zinc-600">
                <Check size={14} className="text-nutri-mid flex-shrink-0" />
                <span>3 jours d&apos;essai gratuit inclus</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {stepIdx > 0 && (
              <button onClick={() => setStepIdx(i => i - 1)} disabled={saving}
                className="w-12 h-[52px] rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 hover:bg-zinc-50 transition-colors disabled:opacity-50">
                <ArrowLeft size={17} className="text-zinc-500" />
              </button>
            )}
            <button onClick={handleNext} disabled={!canProceed() || saving}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
              {saving ? (
                <><Loader2 size={18} className="animate-spin" />Sauvegarde…</>
              ) : isLast ? (
                <>Découvrir MYTA <ArrowRight size={18} /></>
              ) : step.id === 'welcome' ? (
                <>C&apos;est parti <ArrowRight size={18} /></>
              ) : (
                <>Continuer <ArrowRight size={18} /></>
              )}
            </button>
          </div>

          {/* Skip d'étape (pas sur welcome ni ready) */}
          {step.id !== 'welcome' && !isLast && (
            <button onClick={handleSkipStep} disabled={saving}
              className="self-center text-xs text-zinc-400 hover:text-zinc-600 underline disabled:opacity-50">
              Passer cette étape
            </button>
          )}
        </div>

        {/* Legal */}
        {stepIdx === 0 && (
          <p className="text-center text-xs text-zinc-400">
            En continuant, tu acceptes nos{' '}
            <a href="/legal" className="text-tta-mid hover:underline">CGU</a>
            {' '}et notre{' '}
            <a href="/legal#confidentialite" className="text-tta-mid hover:underline">politique de confidentialité</a>
          </p>
        )}
      </div>
    </div>
  )
}
