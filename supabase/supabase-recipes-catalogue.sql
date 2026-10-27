-- ============================================================
-- MYTA — Catalogue de recettes : partage public par jeton, complétions Waty
-- À exécuter dans Supabase (SQL Editor). Idempotent.
-- ============================================================

-- 1. Colonnes
ALTER TABLE saved_recipes
  ADD COLUMN IF NOT EXISTS completions jsonb,          -- ce que Waty a complété (liste de phrases)
  ADD COLUMN IF NOT EXISTS share_token text;           -- jeton public de partage (lien / PDF)

-- Jeton pour les recettes existantes + valeur par défaut pour les suivantes
UPDATE saved_recipes SET share_token = substr(replace(gen_random_uuid()::text, '-', ''), 1, 16) WHERE share_token IS NULL;
ALTER TABLE saved_recipes ALTER COLUMN share_token SET DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
CREATE UNIQUE INDEX IF NOT EXISTS saved_recipes_share_token_idx ON saved_recipes(share_token);

-- 2. Lecture publique d'une recette par son jeton (page de partage, PDF)
--    La RLS n'autorise que le propriétaire : cette fonction expose UNE recette, sans user_id.
CREATE OR REPLACE FUNCTION get_shared_recipe(p_token text)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT to_jsonb(r) - 'user_id' - 'id'
  FROM saved_recipes r
  WHERE r.share_token = p_token
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION get_shared_recipe(text) TO anon, authenticated;
