/**
 * GET /api/recipes/pdf?t=<share_token>
 * Fiche recette MYTA en PDF (A4) : photo, infos, Score MYTA, ingrédients, étapes, conseils, source.
 * Accès par jeton de partage (même règle que la page /nutrition/recipes/share).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const VIOLET = rgb(0.294, 0.278, 0.627)   // #4B47A0
const GREEN  = rgb(0.133, 0.773, 0.369)   // #22C55E
const INK    = rgb(0.082, 0.082, 0.165)   // #15152A
const MUTED  = rgb(0.42, 0.42, 0.54)
const LINE   = rgb(0.9, 0.9, 0.94)
const GRADE: Record<string, [number, number, number]> = { A: [0.13, 0.77, 0.37], B: [0.4, 0.73, 0.2], C: [0.98, 0.75, 0.14], D: [0.97, 0.45, 0.09], E: [0.6, 0.6, 0.65] }

/** Police standard (WinAnsi) : on retire ce qu'elle ne sait pas dessiner (emojis…). */
function clean(s: unknown): string {
  return String(s ?? '').replace(/[^\u0000-ÿŒœ–—‘’“”•…€]/g, '').replace(/\s+/g, ' ').trim()
}
function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const w of para.split(' ')) {
      const t = line ? `${line} ${w}` : w
      if (font.widthOfTextAtSize(t, size) <= maxW) line = t
      else { if (line) out.push(line); line = w }
    }
    out.push(line)
  }
  return out
}
function ingLabel(i: any): string {
  if (typeof i === 'string') return i
  return [i?.qte, i?.nom, i?.note ? `(${i.note})` : ''].filter(Boolean).join(' ')
}

