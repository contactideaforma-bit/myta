-- ============================================================
-- MYTA — Migration Groupes (reset propre)
-- ============================================================

-- ── 0. Nettoyage si tables partiellement créées ──────────────
DROP TABLE IF EXISTS group_members  CASCADE;
DROP TABLE IF EXISTS friend_groups  CASCADE;

-- ── 1. Tables ────────────────────────────────────────────────

CREATE TABLE friend_groups (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  created_by  uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mode        text        NOT NULL DEFAULT 'equipe'
              CHECK (mode IN ('equipe', 'competition')),
  invite_code text        NOT NULL UNIQUE,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE group_members (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id      uuid        REFERENCES friend_groups(id) ON DELETE CASCADE NOT NULL,
  user_id       uuid        REFERENCES auth.users(id)    ON DELETE CASCADE NOT NULL,
  privacy_level text        NOT NULL DEFAULT 'standard'
                CHECK (privacy_level IN ('minimum', 'standard')),
  joined_at     timestamptz DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- ── 2. RLS ───────────────────────────────────────────────────

ALTER TABLE friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- friend_groups — SELECT (référence group_members qui existe maintenant)
CREATE POLICY "groups_select" ON friend_groups FOR SELECT USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = friend_groups.id
      AND group_members.user_id  = auth.uid()
  )
);
CREATE POLICY "groups_insert" ON friend_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "groups_delete" ON friend_groups FOR DELETE USING (auth.uid() = created_by);

-- group_members
CREATE POLICY "members_select" ON group_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm2
    WHERE gm2.group_id = group_members.group_id
      AND gm2.user_id  = auth.uid()
  )
);
CREATE POLICY "members_insert" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members_delete" ON group_members FOR DELETE USING (auth.uid() = user_id);

-- ── 3. Index ─────────────────────────────────────────────────

CREATE INDEX idx_friend_groups_invite ON friend_groups (invite_code);
CREATE INDEX idx_group_members_group  ON group_members (group_id);
CREATE INDEX idx_group_members_user   ON group_members (user_id);
