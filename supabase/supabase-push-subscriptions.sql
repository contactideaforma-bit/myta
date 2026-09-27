-- ============================================================
-- MYTA — Table des abonnements push (manquante en base au 27/09/2026)
-- À exécuter UNE FOIS dans Supabase → SQL Editor.
-- Un appareil abonné par utilisateur (le dernier activé).
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
-- Aucune policy : seul le serveur (service role) lit et écrit.
