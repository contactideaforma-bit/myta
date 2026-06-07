import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  if (!checkRateLimit(auth.userId, 10)) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  try {
    const formData = await req.formData()
    const image = formData.get('image') as File | null
    if (!image) return NextResponse.json({ error: 'Aucune image' }, { status: 400 })

    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image trop volumineuse (max 5 Mo)' }, { status: 413 })
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    const mime = image.type || 'image/jpeg'
    if (!allowedTypes.includes(mime)) {
      return NextResponse.json({ error: 'Format image non supporté' }, { status: 415 })
    }

    // Normaliser en jpeg/png/webp pour l'API
    const safeMediaType = (['image/jpeg', 'image/png', 'image/webp'].includes(mime)
      ? mime
      : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'

    const buffer = await image.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const prompt = `Tu es un expert en nutrition. Analyse cette photo de repas ou d'assiette.
Identifie chaque aliment visible et estime sa quantité et ses macronutriments.

Réponds UNIQUEMENT avec un tableau JSON valide, sans aucun texte avant ou après :
[
  {
    "name": "Nom de l'aliment en français",
    "quantity": <quantité estimée en grammes>,
    "cal": <kcal pour la quantité estimée>,
    "prot": <protéines en g pour la quantité>,
    "carb": <glucides en g pour la quantité>,
    "fat": <lipides en g pour la quantité>,
    "cat": "fruit|légume|viande|poisson|céréale|produit laitier|légumineuse|matière grasse|boisson|autre"
  }
]

Règles absolues :
- Estime les quantités visuellement à partir de la taille de l'assiette et des portions
- Calcule les macros POUR LA QUANTITÉ ESTIMÉE (pas pour 100g)
- Utilise les valeurs nutritionnelles CIQUAL françaises
- Précise le mode de préparation dans le nom (ex: "Poulet grillé", "Riz blanc cuit", "Brocoli vapeur")
- Si un aliment est flou ou incertain, ne le liste pas
- Minimum 1 aliment si tu vois quelque chose de comestible
- Réalisme : une assiette normale = 300-500g total, une portion de viande = 120-200g`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: safeMediaType, data: base64 },
          },
          { type: 'text', text: prompt },
        ],
      }],
    })

    const text = (msg.content[0] as any).text ?? ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('Réponse IA invalide')
    const foods = JSON.parse(match[0])

    if (!Array.isArray(foods) || foods.length === 0) {
      return NextResponse.json({ error: 'Aucun aliment détecté dans la photo' }, { status: 422 })
    }

    return NextResponse.json({ foods })
  } catch (err: any) {
    console.error('[analyze-meal-photo]', err)
    return NextResponse.json({ error: "Erreur lors de l'analyse de la photo" }, { status: 500 })
  }
}
