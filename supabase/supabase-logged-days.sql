-- ============================================================
-- MYTA — Série (jours loggés) comptée côté base
-- À exécuter UNE FOIS dans Supabase → SQL Editor, AVANT le git push.
--
-- Pourquoi : le tableau de bord récupérait TOUTES les lignes du journal
-- pour compter les jours. Supabase plafonne une réponse à 1 000 lignes :
-- au-delà, la série se figeait (et pouvait différer d'un appareil à l'autre).
-- Ici on compte directement les jours distincts : 1 nombre renvoyé.
-- ============================================================

CREATE OR REPLACE FUNCTION public.logged_days_count(p_user uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER          -- respecte le RLS : un utilisateur ne compte que SES jours
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT date)::integer
  FROM journal_entries
  WHERE user_id = p_user;
$$;

REVOKE ALL ON FUNCTION public.logged_days_count(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.logged_days_count(uuid) TO authenticated, service_role;

-- Index pour que le comptage reste instantané
CREATE INDEX IF NOT EXISTS journal_entries_user_date_idx
  ON journal_entries (user_id, date);
