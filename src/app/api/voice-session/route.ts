import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

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

async function extractSession(transcript: string): Promise<object> {
  const prompt = `Tu es un assistant fitness. Analyse cette description d'entraînement et extrait les données structurées.

Description : "${transcript}"

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
- discipline : cardio pour tapis/vélo/course, musculation pour poids/machines, natation pour piscine, boxe pour combat
- duration_min : durée totale en minutes
- Pour "15 min de tapis" → { name: "Tapis de marche rapide", duration_sec: 900 }
- Pour "3 séries de 12 squats" → { name: "Squats", sets: 3, reps: 12 }
- calories_estimate : estimation selon durée et intensité (null si insuffisant)
- notes : reformulation courte et claire`

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

export async function POST(req: NextRequest) {
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
      const audio = formData.get('audio') as Blob | null
      if (!audio) return NextResponse.json({ error: 'Aucun fichier audio' }, { status: 400 })
      transcript = await transcribeAudio(audio)
      if (!transcript.trim()) return NextResponse.json({ error: 'Audio non reconnu, réessayez' }, { status: 400 })
    }

    const session = await extractSession(transcript)
    return NextResponse.json({ transcript, session })
  } catch (err: any) {
    console.error('[voice-session]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 })
  }
}
