import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const CATEGORY_PROMPTS: Record<string, string> = {
  'anti-inflammatoire': 'recettes anti-inflammatoires à base de saumon, sardines, maquereau, avocat, myrtilles, noix, curcuma, gingembre, épinards, brocoli, huile d\'olive',
  'sans-gluten':        'recettes 100% sans gluten avec riz, quinoa, patate douce, lentilles, maïs, sarrasin, tapioca — sans blé, orge, seigle ni avoine',
  'faible-calories':    'recettes légères de moins de 400 kcal par portion, rassasiantes et savoureuses',
  'rapide':             'recettes prêtes en 20 minutes maximum, simples et délicieuses',
  'cheat-meal':         'recettes gourmandes et indulgentes : burger maison, pizza, pasta crémeuses, desserts généreux',
  'proteinee':          'recettes riches en protéines (plus de 30g par portion) pour la musculation et la récupération',
  'vegetarien':         'recettes végétariennes savoureuses sans viande ni poisson',
  'monde':              'recettes du monde variées : marocain, japonais, mexicain, indien, libanais, thaï',
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') ?? 'rapide'
  const context  = CATEGORY_PROMPTS[category] ?? CATEGORY_PROMPTS['rapide']

  const prompt = `Tu es un chef cuisinier expert. Génère 8 recettes ${context}.

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour.
Format exact (respecte scrupuleusement cette structure) :
[
  {
    "id": "1",
    "titre": "Nom précis de la recette",
    "description": "Description appétissante de 2 phrases maximum",
    "temps_prep": 10,
    "temps_cuisson": 20,
    "temps": 30,
    "portions": 2,
    "calories": 380,
    "proteines": 28,
    "glucides": 35,
    "lipides": 12,
    "difficulte": "Facile",
    "ustensiles": ["poêle antiadhésive", "spatule"],
    "ingredients": [
      { "qte": "200g", "nom": "filet de saumon", "note": "sans peau" },
      { "qte": "2 c.s.", "nom": "huile d'olive", "note": "" },
      { "qte": "2", "nom": "gousses d'ail", "note": "émincées" },
      { "qte": "1", "nom": "citron", "note": "jus + zeste" },
      { "qte": "sel, poivre", "nom": "assaisonnement", "note": "selon goût" }
    ],
    "etapes": [
      { "num": 1, "titre": "Préparation", "detail": "Sortir le saumon du réfrigérateur 15 minutes avant la cuisson. Éplucher et émincer finement l'ail. Prélever le zeste du citron et presser son jus. Sécher le saumon avec du papier absorbant.", "duree": "5 min", "astuce": "Le saumon à température ambiante cuit plus uniformément" },
      { "num": 2, "titre": "Cuisson du saumon", "detail": "Chauffer l'huile d'olive dans une poêle à feu moyen-vif. Déposer le saumon côté peau vers le bas. Cuire 4 minutes sans bouger — la peau doit être dorée et croustillante. Retourner délicatement et cuire encore 3 minutes.", "duree": "7 min", "astuce": "Ne pas déplacer le saumon pendant les premières minutes pour obtenir une belle dorure" },
      { "num": 3, "titre": "Sauce à l'ail et citron", "detail": "Réduire le feu à moyen. Ajouter l'ail émincé dans la poêle et faire revenir 1 minute en remuant. Déglacer avec le jus de citron. Ajouter le zeste. Laisser réduire 2 minutes en arrosant le saumon.", "duree": "3 min", "astuce": "L'ail ne doit pas brunir — surveillance obligatoire" },
      { "num": 4, "titre": "Dressage", "detail": "Déposer le saumon dans une assiette creuse chaude. Napper généreusement de sauce. Parsemer de zeste de citron et de persil frais si disponible. Servir immédiatement.", "duree": "2 min", "astuce": "Réchauffe les assiettes au four à 60°C pour que le plat reste chaud plus longtemps" }
    ],
    "conseils_chef": "Pour un résultat optimal, utilise du saumon Label Rouge ou sauvage. La cuisson reste rosée à cœur pour une texture parfaite.",
    "accompagnements": ["Riz basmati", "Légumes vapeur", "Salade verte"],
    "photo_keyword": "pan seared salmon lemon garlic"
  }
]

Contraintes IMPORTANTES :
- Titres et toutes descriptions en français uniquement
- photo_keyword en anglais (2-4 mots descriptifs pour une belle photo)
- calories/protéines/glucides/lipides = valeurs réalistes par portion
- difficulte = "Facile", "Moyen" ou "Avancé"
- 5 à 8 ingrédients avec quantités PRÉCISES (grammes, cuillères, unités)
- 4 à 6 étapes TRÈS DÉTAILLÉES avec durée et astuce de chef
- Les étapes doivent permettre à quelqu'un qui ne cuisine pas de réussir la recette
- Recettes variées entre elles, vraiment réalisables à la maison`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text  = (msg.content[0] as any).text ?? ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('No JSON array')
    const recipes = JSON.parse(match[0])
    return NextResponse.json({ recipes })
  } catch (err) {
    console.error('[generate-recipes]', err)
    return NextResponse.json({ error: 'Erreur génération recettes' }, { status: 500 })
  }
}
