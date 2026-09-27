-- ============================================================
-- MYTA — Migration Gamification + Tabac
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ── 1. Colonnes profil ──────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS smoking_goal       boolean   DEFAULT false,
  ADD COLUMN IF NOT EXISTS quit_smoking_start date      DEFAULT NULL;

-- ── 2. Badges utilisateurs ──────────────────────────────────
CREATE TABLE IF NOT EXISTS user_badges (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_key  text        NOT NULL,
  earned_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, badge_key)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_badges_select" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_badges_insert" ON user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_badges_delete" ON user_badges
  FOR DELETE USING (auth.uid() = user_id);

-- ── 3. Complétions challenges du jour ───────────────────────
CREATE TABLE IF NOT EXISTS challenge_completions (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_key    text NOT NULL,
  completed_date   date NOT NULL,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (user_id, challenge_key, completed_date)
);

ALTER TABLE challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenge_completions_select" ON challenge_completions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "challenge_completions_insert" ON challenge_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 4. Journal tabac ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS smoking_log (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date   date NOT NULL,
  count      integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, log_date)
);

ALTER TABLE smoking_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "smoking_log_select" ON smoking_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "smoking_log_insert" ON smoking_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "smoking_log_update" ON smoking_log
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "smoking_log_delete" ON smoking_log
  FOR DELETE USING (auth.uid() = user_id);

-- ── 5. Index performances ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_badges_user        ON user_badges (user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_user_date
  ON challenge_completions (user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_smoking_log_user_date   ON smoking_log (user_id, log_date);
