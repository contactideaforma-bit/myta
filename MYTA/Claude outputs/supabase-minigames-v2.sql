-- ============================================================
-- MYTA — Mini-jeux v2 : défi du jour, série, points, skins, classement amis
-- À exécuter dans Supabase (SQL Editor) AVANT le push. Idempotent.
-- Prérequis : supabase-minigames.sql (activity_days, game_scores) et
--             supabase-groups.sql (friend_groups, group_members).
-- ============================================================

-- ── 1. Profil : points, skin, série de jeu ──────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS game_points    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waty_skin      text    NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS game_streak    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS game_last_day  date;

-- ── 2. Parties jouées (une ligne par partie) ────────────────
CREATE TABLE IF NOT EXISTS game_runs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_key   text NOT NULL,                   -- 'lava' | 'tri' | 'runner'
  mode       text NOT NULL DEFAULT 'libre',   -- 'libre' | 'defi'
  score      integer NOT NULL DEFAULT 0,
  day        date NOT NULL DEFAULT CURRENT_DATE,
  week_key   text NOT NULL,                   -- 'YYYY-Www' (ISO)
  defi_ok    boolean NOT NULL DEFAULT false,  -- objectif du défi atteint
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS game_runs_user_idx ON game_runs(user_id, game_key, day);
CREATE INDEX IF NOT EXISTS game_runs_week_idx ON game_runs(game_key, week_key, score DESC);

ALTER TABLE game_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_runs_insert_own" ON game_runs;
CREATE POLICY "game_runs_insert_own" ON game_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Lecture : mes parties + celles des membres de mes groupes (classement amis)
DROP POLICY IF EXISTS "game_runs_select_friends" ON game_runs;
CREATE POLICY "game_runs_select_friends" ON game_runs
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM group_members a
      JOIN group_members b ON a.group_id = b.group_id
      WHERE a.user_id = auth.uid() AND b.user_id = game_runs.user_id
    )
  );

-- ── 3. Meilleurs scores lisibles par les amis (classement général) ──
DROP POLICY IF EXISTS "game_scores_select_friends" ON game_scores;
CREATE POLICY "game_scores_select_friends" ON game_scores
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM group_members a
      JOIN group_members b ON a.group_id = b.group_id
      WHERE a.user_id = auth.uid() AND b.user_id = game_scores.user_id
    )
  );

-- ── 4. Classement hebdo d'un jeu parmi mes amis (meilleure partie de la semaine) ──
CREATE OR REPLACE FUNCTION game_week_leaderboard(p_game text, p_week text)
RETURNS TABLE (user_id uuid, full_name text, best integer, runs integer)
LANGUAGE sql SECURITY INVOKER STABLE AS $$
  SELECT r.user_id, p.full_name, MAX(r.score) AS best, COUNT(*)::int AS runs
  FROM game_runs r
  JOIN profiles p ON p.id = r.user_id
  WHERE r.game_key = p_game AND r.week_key = p_week
  GROUP BY r.user_id, p.full_name
  ORDER BY best DESC
  LIMIT 20;
$$;

-- ── 5. Fin de partie : enregistre la partie, met à jour record, points, série ──
--     Appelée par le client (RPC). SECURITY DEFINER pour écrire le profil en une fois.
CREATE OR REPLACE FUNCTION game_finish_run(
  p_game text, p_mode text, p_score integer, p_points integer, p_defi_ok boolean, p_week text
) RETURNS TABLE (new_record boolean, game_points integer, game_streak integer)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user uuid := auth.uid();
  v_prev integer;
  v_last date;
  v_streak integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  INSERT INTO game_runs (user_id, game_key, mode, score, week_key, defi_ok)
  VALUES (v_user, p_game, p_mode, GREATEST(0, p_score), p_week, COALESCE(p_defi_ok, false));

  SELECT best_score INTO v_prev FROM game_scores WHERE user_id = v_user AND game_key = p_game;
  IF v_prev IS NULL THEN
    INSERT INTO game_scores (user_id, game_key, best_score) VALUES (v_user, p_game, GREATEST(0, p_score));
    new_record := p_score > 0;
  ELSIF p_score > v_prev THEN
    UPDATE game_scores SET best_score = p_score, updated_at = now() WHERE user_id = v_user AND game_key = p_game;
    new_record := true;
  ELSE
    new_record := false;
  END IF;

  -- Série de jeu : +1 si on joue un jour de plus (consécutif), reset sinon
  SELECT game_last_day, profiles.game_streak INTO v_last, v_streak FROM profiles WHERE id = v_user;
  IF v_last = CURRENT_DATE THEN
    NULL;
  ELSIF v_last = CURRENT_DATE - 1 THEN
    v_streak := COALESCE(v_streak, 0) + 1;
  ELSE
    v_streak := 1;
  END IF;

  UPDATE profiles
     SET game_points   = COALESCE(profiles.game_points, 0) + GREATEST(0, COALESCE(p_points, 0)),
         game_streak   = v_streak,
         game_last_day = CURRENT_DATE
   WHERE id = v_user
   RETURNING profiles.game_points, profiles.game_streak INTO game_points, game_streak;

  RETURN NEXT;
END $$;

-- ── 6. Choisir une tenue de Waty ──
CREATE OR REPLACE FUNCTION game_set_skin(p_skin text)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles SET waty_skin = p_skin WHERE id = auth.uid();
$$;
