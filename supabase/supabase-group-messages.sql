-- Migration : table messages de groupe
-- À exécuter dans l'éditeur SQL de Supabase

create table if not exists group_messages (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references friend_groups(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  message      text not null check (char_length(message) between 1 and 120),
  display_name text,
  created_at   timestamptz default now()
);

-- Index pour les requêtes par groupe (ordre chronologique)
create index if not exists idx_group_messages_group_id
  on group_messages (group_id, created_at desc);

-- RLS : activer la sécurité ligne par ligne
alter table group_messages enable row level security;

-- Lecture : uniquement les membres du groupe
create policy "members_can_read_messages"
  on group_messages for select
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = group_messages.group_id
        and group_members.user_id = auth.uid()
    )
  );

-- Écriture : uniquement les membres du groupe
create policy "members_can_insert_messages"
  on group_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from group_members
      where group_members.group_id = group_messages.group_id
        and group_members.user_id = auth.uid()
    )
  );

-- Suppression : uniquement son propre message
create policy "users_can_delete_own_messages"
  on group_messages for delete
  using (auth.uid() = user_id);
