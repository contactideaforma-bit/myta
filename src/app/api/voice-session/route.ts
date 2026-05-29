import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// ─── Transcription Whisper via OpenAI ─────────────────────────────────────────
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

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Whisper error: ${err}`)
  }

  const data = await res.json()
  return data.text ?? ''
}

// ─── Extraction Claude ────────────────────────────────────────────────────────
async function extractSession(transcript: string): Promise<object> {
  const prompt = `Tu es un assistant fitness. Analyse cette description d'entraînement et extrait les données structurées.

Transcription : "${transcript}"

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour :
{
  "discipline": "natation|musculation|cardio|boxe",
  "duration_min": <nombre entier>,
  "exercises": [
    {
      "name": "nom de l'exercice en français",
      "sets": <nombre ou null>,
      "reps": <nombre ou null>,
      "duration_sec": <secondes ou null>,
      "tips": ""
    }
  ],
  "notes": "résumé court de la séance",
  "calories_estimate": <estimation kcal ou null>
}

Règles :
- discipline : choisis la plus proche (cardio pour tapis, vélo, course ; musculation pour poids, machines ; natation pour piscine ; boxe pour combat)
- duration_min : durée totale en minutes
- exercises : liste des exercices mentionnés. Si durée mentionnée → duration_sec, sinon sets+reps
- Pour "15 min de tapis marche rapide" → { name: "Tapis de marche rapide", duration_sec: 900 }
- Pour "30 reps de pompes" → { name: "Pompes", sets: 3, reps: 30 }
- calories_estimate : estimation basée sur la durée et l'intensité (null si pas assez d'info)
- notes : reformulation courte et claire de la séance`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (msg.content[0] as any).text ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in response')
  return JSON.parse(match[0])
}

// ─── Route POST /api/voice-session ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audio = formData.get('audio') as Blob | null

    if (!audio) {
      return NextResponse.json({ error: 'Aucun fichier audio' }, { status: 400 })
    }

    // 1. Transcription
    const transcript = await transcribeAudio(audio)
    if (!transcript.trim()) {
      return NextResponse.json({ error: 'Audio non reconnu, réessayez' }, { status: 400 })
    }

    // 2. Extraction des données
    const sessionData = await extractSession(transcript)

    return NextResponse.json({ transcript, session: sessionData })
  } catch (err: any) {
    console.error('[voice-session]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 })
  }
}
