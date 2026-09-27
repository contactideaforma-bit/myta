-- Migration : coupes gagnées par équipe
-- À exécuter dans Supabase SQL Editor

ALTER TABLE friend_groups
  ADD COLUMN IF NOT EXISTS cups_won         INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_cup_week    TEXT DEFAULT NULL;
