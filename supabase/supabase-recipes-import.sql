-- ═══════════════════════════════════════════════════════════════════════════
-- MYTA — Import de recettes (lien Instagram/TikTok, capture, photo) + Score MYTA
-- À exécuter dans le SQL Editor Supabase AVANT le push. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. saved_recipes : macros complètes + provenance + score ────────────────
alter table saved_recipes
  add column if not exists proteines          numeric,
  add column if not exists glucides           numeric,
  add column if not exists lipides            numeric,
  add column if not exists sucres             numeric,
  add column if not exists satures            numeric,
  add column if not exists fibres             numeric,
  add column if not exists sel_g              numeric,
  add column if not exists poids_portion_g    numeric,
  add column if not exists score_grade        text,      -- 'A'..'E' ou null (non affichable)
  add column if not exists score_points       integer,
  add column if not exists score_confidence   text,      -- haute | moyenne | faible
  add column if not exists score_detail       jsonb,     -- per100g / perPortion / unmatched
  add column if not exists source_kind        text default 'ia',
                                                         -- ia | instagram | tiktok | web | capture | photo | texte
  add column if not exists source_url         text,
  add column if not exists source_author      text,
  add column if not exists source_captured_at timestamptz,
  add column if not exists temps_prep         integer,
  add column if not exists temps_cuisson      integer,
  add column if not exists ustensiles         jsonb,
  add column if not exists conseils_chef      text,
  add column if not exists accompagnements    jsonb;

-- ── 2. Quota MENSUEL d'imports (le quota existant est journalier) ────────────
alter table profiles
  add column if not exists ai_month_key         text,              -- 'YYYY-MM'
  add column if not exists ai_month_import_used integer default 0;

-- ── 3. Vérification ─────────────────────────────────────────────────────────
-- select column_name from information_schema.columns where table_name = 'saved_recipes' order by 1;
