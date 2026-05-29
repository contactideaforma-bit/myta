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

async function extractMeal(transcript: string): Promise<object> {
  const prompt = `Tu es un expert en nutrition. Analyse cette description de repas et identifie chaque aliment avec ses macronutriments estimés pour 100g et la quantité consommée.

Description : "${transcript}"

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour :
[
  {
    "name": "Nom de l'aliment en français",
    "quantity": <quantité en grammes>,
    "cal": <kcal pour la quantité indiquée>,
    "prot": <protéines en g pour la quantité>,
    "carb": <glucides en g pour la quantité>,
    "fat": <lipides en g pour la quantité>,
    "cat": "fruit|légume|viande|poisson|céréale|produit laitier|légumineuse|matière grasse|boisson|autre"
  }
]

Règles importantes :
- Si la quantité n'est pas précisée, utilise une portion standard réaliste (ex: 1 œuf = 60g, 1 tranche pain = 30g, 1 verre lait = 200ml, 1 assiette riz = 180g cuit)
- Calcule les macros POUR LA QUANTITÉ INDIQUÉE (pas pour 100g)
- Sois précis sur les valeurs nutritionnelles — utilise les valeurs CIQUAL françaises
- Si plusieurs aliments sont mentionnés, liste-les séparément
- Exemples de portions standards : café = 200ml, jus = 150ml, fruit moyen = 150g, yaourt = 125g, fromage = 30g

Exemples d'input → output attendu :
"j'ai mangé deux œufs brouillés avec du pain grillé" → [{"name":"Œuf entier cru","quantity":120,...},{"name":"Pain de mie grillé","quantity":60,...}]
"un bol de céréales avec du lait" → [{"name":"Céréales corn flakes","quantity":40,...},{"name":"Lait demi-écrémé","quantity":200,...}]`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (msg.content[0] as any).text ?? ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('No JSON array in response')
  return JSON.parse(match[0])
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? ''
    let transcript = ''

    if (contentType.includes('application/json')) {
      const { text } = await req.json()
      if (!text?.trim()) return NextResponse.json({ error: 'Texte vide' }, { status: 400 })
      transcript = text.trim()
    } else {
      const formData = await req.formData()
      const audio = formData.get('audio') as Blob | null
      if (!audio) return NextResponse.json({ error: 'Aucun fichier audio' }, { status: 400 })
      transcript = await transcribeAudio(audio)
      if (!transcript.trim()) return NextResponse.json({ error: 'Audio non reconnu, réessayez' }, { status: 400 })
    }

    const foods = await extractMeal(transcript)
    return NextResponse.json({ transcript, foods })
  } catch (err: any) {
    console.error('[voice-meal]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 })
  }
}
