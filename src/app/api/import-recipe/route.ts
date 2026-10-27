/**
 * POST /api/import-recipe — multipart/form-data
 *   kind  : 'link' | 'text' | 'capture' | 'photo'
 *   url   : lien Instagram / TikTok / site web (kind=link, optionnel sinon)
 *   text  : texte collé par l'utilisateur (légende, recette…)
 *   image : capture d'écran (capture) ou photo d'une fiche/livre (photo), ≤ 5 Mo
 *
 * 1. requireAuth + rate limit
 * 2. Extraction légale : oEmbed TikTok / balises og: Instagram / JSON-LD + og: pour le web.
 *    → Jamais de téléchargement de vidéo (CGU plateformes, App Store 5.2).
 * 3. Si rien d'exploitable et pas d'image/texte → 422 { needsMore: true } SANS consommer le quota.
 * 4. checkAiQuota('import') (mensuel, fail-closed)
 * 5. Structuration Haiku (vision si image) → schéma Recipe + grammes + valeurs/100 g par ingrédient
 * 6. scoreRecipe() local → Score MYTA
 * 7. Retour JSON, AUCUNE écriture en base (l'utilisateur valide/édite avant de sauvegarder)
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth, checkRateLimit } from '@/lib/auth'
import { checkAiQuota } from '@/lib/ai-guard'
import { scoreRecipe, type ScoredIngredientInput } from '@/lib/score-myta'

export const maxDuration = 60

const client = new Anthropic()

type SourceKind = 'instagram' | 'tiktok' | 'web' | 'capture' | 'photo' | 'texte'

interface SourceMeta {
  kind:       SourceKind
  url?:       string
  author?:    string
  title?:     string
  caption?:   string
  thumbnail?: string
  jsonLd?:    any
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 8000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: 'follow' })
  } finally { clearTimeout(t) }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
}

function metaTag(html: string, prop: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i')
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i')
  const m = html.match(re) ?? html.match(re2)
  return m ? decodeEntities(m[1]).trim() : undefined
}

function detectKind(url: string): SourceKind {
  const h = (() => { try { return new URL(url).hostname.toLowerCase() } catch { return '' } })()
  if (h.includes('instagram.com')) return 'instagram'
  if (h.includes('tiktok.com'))    return 'tiktok'
  return 'web'
}

// ─── Extraction ──────────────────────────────────────────────────────────────

async function extractTikTok(url: string): Promise<SourceMeta> {
  const meta: SourceMeta = { kind: 'tiktok', url }
  try {
    // Les liens courts (vm.tiktok.com/…) : on résout la redirection d'abord
    let finalUrl = url
    if (/vm\.tiktok\.com|vt\.tiktok\.com|\/t\//.test(url)) {
      const r = await fetchWithTimeout(url, { headers: { 'User-Agent': UA }, method: 'GET' })
      finalUrl = r.url || url
      meta.url = finalUrl
    }
    const r = await fetchWithTimeout(`https://www.tiktok.com/oembed?url=${encodeURIComponent(finalUrl)}`, { headers: { 'User-Agent': UA } })
    if (r.ok) {
      const j: any = await r.json()
      meta.title     = j.title
      meta.caption   = j.title
      meta.author    = j.author_name ?? j.author_unique_id
      meta.thumbnail = j.thumbnail_url
    }
  } catch (e) { console.warn('[import-recipe] tiktok oembed', e) }
  return meta
}

const UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

/** Lit légende / auteur / image dans le HTML d'une page Instagram (page publique ou widget embed). */
function parseInstagramHtml(html: string, meta: SourceMeta): SourceMeta {
  // a) Widget embed « captioned » : <div class="Caption">… (pas de mur de connexion)
  const cap = html.match(/class="Caption"[^>]*>([\s\S]*?)<div class="CaptionComments"/i) ?? html.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>\s*<div class="CaptionComments/i)
  if (cap) {
    const user = html.match(/class="CaptionUsername"[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? html.match(/class="UsernameText"[^>]*>([^<]+)</i)?.[1]
    let text = stripTags(cap[1])
    if (user) { meta.author = stripTags(user); text = text.replace(new RegExp(`^${meta.author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`), '') }
    if (text.length > 20) meta.caption = text
    const img = html.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/i)?.[1]
    if (img) meta.thumbnail = decodeEntities(img)
    if (meta.caption) return meta
  }
  // b) Balises og: (page publique servie à un navigateur mobile)
  const ogTitle = metaTag(html, 'og:title')
  const ogDesc  = metaTag(html, 'og:description') ?? metaTag(html, 'description')
  if (!meta.thumbnail) meta.thumbnail = metaTag(html, 'og:image')
  const authorMatch = (ogTitle ?? '').match(/^(.+?) on Instagram/i) ?? (ogDesc ?? '').match(/-\s*(.+?) on /i)
  if (authorMatch && !meta.author) meta.author = authorMatch[1].replace(/^[\d,.\sKM]+likes?,?\s*[\d,.\sKM]*comments?\s*-\s*/i, '').trim()
  const captionFrom = (t?: string) => {
    if (!t) return undefined
    const q = t.match(/[:：]\s*["“]([\s\S]+)["”]\s*$/) ?? t.match(/[:：]\s*["“]([\s\S]+)/)
    return (q ? q[1] : t).trim()
  }
  const c1 = captionFrom(ogTitle), c2 = captionFrom(ogDesc)
  const best = (c1 && c1.length > (c2?.length ?? 0)) ? c1 : c2
  if (best && best.length > 20 && !/^Instagram$/i.test(best)) meta.caption = best
  if (!meta.title) meta.title = ogTitle
  // c) JSON embarqué (caption dans "caption":"…" ou "text":"…")
  if (!meta.caption) {
    const j = html.match(/"caption"\s*:\s*"((?:[^"\\]|\\.){40,})"/) ?? html.match(/"edge_media_to_caption"[\s\S]{0,200}?"text"\s*:\s*"((?:[^"\\]|\\.){40,})"/)
    if (j) { try { meta.caption = JSON.parse(`"${j[1]}"`) } catch { /* ignoré */ } }
  }
  return meta
}

async function extractInstagram(url: string, pageHtml?: string): Promise<SourceMeta> {
  const meta: SourceMeta = { kind: 'instagram', url }
  // 0. HTML récupéré par l'app sur le téléphone (Instagram bloque les serveurs, pas les mobiles)
  if (pageHtml && pageHtml.length > 500) { parseInstagramHtml(pageHtml, meta); if (meta.caption) return meta }
  const code = url.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[1]
  // 1. Widget embed « captioned » : accessible sans connexion depuis un serveur
  if (code) {
    for (const path of [`https://www.instagram.com/p/${code}/embed/captioned/`, `https://www.instagram.com/reel/${code}/embed/captioned/`]) {
      try {
        const r = await fetchWithTimeout(path, { headers: { 'User-Agent': UA_MOBILE, 'Accept-Language': 'fr-FR,fr;q=0.9', Accept: 'text/html' } })
        if (r.ok) { parseInstagramHtml(await r.text(), meta); if (meta.caption) return meta }
      } catch (e) { console.warn('[import-recipe] instagram embed', e) }
    }
  }
  // 2. Page publique (og:) — fonctionne par intermittence selon l'IP du serveur
  try {
    const r = await fetchWithTimeout(url, { headers: { 'User-Agent': UA_MOBILE, 'Accept-Language': 'fr-FR,fr;q=0.9', Accept: 'text/html' } })
    if (r.ok) parseInstagramHtml(await r.text(), meta)
  } catch (e) { console.warn('[import-recipe] instagram meta', e) }
  return meta
}

async function extractWeb(url: string): Promise<SourceMeta> {
  const meta: SourceMeta = { kind: 'web', url }
  try {
    const r = await fetchWithTimeout(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9', Accept: 'text/html' } })
    if (!r.ok) return meta
    const html = await r.text()
    meta.title     = metaTag(html, 'og:title') ?? (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '').trim()
    meta.thumbnail = metaTag(html, 'og:image')
    meta.author    = metaTag(html, 'author') ?? metaTag(html, 'og:site_name')
    // JSON-LD Recipe (schema.org) : la majorité des sites de cuisine en ont un
    const blocks = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
    for (const b of blocks) {
      try {
        const data = JSON.parse(b[1].trim())
        const items: any[] = Array.isArray(data) ? data : (data['@graph'] ?? [data])
        const rec = items.find(i => {
          const t = i?.['@type']; return t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))
        })
        if (rec) {
          meta.jsonLd = {
            name: rec.name, description: rec.description, recipeYield: rec.recipeYield,
            prepTime: rec.prepTime, cookTime: rec.cookTime, totalTime: rec.totalTime,
            recipeIngredient: rec.recipeIngredient,
            recipeInstructions: Array.isArray(rec.recipeInstructions)
              ? rec.recipeInstructions.map((s: any) => typeof s === 'string' ? s : (s?.text ?? s?.name ?? '')).filter(Boolean)
              : rec.recipeInstructions,
            author: rec.author?.name ?? (Array.isArray(rec.author) ? rec.author[0]?.name : undefined),
          }
          if (meta.jsonLd.author) meta.author = meta.jsonLd.author
          break
        }
      } catch { /* bloc JSON-LD invalide → ignoré */ }
    }
    if (!meta.jsonLd) {
      const desc = metaTag(html, 'og:description') ?? metaTag(html, 'description')
      // Texte brut de la page (sans scripts/styles), tronqué — suffisant pour une recette en clair
      const body = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      meta.caption = [desc, body.slice(0, 6000)].filter(Boolean).join('\n\n')
    }
  } catch (e) { console.warn('[import-recipe] web meta', e) }
  return meta
}

// ─── Photo d'illustration (Pexels, clé serveur) ──────────────────────────────
// Jamais la photo du créateur : une photo libre de droits correspondant au plat.
async function pexelsPhoto(keyword: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return null
  try {
    const r = await fetchWithTimeout(`https://api.pexels.com/v1/search?query=${encodeURIComponent(`${keyword} food`)}&per_page=1&orientation=landscape`, { headers: { Authorization: key } }, 5000)
    if (!r.ok) return null
    const j: any = await r.json()
    return j.photos?.[0]?.src?.large ?? j.photos?.[0]?.src?.medium ?? null
  } catch { return null }
}

// ─── Structuration IA ────────────────────────────────────────────────────────

const RECIPE_SCHEMA = `{"ok":true,"titre":"Nom de la recette","description":"Une phrase appétissante.","temps_prep":10,"temps_cuisson":15,"portions":2,"difficulte":"Facile","ustensiles":["poêle"],"ingredients":[{"qte":"200 g","nom":"filet de saumon","note":"sans peau","grammes":200,"per100g":{"kcal":208,"prot":20,"carb":0,"sugars":0,"fat":13,"satFat":3,"fiber":0,"salt":0.1,"fvl":0}},{"qte":"1","nom":"citron","note":"","grammes":60,"per100g":{"kcal":29,"prot":1.1,"carb":9.3,"sugars":2.5,"fat":0.3,"satFat":0,"fiber":2.8,"salt":0,"fvl":100}}],"etapes":[{"num":1,"titre":"Préparation","detail":"…","duree":"5 min","astuce":"…"}],"conseils_chef":"…","accompagnements":["Riz"],"photo_keyword":"salmon lemon dish","source_author":"@auteur si visible, sinon vide","completions":["Quantité de sel estimée (1 pincée)","Temps de cuisson déduit (15 min à feu moyen)"]}`

function buildPrompt(src: SourceMeta | null, userText: string, hasImage: boolean): string {
  const parts: string[] = []
  if (src?.jsonLd) parts.push(`RECETTE STRUCTURÉE (schema.org Recipe) :\n${JSON.stringify(src.jsonLd).slice(0, 8000)}`)
  else if (src?.caption) parts.push(`LÉGENDE / TEXTE PUBLIÉ (${src.kind}${src.author ? `, auteur : ${src.author}` : ''}) :\n${src.caption.slice(0, 8000)}`)
  if (userText) parts.push(`TEXTE FOURNI PAR L'UTILISATEUR :\n${userText.slice(0, 8000)}`)
  if (hasImage) parts.push(`IMAGE JOINTE : capture d'écran ou photo d'une recette — lis tout le texte visible (ingrédients, quantités, étapes).`)

  return `Tu es Waty, le coach nutrition de l'app MYTA. À partir des éléments ci-dessous, construis UNE fiche recette complète en français.

${parts.join('\n\n')}

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, au format exact :
${RECIPE_SCHEMA}

Si les éléments ne contiennent PAS de recette exploitable (pas d'ingrédients identifiables), réponds uniquement : {"ok":false,"reason":"explication courte en français"}

Règles strictes :
- Titre et contenu en français (traduis si besoin). difficulte ∈ Facile | Moyen | Avancé.
- REFORMULE les étapes dans ton propre style, clair et bienveillant : ne recopie jamais le texte source mot pour mot.
- Conserve TOUS les ingrédients avec leurs quantités d'origine dans "qte".
- COMPLÉTION LOGIQUE : les vidéos et légendes sont souvent incomplètes. Comble ce qui manque de façon cohérente avec la recette et le nombre de portions : quantité absente (estime-la, ex. « 2 c. à s. »), étape implicite (préchauffage, repos, assaisonnement), temps de préparation/cuisson, ustensiles, portions. Reste plausible et classique pour ce plat ; n'ajoute jamais un ingrédient qui n'est ni cité ni évident (sel, poivre, huile de cuisson sont admis).
- "completions" : liste en français de CHAQUE information que tu as complétée ou estimée (quantité, étape, temps, portions), formulée court ; tableau vide si rien n'a été complété. L'utilisateur la voit et peut corriger.
- "grammes" = poids estimé de l'ingrédient pour TOUTE la recette (1 œuf ≈ 55 g, 1 c. à s. d'huile ≈ 10 g, 1 c. à c. ≈ 5 g, 1 oignon ≈ 150 g, 1 gousse d'ail ≈ 5 g, 1 verre ≈ 200 ml ≈ 200 g, 1 pincée ≈ 1 g).
- "per100g" = valeurs nutritionnelles pour 100 g de l'ingrédient (table CIQUAL française) : kcal, prot, carb, sugars (sucres), fat, satFat (acides gras saturés), fiber, salt (sel en g), fvl (= 100 si fruit/légume/légumineuse/noix, sinon 0 ; 50 pour un produit à moitié végétal).
- portions : nombre de portions indiqué, sinon estime-le (jamais 0).
- photo_keyword : 3 mots max en anglais décrivant le plat.
- JSON strictement valide, pas d'apostrophes non échappées dans les clés, pas de commentaire.`
}

function cleanJSONObject(text: string): any {
  const clean = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  const start = clean.indexOf('{'), end = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found')
  return JSON.parse(clean.slice(start, end + 1))
}

function looksUsable(text: string | undefined): boolean {
  if (!text) return false
  const t = text.toLowerCase()
  if (t.length < 80) return false
  // Un indice minimal de recette : unité, ingrédient ou mot-clé
  return /\b(\d+\s?(g|gr|kg|ml|cl|l|cs|cc|c\.|cuill|tasse|cup|oz|tbsp|tsp)\b|ingr[ée]dient|recette|recipe|pr[ée]paration|cuisson|m[ée]langer|ajouter|four|poêle|sel|poivre|huile|oeuf|œuf|farine|sucre|beurre|lait|poulet|riz|pâtes|pasta)/i.test(t)
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  if (!checkRateLimit(auth.userId, 12)) {
    return NextResponse.json({ error: 'Trop de requêtes — réessaie dans 1h' }, { status: 429 })
  }

  let kind = 'link', url = '', userText = '', pageHtml = ''
  let image: File | null = null
  try {
    const fd = await req.formData()
    kind     = String(fd.get('kind') ?? 'link')
    url      = String(fd.get('url')  ?? '').trim().slice(0, 500)
    userText = String(fd.get('text') ?? '').trim().slice(0, 10000)
    pageHtml = String(fd.get('pageHtml') ?? '').slice(0, 600000)   // HTML lu par l'app mobile (Instagram)
    const f  = fd.get('image')
    if (f && typeof f === 'object' && 'arrayBuffer' in f) image = f as File
  } catch {
    return NextResponse.json({ error: 'Requête invalide (multipart/form-data attendu)' }, { status: 400 })
  }

  // ── Image (capture ou photo) ──
  let imageBlock: { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/webp'; data: string } } | null = null
  if (image) {
    if (image.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Image trop volumineuse (max 5 Mo)' }, { status: 413 })
    const mime = image.type || 'image/jpeg'
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!allowed.includes(mime)) return NextResponse.json({ error: 'Format image non supporté' }, { status: 415 })
    const safe = (['image/jpeg', 'image/png', 'image/webp'].includes(mime) ? mime : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'
    const b64 = Buffer.from(await image.arrayBuffer()).toString('base64')
    imageBlock = { type: 'image', source: { type: 'base64', media_type: safe, data: b64 } }
  }

  // ── Extraction depuis le lien (gratuit, sans quota) ──
  let src: SourceMeta | null = null
  if (url) {
    if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })
    const k = detectKind(url)
    src = k === 'tiktok' ? await extractTikTok(url) : k === 'instagram' ? await extractInstagram(url, pageHtml) : await extractWeb(url)
  }
  const sourceKind: SourceKind = src?.kind ?? (kind === 'photo' ? 'photo' : kind === 'capture' ? 'capture' : 'texte')

  // Rien d'exploitable → on demande une capture / le texte, sans consommer le quota
  const hasContent = !!imageBlock || looksUsable(userText) || looksUsable(src?.caption) || !!src?.jsonLd
  if (!hasContent) {
    return NextResponse.json({
      needsMore: true,
      source: src ? { kind: src.kind, url: src.url, author: src.author, title: src.title, thumbnail: src.thumbnail, caption: src.caption } : null,
      error: src?.kind === 'instagram'
        ? "La recette n'est pas dans la légende de ce post (ou le post est privé). Ajoute une capture d'écran de la recette, ou colle son texte."
        : src?.kind === 'tiktok'
          ? "La légende de cette vidéo ne contient pas la recette. Ajoute une capture d'écran de la recette affichée, ou colle le texte."
          : "Je n'ai pas trouvé de recette exploitable. Ajoute une capture d'écran ou colle le texte de la recette.",
    }, { status: 422 })
  }

  // ── Quota mensuel (fail-closed) ──
  const aiCheck = await checkAiQuota(auth.userId, 'import')
  if (!aiCheck.allowed) return aiCheck.error!

  // ── Structuration IA ──
  try {
    const prompt = buildPrompt(src, userText, !!imageBlock)
    const content: any[] = imageBlock ? [imageBlock, { type: 'text', text: prompt }] : [{ type: 'text', text: prompt }]
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content }],
    })
    const text = (msg.content[0] as any)?.text ?? ''
    const data = cleanJSONObject(text)

    if (!data.ok) {
      return NextResponse.json({
        needsMore: true,
        source: src ? { kind: src.kind, url: src.url, author: src.author, title: src.title, thumbnail: src.thumbnail } : null,
        error: data.reason || "Je n'ai pas réussi à lire une recette dans ces éléments. Ajoute une capture ou colle le texte.",
      }, { status: 422 })
    }

    const ingredients = (Array.isArray(data.ingredients) ? data.ingredients : []).map((i: any) => ({
      qte:     String(i.qte ?? '').trim(),
      nom:     String(i.nom ?? '').trim(),
      note:    String(i.note ?? '').trim(),
      grammes: Math.max(0, Number(i.grammes) || 0),
      per100g: i.per100g && typeof i.per100g === 'object' ? i.per100g : null,
    })).filter((i: any) => i.nom)

    if (ingredients.length === 0) throw new Error('Aucun ingrédient')

    const portions = Math.max(1, Math.round(Number(data.portions) || 2))
    const score = scoreRecipe(ingredients as ScoredIngredientInput[], portions)

    const temps_prep    = Math.max(0, Number(data.temps_prep)    || 0)
    const temps_cuisson = Math.max(0, Number(data.temps_cuisson) || 0)
    const id = `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

    const recipe = {
      id,
      titre:           String(data.titre ?? 'Recette importée').slice(0, 120),
      description:     String(data.description ?? '').slice(0, 300),
      temps_prep, temps_cuisson,
      temps:           temps_prep + temps_cuisson,
      portions,
      calories:        score.perPortion.kcal,
      proteines:       score.perPortion.prot,
      glucides:        score.perPortion.carb,
      lipides:         score.perPortion.fat,
      difficulte:      ['Facile', 'Moyen', 'Avancé'].includes(data.difficulte) ? data.difficulte : 'Facile',
      ustensiles:      Array.isArray(data.ustensiles) ? data.ustensiles.map(String).slice(0, 12) : [],
      ingredients,
      etapes:          (Array.isArray(data.etapes) ? data.etapes : []).map((e: any, i: number) => ({
        num: i + 1, titre: String(e.titre ?? `Étape ${i + 1}`), detail: String(e.detail ?? ''),
        duree: e.duree ? String(e.duree) : undefined, astuce: e.astuce ? String(e.astuce) : undefined,
      })),
      conseils_chef:   data.conseils_chef ? String(data.conseils_chef) : '',
      accompagnements: Array.isArray(data.accompagnements) ? data.accompagnements.map(String).slice(0, 6) : [],
      photo_keyword:   String(data.photo_keyword ?? 'dish').slice(0, 40),
      completions:     Array.isArray(data.completions) ? data.completions.map((c: any) => String(c).slice(0, 140)).slice(0, 12) : [],
      source_kind:     sourceKind,
      source_url:      src?.url ?? null,
      source_author:   src?.author ?? (data.source_author ? String(data.source_author) : null),
      category:        'import',
      photoUrl:        (await pexelsPhoto(String(data.photo_keyword ?? '') || String(data.titre ?? 'dish'))) ?? undefined,
    }

    return NextResponse.json({
      recipe,
      score,
      source: src ? { kind: src.kind, url: src.url, author: src.author, title: src.title, thumbnail: src.thumbnail } : { kind: sourceKind },
      remaining: aiCheck.remaining,
    })
  } catch (err: any) {
    console.error('[import-recipe]', err)
    return NextResponse.json({ error: "Erreur pendant l'analyse de la recette, réessaie." }, { status: 500 })
  }
}
