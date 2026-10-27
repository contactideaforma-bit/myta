-- ============================================================
-- MYTA — Statistiques d'usage anonymisées pour l'espace admin
-- Une fonction unique, appelée avec la clé service (jamais depuis le client).
-- À exécuter dans Supabase (SQL Editor). Idempotent.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_stats(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d_from  date := CURRENT_DATE - (p_days - 1);
  d_7     date := CURRENT_DATE - 6;
  v_out jsonb := '{}'::jsonb;
  v_users jsonb; v_activity jsonb; v_feats jsonb; v_series jsonb; v_games jsonb; v_social jsonb;
BEGIN
  -- ── Utilisateurs ──────────────────────────────────────────────────────────
  SELECT jsonb_build_object(
    'total',        (SELECT count(*) FROM auth.users),
    'new7',         (SELECT count(*) FROM auth.users WHERE created_at >= now() - interval '7 days'),
    'new30',        (SELECT count(*) FROM auth.users WHERE created_at >= now() - interval '30 days'),
    'neverSignedIn',(SELECT count(*) FROM auth.users WHERE last_sign_in_at IS NULL),
    'byStatus',     (SELECT coalesce(jsonb_object_agg(coalesce(subscription_status, 'free'), n), '{}'::jsonb)
                       FROM (SELECT subscription_status, count(*) n FROM profiles GROUP BY 1) s),
    'byPlan',       (SELECT coalesce(jsonb_object_agg(coalesce(plan, 'aucun'), n), '{}'::jsonb)
                       FROM (SELECT plan, count(*) n FROM profiles WHERE subscription_status IN ('active','trialing','vip') GROUP BY 1) s),
    'paying',       (SELECT count(*) FROM profiles WHERE subscription_status = 'active'),
    'trialing',     (SELECT count(*) FROM profiles WHERE subscription_status = 'trialing' AND (trial_ends_at IS NULL OR trial_ends_at > now())),
    'vip',          (SELECT count(*) FROM profiles WHERE subscription_status = 'vip' AND (access_until IS NULL OR access_until > now())),
    'partners',     (SELECT count(*) FROM profiles WHERE is_partner),
    'profileComplete', (SELECT count(*) FROM profiles WHERE weight_kg IS NOT NULL AND height_cm IS NOT NULL AND birth_date IS NOT NULL),
    'pushEnabled',  (SELECT count(DISTINCT user_id) FROM push_subscriptions)
  ) INTO v_users;

  -- ── Activité (jours d'ouverture de l'app) ─────────────────────────────────
  SELECT jsonb_build_object(
    'dau',   (SELECT count(DISTINCT user_id) FROM activity_days WHERE day = CURRENT_DATE),
    'wau',   (SELECT count(DISTINCT user_id) FROM activity_days WHERE day >= d_7),
    'mau',   (SELECT count(DISTINCT user_id) FROM activity_days WHERE day >= CURRENT_DATE - 29),
    'activeInPeriod', (SELECT count(DISTINCT user_id) FROM activity_days WHERE day >= d_from),
    -- fréquence : jours actifs moyens par utilisateur actif sur la période
    'avgDaysPerActive', (SELECT coalesce(round(avg(n), 1), 0) FROM (SELECT count(*) n FROM activity_days WHERE day >= d_from GROUP BY user_id) t),
    -- répartition de fréquence : 1 jour / 2-4 / 5-9 / 10+
    'freqBuckets', (SELECT jsonb_build_object(
        '1',    count(*) FILTER (WHERE n = 1),
        '2-4',  count(*) FILTER (WHERE n BETWEEN 2 AND 4),
        '5-9',  count(*) FILTER (WHERE n BETWEEN 5 AND 9),
        '10+',  count(*) FILTER (WHERE n >= 10))
      FROM (SELECT count(*) n FROM activity_days WHERE day >= d_from GROUP BY user_id) t),
    -- rétention simple : inscrits il y a 8-37 j, encore actifs sur les 7 derniers jours
    'retention7', (SELECT jsonb_build_object(
        'cohort', count(*),
        'retained', count(*) FILTER (WHERE EXISTS (SELECT 1 FROM activity_days a WHERE a.user_id = u.id AND a.day >= d_7)))
      FROM auth.users u WHERE u.created_at BETWEEN now() - interval '37 days' AND now() - interval '8 days'),
    -- dormants : inscrits depuis > 7 j, aucune ouverture sur 30 j
    'dormant30', (SELECT count(*) FROM auth.users u WHERE u.created_at < now() - interval '7 days'
                    AND NOT EXISTS (SELECT 1 FROM activity_days a WHERE a.user_id = u.id AND a.day >= CURRENT_DATE - 29))
  ) INTO v_activity;

  -- ── Fonctionnalités : volume + utilisateurs distincts sur la période ──────
  SELECT jsonb_build_object(
    'journal', jsonb_build_object('count', count(*), 'users', count(DISTINCT user_id),
                 'photo', count(*) FILTER (WHERE image_url IS NOT NULL),
                 'supplements', count(*) FILTER (WHERE food_cat = 'complément')))
    INTO v_feats
    FROM journal_entries WHERE date >= d_from;
  v_feats := v_feats || jsonb_build_object(
    'sessions',  (SELECT jsonb_build_object('count', count(*), 'users', count(DISTINCT user_id), 'minutes', coalesce(sum(duration_min), 0)) FROM sessions WHERE session_date >= d_from),
    'sleep',     (SELECT jsonb_build_object('count', count(*), 'users', count(DISTINCT user_id), 'avgMinutes', coalesce(round(avg(duration_min) FILTER (WHERE duration_min > 0)), 0)) FROM sleep_log WHERE date >= d_from),
    'weight',    (SELECT jsonb_build_object('count', count(*), 'users', count(DISTINCT user_id)) FROM weight_log WHERE date >= d_from),
    'recipes',   (SELECT jsonb_build_object('count', count(*), 'users', count(DISTINCT user_id),
                    'imported', count(*) FILTER (WHERE coalesce(source_kind, 'ia') <> 'ia'),
                    'byKind', coalesce((SELECT jsonb_object_agg(k, n) FROM (SELECT coalesce(source_kind,'ia') k, count(*) n FROM saved_recipes WHERE created_at >= d_from GROUP BY 1) s), '{}'::jsonb))
                  FROM saved_recipes WHERE created_at >= d_from),
    'challenges',(SELECT jsonb_build_object('count', count(*), 'users', count(DISTINCT user_id)) FROM challenge_completions WHERE completed_date >= d_from),
    'promo',     (SELECT jsonb_build_object('count', count(*), 'users', count(DISTINCT user_id)) FROM promo_redemptions WHERE redeemed_at >= d_from)
  );

  -- ── Mini-jeux ─────────────────────────────────────────────────────────────
  SELECT coalesce(jsonb_object_agg(game_key, jsonb_build_object('runs', runs, 'users', users, 'defis', defis, 'defisOk', defis_ok)), '{}'::jsonb)
    INTO v_games
    FROM (SELECT game_key, count(*) runs, count(DISTINCT user_id) users,
                 count(*) FILTER (WHERE mode = 'defi') defis, count(*) FILTER (WHERE defi_ok) defis_ok
            FROM game_runs WHERE day >= d_from GROUP BY game_key) g;

  -- ── Social ────────────────────────────────────────────────────────────────
  SELECT jsonb_build_object(
    'groups',   (SELECT count(*) FROM friend_groups),
    'members',  (SELECT count(DISTINCT user_id) FROM group_members),
    'messages', (SELECT count(*) FROM group_messages WHERE created_at >= d_from)
  ) INTO v_social;

  -- ── Séries par jour (période) : utilisateurs actifs et repas notés ────────
  SELECT coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'active', a.n, 'meals', m.n, 'sessions', s.n) ORDER BY d), '[]'::jsonb)
    INTO v_series
    FROM generate_series(d_from, CURRENT_DATE, interval '1 day') d
    LEFT JOIN LATERAL (SELECT count(DISTINCT user_id) n FROM activity_days WHERE day = d::date) a ON true
    LEFT JOIN LATERAL (SELECT count(*) n FROM journal_entries WHERE date = d::date) m ON true
    LEFT JOIN LATERAL (SELECT count(*) n FROM sessions WHERE session_date = d::date) s ON true;

  v_out := jsonb_build_object('days', p_days, 'from', d_from, 'users', v_users, 'activity', v_activity,
                              'features', v_feats, 'games', v_games, 'social', v_social, 'series', v_series,
                              'generatedAt', now());
  RETURN v_out;
END $$;

-- Jamais appelable depuis l'app (clé anonyme / utilisateur) : service role uniquement
REVOKE EXECUTE ON FUNCTION admin_stats(integer) FROM PUBLIC, anon, authenticated;
