-- ============================================================
-- MYTA — Campagnes e-mail depuis l'espace admin
-- Désinscription (RGPD), historique des campagnes, ciblage par segment.
-- À exécuter dans Supabase (SQL Editor). Idempotent.
-- ============================================================

-- ── 1. Désinscription des e-mails de relance (lien dans chaque mail) ────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_optout boolean NOT NULL DEFAULT false;

-- ── 2. Historique des campagnes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_campaigns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment     text NOT NULL,
  idea        text,                       -- la consigne / mot-clé saisi par l'admin
  subject     text NOT NULL,
  preheader   text,
  body        jsonb NOT NULL,             -- { paragraphs: string[], cta: string, ctaPath: string }
  recipients  integer NOT NULL DEFAULT 0,
  sent        integer NOT NULL DEFAULT 0,
  failed      integer NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;   -- aucune policy : service role uniquement

-- ── 3. Audience d'un segment (e-mails) — service role uniquement ────────────
--   all       : tous les comptes avec e-mail
--   dormant   : inscrits depuis > 7 j, aucune ouverture sur 30 j (ou jamais connectés)
--   never     : compte créé, jamais connecté
--   trial     : essai en cours ou gratuits / essai terminé (non payants, non vip)
--   premium   : abonnés actifs + vip + partenaires
CREATE OR REPLACE FUNCTION admin_campaign_audience(p_segment text)
RETURNS TABLE (user_id uuid, email text, full_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email, p.full_name
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.email IS NOT NULL
    AND coalesce(p.email_optout, false) = false
    AND u.deleted_at IS NULL
    AND CASE p_segment
      WHEN 'all'     THEN true
      WHEN 'never'   THEN u.last_sign_in_at IS NULL
      WHEN 'dormant' THEN u.created_at < now() - interval '7 days'
                          AND NOT EXISTS (SELECT 1 FROM activity_days a WHERE a.user_id = u.id AND a.day >= CURRENT_DATE - 29)
      WHEN 'trial'   THEN coalesce(p.subscription_status, 'free') NOT IN ('active', 'past_due', 'vip')
      WHEN 'premium' THEN p.subscription_status IN ('active', 'vip') OR coalesce(p.is_partner, false)
      ELSE false END
  ORDER BY u.created_at DESC;
$$;
REVOKE EXECUTE ON FUNCTION admin_campaign_audience(text) FROM PUBLIC, anon, authenticated;

-- ── 4. Effectifs par segment (pour l'écran admin) ───────────────────────────
CREATE OR REPLACE FUNCTION admin_campaign_counts()
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'all',     (SELECT count(*) FROM admin_campaign_audience('all')),
    'never',   (SELECT count(*) FROM admin_campaign_audience('never')),
    'dormant', (SELECT count(*) FROM admin_campaign_audience('dormant')),
    'trial',   (SELECT count(*) FROM admin_campaign_audience('trial')),
    'premium', (SELECT count(*) FROM admin_campaign_audience('premium')),
    'optout',  (SELECT count(*) FROM profiles WHERE email_optout)
  );
$$;
REVOKE EXECUTE ON FUNCTION admin_campaign_counts() FROM PUBLIC, anon, authenticated;
