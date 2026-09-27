-- ============================================================
-- MYTA — Rappels push réglables (repas, eau, sport, sommeil…)
-- À exécuter UNE FOIS dans Supabase → SQL Editor.
--
-- ⚠️ AVANT d'exécuter : remplace REMPLACE_PAR_TON_CRON_SECRET (étape 3)
--    par la valeur de la variable CRON_SECRET de Vercel
--    (Vercel → Settings → Environment Variables → CRON_SECRET).
-- ============================================================

-- ── 1. Réglages de chaque utilisateur ────────────────────────
CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone   text NOT NULL DEFAULT 'Europe/Paris',
  prefs      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_prefs_select_own" ON notification_prefs;
CREATE POLICY "notification_prefs_select_own" ON notification_prefs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_prefs_insert_own" ON notification_prefs;
CREATE POLICY "notification_prefs_insert_own" ON notification_prefs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_prefs_update_own" ON notification_prefs;
CREATE POLICY "notification_prefs_update_own" ON notification_prefs
  FOR UPDATE USING (auth.uid() = user_id);

-- ── 2. Journal d'envoi (anti-doublon, serveur uniquement) ────
CREATE TABLE IF NOT EXISTS notification_log (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_key text NOT NULL,
  local_date   date NOT NULL,
  sent_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reminder_key, local_date)
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
-- Aucune policy : seul le serveur (service role) lit et écrit.

-- ── 3. Horloge : appel de l'API toutes les 15 minutes ────────
-- (Vercel Hobby n'autorise qu'un cron par jour, d'où pg_cron côté Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'myta-rappels';

SELECT cron.schedule(
  'myta-rappels',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://mytwinapp.fr/api/notifications/dispatch',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer REMPLACE_PAR_TON_CRON_SECRET"}'::jsonb,
    body    := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- ── 4. Ménage : on garde 30 jours de journal d'envoi ─────────
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'myta-rappels-menage';

SELECT cron.schedule(
  'myta-rappels-menage',
  '30 3 * * *',
  $$ DELETE FROM notification_log WHERE local_date < current_date - 30; $$
);

-- Vérification : les 2 tâches doivent apparaître
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'myta-rappels%';
