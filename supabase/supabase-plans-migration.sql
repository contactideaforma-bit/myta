-- ═══════════════════════════════════════════════════════════════════════════
-- Migration MYTA — Système 6 plans + comptes famille
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Colonnes supplémentaires dans profiles ───────────────────────────────

-- Plan d'abonnement (essentiel | premium | essentiel_couple | premium_couple |
--                    essentiel_famille | premium_famille)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'essentiel';

-- Compteur d'appels IA ce mois
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_calls_used INTEGER DEFAULT 0;

-- Clé du mois en cours pour le reset du compteur (format "YYYY-MM")
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_month_key TEXT DEFAULT '';

-- Famille : ID du propriétaire du forfait (null si propriétaire ou solo)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS family_owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Famille : rôle dans la famille ('owner' | 'partner' | 'child' | null)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS family_role TEXT DEFAULT NULL;

-- ─── 2. Table des invitations famille ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS family_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('partner', 'child')),  -- partner ou child
  token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

-- Index pour retrouver rapidement les invites d'un propriétaire
CREATE INDEX IF NOT EXISTS idx_family_invites_owner_id ON family_invites(owner_id);
-- Index pour lookup par token (accept flow)
CREATE INDEX IF NOT EXISTS idx_family_invites_token    ON family_invites(token);
-- Index pour cleanup des expirations
CREATE INDEX IF NOT EXISTS idx_family_invites_expires  ON family_invites(expires_at);

-- ─── 3. RLS pour family_invites ──────────────────────────────────────────────

ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

-- Le propriétaire voit et gère ses propres invites
CREATE POLICY "owner_manage_invites" ON family_invites
  FOR ALL
  USING  (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Un utilisateur peut accepter une invite par son token (via route API service-role)
-- Les acceptations passent par l'API avec supabaseAdmin → pas besoin de policy SELECT ici.

-- ─── 4. Index performance profiles ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_family_owner ON profiles(family_owner_id)
  WHERE family_owner_id IS NOT NULL;

-- ─── 5. Colonnes quota IA journalières (remplacement du compteur mensuel) ────

-- Clé du jour courant pour le reset quotidien (format "YYYY-MM-DD")
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_daily_key TEXT DEFAULT '';

-- Compteur d'analyses repas du jour (analyze-meal-photo + voice-meal cumulé)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_daily_meal_used INTEGER DEFAULT 0;

-- Compteur d'analyses séance du jour (voice-session)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_daily_sport_used INTEGER DEFAULT 0;

-- ─── 6. Vue pratique : membres d'une famille ─────────────────────────────────

CREATE OR REPLACE VIEW family_members AS
SELECT
  m.id,
  m.full_name,
  m.family_role,
  m.family_owner_id,
  m.plan,
  m.ai_daily_key,
  m.ai_daily_meal_used,
  m.ai_daily_sport_used,
  m.subscription_status
FROM profiles m
WHERE m.family_owner_id IS NOT NULL;

-- ─── 7. Migrer les abonnés existants en plan 'premium' ───────────────────────
-- (ils avaient souscrit à l'ancien forfait unique = accès complet)

UPDATE profiles
SET plan = 'premium'
WHERE subscription_status IN ('trialing', 'active', 'vip')
  AND (plan IS NULL OR plan = 'essentiel');

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN DE MIGRATION
-- Vérification recommandée après exécution :
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'profiles' ORDER BY ordinal_position;
--
--   SELECT id, plan, ai_daily_key, ai_daily_meal_used, ai_daily_sport_used
--   FROM profiles LIMIT 5;
-- ═══════════════════════════════════════════════════════════════════════════
