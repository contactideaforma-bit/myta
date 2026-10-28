/**
 * /api/admin/demo — profil de démonstration pour captures d'écran et bilan partageable.
 * POST   → crée ou remet à zéro demo@mytwinapp.fr : Léa, 34 ans, post-partum + allaitement,
 *          maladie inflammatoire chronique ; 7 jours de repas, 2 séances, sommeil insuffisant, pesées.
 *          Renvoie e-mail + mot de passe pour se connecter dans l'app.
 * DELETE → supprime le compte de démo et toutes ses données.
 * Aucune donnée réelle : tout est fictif et étiqueté comme tel.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, supabaseAdmin, findUserByEmail, tempPassword } from '@/lib/admin'

export const dynamic = 'force-dynamic'

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@mytwinapp.fr'
const DISC_CARDIO = 'a3fcb39c-c370-4422-949a-217213fd271b'
const DISC_MUSCU  = '3ddad1ce-9143-4e9a-897c-f51d3ef1c508'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function day(offset: number) { const d = new Date(); d.setDate(d.getDate() - offset); return iso(d) }

// Repas d'une jeune maman qui allaite, avec une maladie inflammatoire : plutôt sains, souvent trop légers,
// quelques oublis (jour -3 presque vide, jour -5 sans dîner), un peu de sucre les soirs de fatigue.
type Meal = [string, string, number, number, number, number, number]   // nom, cat, quantité g, kcal, prot, carb, fat
const BREAKFASTS: Meal[][] = [
  [['Flocons d\'avoine au lait', 'céréale', 250, 310, 12, 46, 8], ['Banane', 'fruit', 120, 107, 1.3, 23, 0.4], ['Amandes', 'autre', 20, 116, 4, 2, 10]],
  [['Pain complet', 'céréale', 70, 175, 7, 32, 1.5], ['Beurre', 'matière grasse', 10, 73, 0, 0, 8], ['Yaourt nature', 'produit laitier', 125, 75, 5, 6, 3.5], ['Kiwi', 'fruit', 90, 52, 1, 11, 0.5]],
  [['Café au lait', 'boisson', 200, 60, 3, 5, 3], ['Biscotte', 'céréale', 25, 100, 3, 18, 1.5]],
  [['Porridge aux fruits rouges', 'céréale', 280, 290, 10, 44, 7], ['Œuf dur', 'autre', 55, 78, 6.5, 0.5, 5.5]],
]
const LUNCHES: Meal[][] = [
  [['Saumon au four', 'poisson', 130, 270, 27, 0, 18], ['Riz complet', 'céréale', 180, 200, 5, 42, 1.5], ['Brocoli vapeur', 'légume', 150, 52, 4, 6, 0.5], ['Huile d\'olive', 'matière grasse', 10, 90, 0, 0, 10]],
  [['Poulet rôti', 'viande', 140, 230, 36, 0, 9], ['Patate douce', 'légume', 200, 180, 3, 40, 0.3], ['Salade verte', 'légume', 80, 14, 1, 2, 0.2], ['Vinaigrette', 'matière grasse', 15, 85, 0, 1, 9]],
  [['Lentilles corail au curry', 'légumineuse', 300, 330, 18, 48, 7], ['Pain complet', 'céréale', 40, 100, 4, 18, 1]],
  [['Pâtes complètes au thon', 'céréale', 320, 440, 26, 60, 10], ['Tomates cerises', 'légume', 100, 20, 1, 4, 0.2]],
]
const DINNERS: Meal[][] = [
  [['Soupe de légumes', 'légume', 350, 120, 4, 20, 2], ['Fromage de chèvre', 'produit laitier', 30, 90, 6, 1, 7], ['Pain', 'céréale', 50, 135, 4.5, 27, 1]],
  [['Omelette aux épinards', 'autre', 200, 280, 20, 4, 20], ['Pain complet', 'céréale', 40, 100, 4, 18, 1]],
  [['Quinoa, pois chiches et légumes rôtis', 'légumineuse', 320, 420, 16, 58, 13]],
  [['Sardines à l\'huile', 'poisson', 90, 190, 21, 0, 12], ['Pommes de terre vapeur', 'légume', 200, 170, 4, 38, 0.2], ['Haricots verts', 'légume', 150, 45, 3, 7, 0.3]],
]
const SNACKS: Meal[] = [
  ['Carré de chocolat noir', 'autre', 20, 110, 1.5, 9, 7], ['Pomme', 'fruit', 150, 78, 0.5, 18, 0.3],
  ['Compote sans sucre', 'fruit', 100, 60, 0.3, 14, 0.2], ['Biscuits sablés', 'autre', 40, 200, 2, 26, 10], ['Noix', 'autre', 25, 165, 4, 3, 16],
]
const SUPPLEMENTS: Meal[] = [['Fer + vitamine C', 'complément', 1, 0, 0, 0, 0], ['Oméga-3', 'complément', 1, 10, 0, 0, 1]]

export async function POST(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error

  // 1. Compte
  const password = tempPassword()
  let userId: string
  const existing = await findUserByEmail(DEMO_EMAIL)
  if (existing) {
    userId = existing.id
    await supabaseAdmin.auth.admin.updateUserById(userId, { password })
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email: DEMO_EMAIL, password, email_confirm: true, user_metadata: { full_name: 'Léa', demo: true } })
    if (error || !data.user) return NextResponse.json({ error: error?.message ?? 'Création impossible' }, { status: 500 })
    userId = data.user.id
  }

  // 2. Profil : Léa, 34 ans, 63 kg / 165 cm, post-partum + allaitement, maladie inflammatoire chronique
  const birth = new Date(); birth.setFullYear(birth.getFullYear() - 34); birth.setMonth(2, 14)
  const { error: pErr } = await supabaseAdmin.from('profiles').upsert({
    id: userId, full_name: 'Léa (démo)', email: DEMO_EMAIL, sex: 'femme', birth_date: iso(birth),
    weight_kg: 63, height_cm: 165, activity_factor: 1.375, goal: 'Retrouver de l\'énergie et comprendre mon corps',
    condition: 'post-partum-allait', health_conditions: ['inflammatoire'], smoking_goal: false,
    calorie_target: 2300, prot_target: 105, carb_target: 270, fat_target: 80, weight_goal: null,
    plan: 'premium', subscription_status: 'vip', access_until: null, onboarding_step: 'done',
  }, { onConflict: 'id' })
  if (pErr) return NextResponse.json({ error: `Profil : ${pErr.message}` }, { status: 500 })

  // 3. Remise à zéro des données
  for (const t of ['journal_entries', 'sessions', 'sleep_log', 'weight_log', 'activity_days', 'smoking_log']) {
    await supabaseAdmin.from(t).delete().eq('user_id', userId)
  }

  // 4. Sept jours (J-6 … aujourd'hui)
  const journal: any[] = [], sessions: any[] = [], sleep: any[] = [], days: any[] = []
  const stamp = (d: string, h: number) => `${d}T${String(h).padStart(2, '0')}:${String(10 + Math.floor(Math.random() * 40)).padStart(2, '0')}:00+01:00`
  const push = (d: string, hour: number, m: Meal) => journal.push({ user_id: userId, date: d, food_id: null, food_name: m[0], food_cat: m[1], quantity: m[2], cal: m[3], prot: m[4], carb: m[5], fat: m[6], created_at: stamp(d, hour) })
  for (let i = 6; i >= 0; i--) {
    const d = day(i)
    days.push({ user_id: userId, day: d })
    if (i === 3) { push(d, 8, BREAKFASTS[2][0]); push(d, 8, BREAKFASTS[2][1]); continue }   // journée presque vide (bébé malade)
    for (const m of BREAKFASTS[i % BREAKFASTS.length]) push(d, 8, m)
    for (const m of LUNCHES[(i + 1) % LUNCHES.length]) push(d, 13, m)
    if (i !== 1) push(d, 16, SNACKS[i % SNACKS.length])
    if (i !== 5) for (const m of DINNERS[i % DINNERS.length]) push(d, 20, m)          // J-5 : dîner sauté
    if (i === 0 || i === 2 || i === 4) push(d, 22, SNACKS[3])                            // sablés les soirs de fatigue
    if (i % 2 === 0) for (const m of SUPPLEMENTS) push(d, 9, m)
    // Sommeil : nuits courtes et hachées (réveils de bébé), une seule nuit correcte
    const mins = [330, 345, 300, 420, 315, 360, 335][6 - i]
    // duration_min est calculée par la base (colonne générée) à partir de bedtime / wake_time
    const bedMin = i === 3 ? 10 : 23 * 60 + 20
    const bed = `${String(Math.floor(bedMin / 60)).padStart(2, '0')}:${String(bedMin % 60).padStart(2, '0')}`
    const wakeTotal = (bedMin + mins) % (24 * 60)
    const wake = `${String(Math.floor(wakeTotal / 60)).padStart(2, '0')}:${String(wakeTotal % 60).padStart(2, '0')}`
    sleep.push({ user_id: userId, date: d, bedtime: bed, wake_time: wake, notes: i === 3 ? 'Réveillée 3 fois, bébé fiévreux' : i === 1 ? 'Une vraie nuit, enfin' : null })
  }
  sessions.push({ user_id: userId, discipline_id: DISC_CARDIO, session_date: day(5), duration_min: 30, calories_burned: 130, notes: 'Marche rapide avec la poussette' })
  sessions.push({ user_id: userId, discipline_id: DISC_MUSCU,  session_date: day(2), duration_min: 20, calories_burned: 90,  notes: 'Renfo doux périnée et dos, à la maison' })
  const weights = [{ user_id: userId, date: day(6), weight_kg: 63.4 }, { user_id: userId, date: day(2), weight_kg: 63.0 }]

  const errs: string[] = []
  for (const [t, rows] of [['journal_entries', journal], ['sessions', sessions], ['sleep_log', sleep], ['weight_log', weights], ['activity_days', days]] as const) {
    const { error } = await supabaseAdmin.from(t).insert(rows as any[])
    if (error) errs.push(`${t} : ${error.message}`)
  }
  if (errs.length) return NextResponse.json({ error: errs.join(' · ') }, { status: 500 })

  return NextResponse.json({ ok: true, email: DEMO_EMAIL, password, name: 'Léa', meals: journal.length, sessions: sessions.length, nights: sleep.length })
}

export async function DELETE(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error
  const existing = await findUserByEmail(DEMO_EMAIL)
  if (!existing) return NextResponse.json({ ok: true, deleted: false })
  const { error } = await supabaseAdmin.auth.admin.deleteUser(existing.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted: true })
}
