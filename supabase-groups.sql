-- ============================================================
-- MYTA — Migration Groupes / Système social
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ── 1. Créer les deux tables D'ABORD ────────────────────────

CREATE TABLE IF NOT EXISTS friend_groups (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  created_by  uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mode        text        NOT NULL DEFAULT 'equipe'
              CHECK (mode IN ('equipe', 'competition')),
  invite_code text        NOT NULL UNIQUE,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id      uuid        REFERENCES friend_groups(id) ON DELETE CASCADE NOT NULL,
  user_id       uuid        REFERENCES auth.users(id)    ON DELETE CASCADE NOT NULL,
  privacy_level text        NOT NULL DEFAULT 'standard'
                CHECK (privacy_level IN ('minimum', 'standard')),
  joined_at     timestamptz DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- ── 2. Activer RLS ───────────────────────────────────────────

ALTER TABLE friend_groups  ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members  ENABLE ROW LEVEL SECURITY;

-- ── 3. Politiques friend_groups ──────────────────────────────
-- (APRÈS la création de group_members car la policy SELECT le référence)

CREATE POLICY "groups_select" ON friend_groups
  FOR SELECT USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = friend_groups.id
        AND group_members.user_id  = auth.uid()
    )
  );

CREATE POLICY "groups_insert" ON friend_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "groups_delete" ON friend_groups
  FOR DELETE USING (auth.uid() = created_by);

-- ── 4. Politiques group_members ──────────────────────────────

CREATE POLICY "members_select" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.group_id = group_members.group_id
        AND gm2.user_id  = auth.uid()
    )
  );

CREATE POLICY "members_insert" ON group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "members_delete" ON group_members
  FOR DELETE USING (auth.uid() = user_id);

-- ── 5. Index ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_friend_groups_invite ON friend_groups (invite_code);
CREATE INDEX IF NOT EXISTS idx_group_members_group  ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user   ON group_members (user_id);
