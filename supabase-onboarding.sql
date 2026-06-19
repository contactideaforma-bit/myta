-- ============================================================
-- MYTA — Parcours d'onboarding guidé par Waty
-- Ajoute une colonne de progression sur profiles.
--   Valeurs : 'profile' → 'journal' → 'sport' → 'sleep' → 'account' → 'done'
-- À exécuter une fois dans Supabase (SQL Editor).
-- ============================================================

-- 1. Colonne (sans défaut pour l'instant)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step text;

-- 2. Les utilisateurs EXISTANTS ne doivent pas revoir le guide → 'done'
UPDATE profiles SET onboarding_step = 'done' WHERE onboarding_step IS NULL;

-- 3. Les NOUVEAUX comptes démarrent le parcours au profil
ALTER TABLE profiles ALTER COLUMN onboarding_step SET DEFAULT 'profile';

-- (Le trigger handle_new_user crée la ligne profiles sans toucher cette
--  colonne, donc le DEFAULT 'profile' s'applique aux nouvelles inscriptions.)