export async function GET(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get('t') ?? '').replace(/[^a-z0-9]/gi, '').slice(0, 32)
  if (!token) return NextResponse.json({ error: 'Jeton manquant' }, { status: 400 })
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data: r } = await sb.rpc('get_shared_recipe', { p_token: token })
  if (!r) return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 })

  const pdf = await PDFDocument.create()
  pdf.setTitle(`${clean(r.titre)} — MYTA`); pdf.setAuthor('MYTA · My Twin App'); pdf.setCreator('MYTA')
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const W = 595.28, H = 841.89, M = 44
  let page: PDFPage = pdf.addPage([W, H])
  let y = H - M

  const newPage = () => { page = pdf.addPage([W, H]); y = H - M }
  const ensure = (h: number) => { if (y - h < M + 24) newPage() }
  const text = (s: string, x: number, size: number, f: PDFFont = font, color = INK) => { page.drawText(s, { x, y, size, font: f, color }); }
  const para = (s: string, size: number, f: PDFFont = font, color = INK, x = M, maxW = W - 2 * M, lh = 1.4) => {
    for (const l of wrap(clean(s), f, size, maxW)) { ensure(size * lh); y -= size * lh; text(l, x, size, f, color) }
  }
  const heading = (s: string) => { ensure(34); y -= 26; text(s.toUpperCase(), M, 9.5, bold, VIOLET); y -= 6; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: LINE }); y -= 4 }

  // ── Bandeau ──
  page.drawRectangle({ x: 0, y: H - 30, width: W, height: 30, color: VIOLET })
  page.drawText('MYTA  ·  Fiche recette de Waty', { x: M, y: H - 20, size: 9, font: bold, color: rgb(1, 1, 1) })
  page.drawText('mytwinapp.fr', { x: W - M - font.widthOfTextAtSize('mytwinapp.fr', 9), y: H - 20, size: 9, font, color: rgb(1, 1, 1) })
  y = H - 30 - 28

  // ── Photo ──
  if (r.photo_url) {
    try {
      const res = await fetch(String(r.photo_url), { signal: AbortSignal.timeout(6000) })
      if (res.ok) {
        const buf = new Uint8Array(await res.arrayBuffer())
        const ct = res.headers.get('content-type') ?? ''
        const img = ct.includes('png') ? await pdf.embedPng(buf) : await pdf.embedJpg(buf)
        const boxW = W - 2 * M, maxH = 230
        const sc = Math.min(boxW / img.width, maxH / img.height)
        const dw = img.width * sc, dh = img.height * sc
        page.drawImage(img, { x: M + (boxW - dw) / 2, y: y - dh, width: dw, height: dh })
        y -= dh + 14
      }
    } catch { /* pas de photo : on continue */ }
  }

  // ── Titre + description ──
  for (const l of wrap(clean(r.titre), bold, 20, W - 2 * M)) { y -= 24; text(l, M, 20, bold) }
  if (r.description) { y -= 2; para(r.description, 10.5, font, MUTED) }

  // ── Infos clés ──
  y -= 14
  const temps = (r.temps_prep || r.temps_cuisson) ? `${r.temps_prep ?? 0} min prép · ${r.temps_cuisson ?? 0} min cuisson` : `${r.temps ?? 0} min`
  const infos = [['Temps', temps], ['Portions', String(r.portions ?? 1)], ['Par portion', `${Math.round(r.calories ?? 0)} kcal`], ['Niveau', String(r.difficulte ?? 'Facile')]]
  const colW = (W - 2 * M) / infos.length
  infos.forEach(([k, v], i) => {
    const x = M + i * colW
    page.drawRectangle({ x: x + 2, y: y - 34, width: colW - 4, height: 34, color: rgb(0.965, 0.965, 0.985), borderWidth: 0 })
    page.drawText(k.toUpperCase(), { x: x + 10, y: y - 13, size: 7, font: bold, color: MUTED })
    page.drawText(clean(v), { x: x + 10, y: y - 27, size: 10, font: bold, color: INK })
  })
  y -= 42

  // ── Score MYTA + macros ──
  if (r.score_grade) {
    const [cr, cg, cb] = GRADE[r.score_grade] ?? GRADE.E
    page.drawRectangle({ x: M, y: y - 30, width: 30, height: 30, color: rgb(cr, cg, cb) })
    page.drawText(String(r.score_grade), { x: M + 9, y: y - 22, size: 16, font: bold, color: rgb(1, 1, 1) })
    page.drawText('Score MYTA', { x: M + 40, y: y - 12, size: 9, font: bold, color: INK })
    const macros = [`${Math.round(r.proteines ?? 0)} g protéines`, `${Math.round(r.glucides ?? 0)} g glucides`, `${Math.round(r.lipides ?? 0)} g lipides`, r.fibres != null ? `${Math.round(r.fibres)} g fibres` : ''].filter(Boolean).join('  ·  ')
    page.drawText(clean(`${macros} (par portion)`), { x: M + 40, y: y - 25, size: 8.5, font, color: MUTED })
    y -= 34
  }

  // ── Ingrédients ──
  heading(`Ingrédients · ${r.portions ?? 1} portion${(r.portions ?? 1) > 1 ? 's' : ''}`)
  const ings: any[] = Array.isArray(r.ingredients) ? r.ingredients : []
  const half = Math.ceil(ings.length / 2), colWidth = (W - 2 * M - 16) / 2
  const yStart = y
  let yL = y, yR = y
  const drawIng = (s: string, x: number, yy: number) => {
    page.drawCircle({ x: x + 3, y: yy - 3.5, size: 1.6, color: GREEN })
    page.drawText(s, { x: x + 10, y: yy - 7, size: 9.5, font, color: INK })
  }
  ensure(half * 14 + 10)
  ings.forEach((ing, i) => {
    const lines = wrap(clean(ingLabel(ing)), font, 9.5, colWidth - 12)
    if (i < half) { for (const l of lines) { drawIng(l, M, yL); yL -= 14 } }
    else { for (const l of lines) { drawIng(l, M + colWidth + 16, yR); yR -= 14 } }
  })
  y = Math.min(yL, yR, yStart) - 2
  if (Array.isArray(r.ustensiles) && r.ustensiles.length) { y -= 4; para(`Ustensiles : ${r.ustensiles.join(', ')}`, 8.5, font, MUTED) }

  // ── Étapes ──
  heading('Préparation, étape par étape')
  const steps: any[] = Array.isArray(r.etapes) ? r.etapes : []
  steps.forEach((et, i) => {
    const titre = typeof et === 'object' && et?.titre ? clean(et.titre) : `Étape ${i + 1}`
    const detail = typeof et === 'string' ? et : (et?.detail ?? '')
    ensure(40)
    y -= 18
    page.drawCircle({ x: M + 9, y: y + 3, size: 9, color: VIOLET })
    const n = String(i + 1); page.drawText(n, { x: M + 9 - bold.widthOfTextAtSize(n, 8) / 2, y: y, size: 8, font: bold, color: rgb(1, 1, 1) })
    page.drawText(titre + (et?.duree ? `   ·   ${clean(et.duree)}` : ''), { x: M + 26, y, size: 10, font: bold, color: INK })
    para(detail, 9.5, font, INK, M + 26, W - 2 * M - 26, 1.45)
    if (et?.astuce) { y -= 2; para(`Astuce : ${et.astuce}`, 8.5, font, rgb(0.6, 0.42, 0.05), M + 26, W - 2 * M - 26) }
    y -= 4
  })

  // ── Conseils / accompagnements / complétions ──
  if (r.conseils_chef) { heading('Le conseil de Waty'); y -= 2; para(r.conseils_chef, 9.5) }
  if (Array.isArray(r.accompagnements) && r.accompagnements.length) { y -= 6; para(`Accompagnements : ${r.accompagnements.join(', ')}`, 9, font, MUTED) }
  if (Array.isArray(r.completions) && r.completions.length) {
    heading('Complété par Waty'); y -= 2
    para('La publication d’origine ne précisait pas tout ; ces éléments ont été estimés :', 8.5, font, MUTED)
    for (const c of r.completions) para(`– ${c}`, 8.5, font, MUTED)
  }

  // ── Source + pied de page ──
  if (r.source_kind && r.source_kind !== 'ia') {
    y -= 12
    para(`Source : ${r.source_kind}${r.source_author ? ` · ${r.source_author}` : ''}${r.source_url ? ` · ${r.source_url}` : ''}`, 8, font, MUTED)
  }
  const pages = pdf.getPages()
  pages.forEach((p, i) => {
    p.drawText(`MYTA · My Twin App · mytwinapp.fr   —   page ${i + 1}/${pages.length}`, { x: M, y: 22, size: 7.5, font, color: MUTED })
  })

  const bytes = await pdf.save()
  const name = clean(r.titre).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'recette'
  return new NextResponse(Buffer.from(bytes), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="myta-${name}.pdf"`, 'Cache-Control': 'private, max-age=300' },
  })
}
