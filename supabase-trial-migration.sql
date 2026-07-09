-- ═══════════════════════════════════════════════════════════════════════════
-- Migration MYTA — Essai gratuit 3 jours SANS carte bancaire (modèle "Netflix")
-- À exécuter dans Supabase Dashboard > SQL Editor
--
-- Principe : à l'inscription, tout nouveau compte reçoit automatiquement
--   subscription_status = 'trialing' + trial_ends_at = now() + 3 jours.
-- Aucune CB demandée. À l'expiration, l'accès se coupe (calculé à la volée
-- via trial_ends_at, donc AUCUN cron nécessaire). Le paiement se fait ensuite
-- sur le site web (Stripe), jamais dans l'app iOS.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Colonne de fin d'essai ───────────────────────────────────────────────
-- PAS de DEFAULT : en Postgres, un DEFAULT sur ADD COLUMN remplit AUSSI les
-- lignes existantes → on l'évite pour ne pas donner une fausse date d'essai aux
-- abonnés Stripe déjà en cours. La date est posée par le trigger (§2), qui ne
-- s'applique qu'aux NOUVEAUX comptes. Les profils existants restent à NULL
-- (interprété comme "essai géré par Stripe" ou "pas d'essai" selon le statut).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- ─── 2. Déclencheur : forcer 'trialing' sur les nouveaux profils ─────────────
-- Compose avec le trigger existant handle_new_user (sur auth.users) sans le
-- réécrire. Ne touche QUE les nouveaux comptes 'free'/NULL → pas d'impact sur
-- les abonnés existants ni sur les statuts gérés par Stripe.
CREATE OR REPLACE FUNCTION public.set_free_trial_on_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subscription_status IS NULL OR NEW.subscription_status = 'free' THEN
    NEW.subscription_status := 'trialing';
  END IF;
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NOW() + INTERVAL '3 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_free_trial ON profiles;
CREATE TRIGGER trg_set_free_trial
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_free_trial_on_new_profile();

-- ═══════════════════════════════════════════════════════════════════════════
-- Vérification :
--   SELECT id, subscription_status, trial_ends_at FROM profiles
--   ORDER BY created_at DESC LIMIT 5;
-- ═══════════════════════════════════════════════════════════════════════════
