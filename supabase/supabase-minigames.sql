-- ============================================================
-- MYTA — Mini-jeux Waty
-- 1. activity_days : 1 ligne par jour d'utilisation de l'app
--    (jours NON consécutifs — sert aux paliers 7 / 14 / 30 jours)
-- 2. game_scores : meilleur score par utilisateur et par jeu
-- À exécuter une fois dans Supabase (SQL Editor).
-- ============================================================

-- ── 1. Jours d'utilisation ──────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_days (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day     date NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (user_id, day)
);

ALTER TABLE activity_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_days_select_own" ON activity_days;
CREATE POLICY "activity_days_select_own" ON activity_days
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "activity_days_insert_own" ON activity_days;
CREATE POLICY "activity_days_insert_own" ON activity_days
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 2. Meilleurs scores ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_scores (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_key   text NOT NULL,           -- 'lava' | 'tri' | 'runner'
  best_score integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game_key)
);

ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_scores_select_own" ON game_scores;
CREATE POLICY "game_scores_select_own" ON game_scores
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "game_scores_insert_own" ON game_scores;
CREATE POLICY "game_scores_insert_own" ON game_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "game_scores_update_own" ON game_scores;
CREATE POLICY "game_scores_update_own" ON game_scores
  FOR UPDATE USING (auth.uid() = user_id);

-- ── 3. Backfill pour les utilisateurs EXISTANTS ─────────────
-- Chaque jour où ils ont loggé un repas ou une séance compte
-- comme un jour d'utilisation → ils ne repartent pas de zéro.
INSERT INTO activity_days (user_id, day)
SELECT DISTINCT user_id, date::date FROM journal_entries
WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO activity_days (user_id, day)
SELECT DISTINCT user_id, session_date::date FROM sessions
WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;
