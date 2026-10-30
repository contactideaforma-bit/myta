-- MYTA — Notifications admin (nouvel abonné, essai…). Déjà appliqué en prod le 30/10/2026. Idempotent.
CREATE TABLE IF NOT EXISTS admin_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text NOT NULL,
  title      text NOT NULL,
  body       text,
  meta       jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at    timestamptz
);
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;   -- service role uniquement
