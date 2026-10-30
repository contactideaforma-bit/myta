import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit } from '@/lib/auth'
import { checkAiQuota } from '@/lib/ai-guard'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic()

async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model', 'whisper-1')
  formData.append('language', 'fr')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  })
  if (!res.ok) throw new Error(`Whisper error: ${await res.text()}`)
  const data = await res.json()
  return data.text ?? ''
}

async function extractSession(transcript: string, ctx: { sex?: string | null; age?: number | null; weight?: number | null; condition?: string | null }): Promise<object> {
  const who = [ctx.sex === 'femme' ? 'femme' : ctx.sex === 'homme' ? 'homme' : null, ctx.age ? `${ctx.age} ans` : null, ctx.weight ? `${ctx.weight} kg` : null, ctx.condition ? `condition : ${ctx.condition}` : null].filter(Boolean).join(', ')
  const prompt = `Tu es Waty, le coach sportif de l'app MYTA (ton complice, motivant, tutoiement, jamais culpabilisant, aucun emoji). Analyse cette description de séance et renvoie des données structurées + un commentaire positif.

Description : "${transcript}"
${who ? `Personne : ${who}.` : ''}

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour :
{
  "discipline": "natation|musculation|cardio|boxe",
  "activity_label": "nom précis de l'activité, 2-4 mots (ex. Marche rapide, Équitation, Vélo elliptique, Renfo haut du corps, Yoga doux)",
  "intensity": "douce|modérée|intense",
  "duration_min": <nombre entier>,
  "exercises": [ { "name": "nom de l'exercice en français", "sets": <nombre ou null>, "reps": <nombre ou null>, "duration_sec": <secondes ou null>, "tips": "" } ],
  "muscles": ["zones ou qualités sollicitées, 2 à 4, courtes : Jambes, Fessiers, Cardio, Gainage, Équilibre, Dos, Bras, Souffle…"],
  "benefits": ["3 bienfaits concrets et VRAIS de cette activité précise, 6 à 12 mots chacun (ex. pour la marche : circulation et cœur, articulations ménagées, baisse du stress ; pour l'équitation : posture et gainage profond, équilibre, lien apaisant avec l'animal)"],
  "waty_comment": "2 phrases chaleureuses de Waty sur CETTE séance : ce qu'elle apporte à cette personne, puis un encouragement concret. Tutoiement, zéro culpabilisation, aucun emoji.",
  "notes": "résumé court de la séance (une ligne)",
  "calories_estimate": <estimation kcal ou null>
}

Règles :
- discipline : cardio pour marche/course/vélo/tapis/équitation/danse/randonnée, musculation pour poids/machines/renfo/yoga/pilates, natation pour piscine, boxe pour sports de combat
- duration_min : durée totale en minutes (si absente, estime-la raisonnablement et reste modeste)
- Pour "15 min de tapis" → { name: "Tapis de marche rapide", duration_sec: 900 } ; pour "3 séries de 12 squats" → { name: "Squats", sets: 3, reps: 12 }
- calories_estimate : selon durée, intensité et poids si connu (null si vraiment insuffisant)
- Adapte le commentaire à la condition si elle est donnée (post-partum, grossesse, périménopause, arrêt du tabac…) : valorise l'effort adapté, ne propose rien de risqué.`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = (msg.content[0] as any).text ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in response')
  const data = JSON.parse(match[0])
  return {
    ...data,
    activity_label: String(data.activity_label ?? '').slice(0, 40) || null,
    intensity: ['douce', 'modérée', 'intense'].includes(data.intensity) ? data.intensity : 'modérée',
    muscles: Array.isArray(data.muscles) ? data.muscles.map(String).slice(0, 4) : [],
    benefits: Array.isArray(data.benefits) ? data.benefits.map(String).slice(0, 3) : [],
    waty_comment: String(data.waty_comment ?? '').slice(0, 400) || null,
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  if (!checkRateLimit(auth.userId, 20)) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }
  const aiCheck = await checkAiQuota(auth.userId, 'sport')
  if (!aiCheck.allowed) return aiCheck.error!

  try {
    const contentType = req.headers.get('content-type') ?? ''
    let transcript = ''

    if (contentType.includes('application/json')) {
      // Mode texte
      const { text } = await req.json()
      if (!text?.trim()) return NextResponse.json({ error: 'Texte vide' }, { status: 400 })
      transcript = text.trim()
    } else {
      // Mode audio (multipart)
      const formData = await req.formData()
      const audio = formData.get('audio') as File | null
      if (!audio) return NextResponse.json({ error: 'Aucun fichier audio' }, { status: 400 })

      // Limite taille : 10 MB
      if (audio.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Fichier trop volumineux (max 10 MB)' }, { status: 413 })
      }

      // Validation type MIME
      const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-m4a']
      if (!allowedTypes.includes(audio.type)) {
        return NextResponse.json({ error: 'Format audio non supporté' }, { status: 415 })
      }

      transcript = await transcribeAudio(audio)
      if (!transcript.trim()) return NextResponse.json({ error: 'Audio non reconnu, réessayez' }, { status: 400 })
    }

    // Contexte léger (sexe, âge, poids, condition) pour un commentaire et des calories plus justes
    let ctx: { sex?: string | null; age?: number | null; weight?: number | null; condition?: string | null } = {}
    try {
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
      const { data: p } = await admin.from('profiles').select('sex, birth_date, weight_kg, condition').eq('id', auth.userId).maybeSingle()
      if (p) ctx = { sex: p.sex, age: p.birth_date ? new Date().getFullYear() - new Date(p.birth_date).getFullYear() : null, weight: p.weight_kg, condition: p.condition }
    } catch { /* contexte facultatif */ }
    const session = await extractSession(transcript, ctx)
    return NextResponse.json({ transcript, session })
  } catch (err: any) {
    console.error('[voice-session]', err)
    return NextResponse.json({ error: 'Erreur lors du traitement audio' }, { status: 500 })
  }
}
