/**
 * Sprites vectoriels des mini-jeux (canvas, Path2D). Grille 64 × 64.
 * Remplacent les emojis : aliments sains / malbouffe, power-ups, Waty + tenues.
 */

export interface Shape { d: string; fill?: string; stroke?: string; lw?: number; alpha?: number }
export type Sprite = Shape[]

const C = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0z`

// ─── Aliments sains ──────────────────────────────────────────────────────────
export const HEALTHY: Record<string, Sprite> = {
  pomme:    [{ d: 'M32 16c-10-6-22 2-20 16 2 12 10 22 20 22s18-10 20-22c2-14-10-22-20-16z', fill: '#EF4444' }, { d: 'M32 16c0-6 3-9 7-10', stroke: '#15803D', lw: 3 }, { d: 'M34 12c6-4 10 0 8 4-4 2-8 0-8-4z', fill: '#22C55E' }, { d: 'M22 26c-2 6 0 12 2 14', stroke: '#fff', lw: 3, alpha: 0.5 }],
  brocoli:  [{ d: 'M28 40h8v16h-8z', fill: '#A3E635' }, { d: C(22, 28, 12), fill: '#16A34A' }, { d: C(42, 28, 12), fill: '#16A34A' }, { d: C(32, 20, 13), fill: '#22C55E' }, { d: C(26, 18, 4), fill: '#4ADE80' }],
  carotte:  [{ d: 'M22 20l20 0-8 36z', fill: '#F97316' }, { d: 'M26 12l6 8 6-8-6-6z', fill: '#22C55E' }, { d: 'M30 26h6M29 34h6M31 42h4', stroke: '#fff', lw: 2, alpha: 0.5 }],
  poisson:  [{ d: 'M8 32c8-14 24-18 38-10l10-8v36l-10-8c-14 8-30 4-38-10z', fill: '#38BDF8' }, { d: C(22, 28, 3), fill: '#0F172A' }, { d: 'M28 24c6 2 10 8 10 16', stroke: '#fff', lw: 2.4, alpha: 0.5 }],
  avocat:   [{ d: 'M32 8c-14 0-22 16-22 30a22 20 0 0 0 44 0c0-14-8-30-22-30z', fill: '#4D7C0F' }, { d: 'M32 14c-10 0-16 14-16 24a16 15 0 0 0 32 0c0-10-6-24-16-24z', fill: '#BEF264' }, { d: C(32, 40, 8), fill: '#92400E' }],
  banane:   [{ d: 'M12 20c6 20 20 32 40 30-2 6-10 10-18 8C18 54 10 36 12 20z', fill: '#FACC15' }, { d: 'M12 20l-4-4 6 0z', fill: '#78350F' }, { d: 'M18 26c6 14 16 22 28 24', stroke: '#fff', lw: 2.4, alpha: 0.45 }],
  fraise:   [{ d: 'M32 18c-12 0-18 10-16 20 2 10 10 18 16 20 6-2 14-10 16-20 2-10-4-20-16-20z', fill: '#F43F5E' }, { d: 'M22 16l10 4 10-4-6 8h-8z', fill: '#22C55E' }, { d: C(26, 32, 1.6) + C(36, 30, 1.6) + C(30, 42, 1.6) + C(40, 40, 1.6), fill: '#FDE68A' }],
  oeuf:     [{ d: 'M32 8c-12 0-20 16-20 30a20 18 0 0 0 40 0c0-14-8-30-20-30z', fill: '#FFF7ED' }, { d: C(32, 40, 10), fill: '#FBBF24' }, { d: 'M20 30c0-8 4-14 8-16', stroke: '#fff', lw: 3 }],
  amande:   [{ d: 'M32 6c-10 10-18 26-14 40 4 10 24 10 28 0 4-14-4-30-14-40z', fill: '#B45309' }, { d: 'M28 20c-4 8-6 18-2 26', stroke: '#fff', lw: 2.4, alpha: 0.4 }],
  tomate:   [{ d: C(32, 36, 22), fill: '#EF4444' }, { d: 'M24 14l8 6 8-6-4 8h-8z', fill: '#16A34A' }, { d: 'M18 34c0-6 4-12 8-14', stroke: '#fff', lw: 3, alpha: 0.5 }],
  myrtille: [{ d: C(24, 36, 12), fill: '#4338CA' }, { d: C(42, 30, 11), fill: '#4F46E5' }, { d: C(36, 48, 9), fill: '#3730A3' }, { d: C(20, 32, 3) + C(39, 26, 3), fill: '#fff', alpha: 0.5 }],
  orange:   [{ d: C(32, 34, 22), fill: '#FB923C' }, { d: 'M32 12c2-4 6-6 10-6', stroke: '#15803D', lw: 3 }, { d: C(32, 34, 14), fill: '#FDBA74' }, { d: 'M32 20v28M18 34h28M22 24l20 20M42 24L22 44', stroke: '#FB923C', lw: 2 }],
}

// ─── Malbouffe ───────────────────────────────────────────────────────────────
export const JUNK: Record<string, Sprite> = {
  donut:    [{ d: C(32, 32, 24), fill: '#F59E0B' }, { d: C(32, 30, 22), fill: '#F472B6' }, { d: C(32, 32, 8), fill: '#F6F6FB' }, { d: 'M20 24l4 2M38 20l2 4M26 40l-2 4M42 38l4 2', stroke: '#fff', lw: 2.4 }],
  frites:   [{ d: 'M16 30h32l-4 28H20z', fill: '#DC2626' }, { d: 'M20 32V10M28 32V6M36 32V8M44 32V12', stroke: '#FACC15', lw: 6 }, { d: 'M16 30h32v6H16z', fill: '#B91C1C' }],
  burger:   [{ d: 'M10 26a22 14 0 0 1 44 0z', fill: '#F59E0B' }, { d: 'M10 28h44v6H10z', fill: '#22C55E' }, { d: 'M12 34h40v6H12z', fill: '#7C2D12' }, { d: 'M12 40h40v4H12z', fill: '#FACC15' }, { d: 'M10 44h44a6 6 0 0 1-6 10H16a6 6 0 0 1-6-10z', fill: '#F59E0B' }],
  soda:     [{ d: 'M20 12h24l-3 44H23z', fill: '#DC2626' }, { d: 'M22 26h20l-1 14H23z', fill: '#fff', alpha: 0.9 }, { d: 'M34 12l4-10', stroke: '#FACC15', lw: 3 }, { d: 'M25 16v36', stroke: '#fff', lw: 2.4, alpha: 0.4 }],
  pizza:    [{ d: 'M32 56L8 14c14-8 34-8 48 0z', fill: '#FACC15' }, { d: 'M32 48L14 18c10-6 26-6 36 0z', fill: '#FBBF24' }, { d: C(26, 26, 4) + C(38, 28, 4) + C(32, 38, 4), fill: '#DC2626' }, { d: 'M8 14c14-8 34-8 48 0l-2 5c-13-7-31-7-44 0z', fill: '#D97706' }],
  bonbon:   [{ d: C(32, 32, 12), fill: '#F472B6' }, { d: 'M20 32L6 22v20zM44 32l14-10v20z', fill: '#F9A8D4' }, { d: 'M26 26l12 12M38 26L26 38', stroke: '#fff', lw: 3, alpha: 0.6 }],
  glace:    [{ d: 'M22 30h20L32 58z', fill: '#D97706' }, { d: 'M24 36h16M26 44h12', stroke: '#92400E', lw: 1.5 }, { d: C(32, 24, 14), fill: '#FDA4AF' }, { d: C(26, 18, 4), fill: '#fff', alpha: 0.6 }],
  cookie:   [{ d: C(32, 32, 22), fill: '#D97706' }, { d: C(24, 26, 3.5) + C(38, 24, 3.5) + C(30, 38, 3.5) + C(42, 36, 3.5) + C(22, 40, 2.5), fill: '#451A03' }],
}

// ─── Power-ups ───────────────────────────────────────────────────────────────
export const POWER: Record<string, Sprite> = {
  aimant:  [{ d: 'M16 12v20a16 16 0 0 0 32 0V12h-10v20a6 6 0 0 1-12 0V12z', fill: '#EF4444' }, { d: 'M16 12h10v8H16zM38 12h10v8H38z', fill: '#F1F5F9' }],
  ralenti: [{ d: C(32, 34, 20), fill: '#38BDF8' }, { d: 'M26 6h12v6H26z', fill: '#0EA5E9' }, { d: 'M32 20v14l9 6', stroke: '#fff', lw: 4 }],
  double:  [{ d: 'M14 12l18 10 18-10v26L32 48 14 38z', fill: '#A855F7' }, { d: 'M24 24l8 12 8-12M32 36v6', stroke: '#fff', lw: 4 }],
  coeur:   [{ d: 'M32 56S8 40 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 16-24 32-24 32z', fill: '#F43F5E' }, { d: 'M16 22c0-4 3-7 6-8', stroke: '#fff', lw: 3, alpha: 0.6 }],
}

export const HEALTHY_KEYS = Object.keys(HEALTHY)
export const JUNK_KEYS    = Object.keys(JUNK)

// ─── Waty (pastèque) + tenues ────────────────────────────────────────────────
export type WatySkin = 'classic' | 'cap' | 'glasses' | 'headband' | 'crown' | 'ninja'

function watyBase(face: 'ok' | 'ouch' | 'wow'): Sprite {
  const mouth = face === 'ouch' ? 'M27 46c2-2 8-2 10 0' : face === 'wow' ? C(32, 45, 3.5) : 'M26 43c3 4 9 4 12 0'
  return [
    { d: 'M4 26a28 28 0 0 0 56 0z', fill: '#22C55E' },
    { d: 'M9 26a23 23 0 0 0 46 0z', fill: '#F0FDF4' },
    { d: 'M12 26a20 20 0 0 0 40 0z', fill: '#FB7185' },
    { d: 'M16 26a16 16 0 0 0 32 0z', fill: '#F43F5E' },
    { d: 'M22 32c1-1 2 0 2 2s-1 3-2 2-1-3 0-4zM42 32c-1-1-2 0-2 2s1 3 2 2 1-3 0-4z', fill: '#15152A' },
    { d: C(26, 36, 3) + C(38, 36, 3), fill: '#fff' },
    { d: face === 'ouch' ? 'M24 34l4 3M28 34l-4 3M36 34l4 3M40 34l-4 3' : C(26.6, 36.4, 1.4) + C(38.6, 36.4, 1.4), fill: face === 'ouch' ? undefined : '#15152A', stroke: face === 'ouch' ? '#15152A' : undefined, lw: 2 },
    { d: mouth, fill: face === 'wow' ? '#15152A' : undefined, stroke: face === 'wow' ? undefined : '#15152A', lw: 2.2 },
    { d: 'M14 20c6-8 30-8 36 0', stroke: '#15803D', lw: 3.5 },
  ]
}

const SKIN_PARTS: Record<WatySkin, Sprite> = {
  classic:  [],
  headband: [{ d: 'M12 22h40v6H12z', fill: '#F97316' }, { d: 'M52 22l6 2-6 4z', fill: '#EA580C' }],
  cap:      [{ d: 'M12 22a20 10 0 0 1 40 0z', fill: '#4B47A0' }, { d: 'M6 24h18v5H6z', fill: '#3B3780' }, { d: C(32, 13, 3), fill: '#7B7FD4' }],
  glasses:  [{ d: C(26, 36, 7) + C(38, 36, 7), fill: '#15152A' }, { d: 'M33 36h-2M19 34l-4-2M45 34l4-2', stroke: '#15152A', lw: 2.4 }, { d: 'M22 32l2 2M34 32l2 2', stroke: '#fff', lw: 1.6, alpha: 0.5 }],
  ninja:    [{ d: 'M12 28h40v10H12z', fill: '#15152A' }, { d: C(26, 33, 2.5) + C(38, 33, 2.5), fill: '#fff' }, { d: 'M52 30l10-4-8 8z', fill: '#15152A' }],
  crown:    [{ d: 'M16 22l4-10 6 6 6-10 6 10 6-6 4 10z', fill: '#FBBF24' }, { d: 'M16 22h32v4H16z', fill: '#F59E0B' }, { d: C(32, 12, 2) + C(20, 14, 1.5) + C(44, 14, 1.5), fill: '#EF4444' }],
}

export function watySprite(skin: WatySkin = 'classic', face: 'ok' | 'ouch' | 'wow' = 'ok'): Sprite {
  // les lunettes se dessinent après les yeux, le reste avant la bouche n'importe pas
  return [...watyBase(face), ...SKIN_PARTS[skin]]
}

// ─── Rendu ───────────────────────────────────────────────────────────────────
const pathCache = new Map<string, Path2D>()
function p2d(d: string): Path2D {
  let p = pathCache.get(d)
  if (!p) { p = new Path2D(d); pathCache.set(d, p) }
  return p
}

/** Dessine un sprite centré en (x, y), à la taille `size`, tourné de `rot` radians. */
export function drawSprite(ctx: CanvasRenderingContext2D, sprite: Sprite, x: number, y: number, size: number, rot = 0, alpha = 1) {
  ctx.save()
  ctx.translate(x, y)
  if (rot) ctx.rotate(rot)
  const s = size / 64
  ctx.scale(s, s)
  ctx.translate(-32, -32)
  ctx.globalAlpha = alpha
  for (const sh of sprite) {
    const p = p2d(sh.d)
    if (sh.alpha !== undefined) ctx.globalAlpha = alpha * sh.alpha
    if (sh.fill) { ctx.fillStyle = sh.fill; ctx.fill(p) }
    if (sh.stroke) { ctx.strokeStyle = sh.stroke; ctx.lineWidth = sh.lw ?? 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(p) }
    if (sh.alpha !== undefined) ctx.globalAlpha = alpha
  }
  ctx.restore()
}

/** Même sprite en SVG inline (pour les écrans React : hub, écran de fin). */
export function spriteToSvg(sprite: Sprite, size = 48): string {
  const body = sprite.map(sh =>
    `<path d="${sh.d}" ${sh.fill ? `fill="${sh.fill}"` : 'fill="none"'} ${sh.stroke ? `stroke="${sh.stroke}" stroke-width="${sh.lw ?? 2}" stroke-linecap="round" stroke-linejoin="round"` : ''} ${sh.alpha !== undefined ? `opacity="${sh.alpha}"` : ''}/>`
  ).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${body}</svg>`
}
