-- ============================================================
-- MYTA — Espace admin « Collabs » : comptes partenaires Premium
-- à durée limitée + codes promo (jours Premium offerts).
-- À exécuter dans Supabase (SQL Editor) AVANT le push. Idempotent.
-- ============================================================

-- ── 1. Profils : accès à durée limitée + marqueur partenaire ───────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS access_until  timestamptz,      -- fin d'accès (statut 'vip' seulement) ; NULL = permanent
  ADD COLUMN IF NOT EXISTS is_partner    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_note  text,
  ADD COLUMN IF NOT EXISTS partner_since timestamptz;

-- ── 2. Codes promo ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  code            text PRIMARY KEY,                       -- majuscules, sans espaces
  partner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  days            integer NOT NULL CHECK (days > 0),      -- jours de Premium offerts
  max_uses        integer,                                -- NULL = illimité
  uses            integer NOT NULL DEFAULT 0,
  expires_at      timestamptz,                            -- NULL = sans date de fin
  active          boolean NOT NULL DEFAULT true,
  note            text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS promo_codes_partner_idx ON promo_codes(partner_user_id);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  code        text NOT NULL REFERENCES promo_codes(code) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  days        integer NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (code, user_id)
);

ALTER TABLE promo_codes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Un partenaire voit ses propres codes et leurs utilisations (pas les utilisateurs)
DROP POLICY IF EXISTS "promo_codes_partner_select" ON promo_codes;
CREATE POLICY "promo_codes_partner_select" ON promo_codes
  FOR SELECT USING (auth.uid() = partner_user_id);

DROP POLICY IF EXISTS "promo_redemptions_own_select" ON promo_redemptions;
CREATE POLICY "promo_redemptions_own_select" ON promo_redemptions
  FOR SELECT USING (auth.uid() = user_id);
-- Toute écriture passe par le service role (API admin) ou la RPC ci-dessous.

-- ── 3. Utiliser un code (appelée par l'utilisateur connecté) ────────────────
CREATE OR REPLACE FUNCTION redeem_promo(p_code text)
RETURNS TABLE (ok boolean, reason text, days_added integer, until_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user   uuid := auth.uid();
  v_code   text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  v_promo  promo_codes%ROWTYPE;
  v_status text;
  v_until  timestamptz;
  v_base   timestamptz;
BEGIN
  IF v_user IS NULL THEN RETURN QUERY SELECT false, 'not_authenticated', 0, NULL::timestamptz; RETURN; END IF;

  SELECT * INTO v_promo FROM promo_codes WHERE code = v_code;
  IF NOT FOUND OR NOT v_promo.active THEN RETURN QUERY SELECT false, 'invalid', 0, NULL::timestamptz; RETURN; END IF;
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN RETURN QUERY SELECT false, 'expired', 0, NULL::timestamptz; RETURN; END IF;
  IF v_promo.max_uses IS NOT NULL AND v_promo.uses >= v_promo.max_uses THEN RETURN QUERY SELECT false, 'exhausted', 0, NULL::timestamptz; RETURN; END IF;
  IF v_promo.partner_user_id = v_user THEN RETURN QUERY SELECT false, 'own_code', 0, NULL::timestamptz; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM promo_redemptions WHERE code = v_code AND user_id = v_user) THEN
    RETURN QUERY SELECT false, 'already_used', 0, NULL::timestamptz; RETURN;
  END IF;

  SELECT subscription_status, profiles.access_until INTO v_status, v_until FROM profiles WHERE id = v_user;
  -- Un abonné payant (Stripe / stores) ne cumule pas : on ne touche pas à son abonnement.
  IF v_status IN ('active', 'past_due') THEN RETURN QUERY SELECT false, 'already_subscribed', 0, NULL::timestamptz; RETURN; END IF;

  v_base := CASE WHEN v_status = 'vip' AND v_until IS NOT NULL AND v_until > now() THEN v_until ELSE now() END;
  v_until := v_base + make_interval(days => v_promo.days);

  INSERT INTO promo_redemptions (code, user_id, days) VALUES (v_code, v_user, v_promo.days);
  UPDATE promo_codes SET uses = uses + 1 WHERE code = v_code;
  UPDATE profiles
     SET subscription_status = 'vip',
         plan = 'premium',
         access_until = v_until
   WHERE id = v_user;

  RETURN QUERY SELECT true, 'ok', v_promo.days, v_until;
END $$;

-- ── 4. Vue pratique pour l'admin : codes + utilisations ─────────────────────
CREATE OR REPLACE VIEW promo_codes_stats AS
  SELECT c.*, p.full_name AS partner_name,
         (SELECT count(*) FROM promo_redemptions r WHERE r.code = c.code)::int AS redemptions
  FROM promo_codes c
  LEFT JOIN profiles p ON p.id = c.partner_user_id;

-- ── 5. Le compte admin garde un accès permanent (statut vip sans date) ──────
UPDATE profiles SET subscription_status = 'vip', plan = 'premium', access_until = NULL
WHERE id = (SELECT id FROM auth.users WHERE lower(email) = 'contact@mytwinapp.fr' LIMIT 1);
