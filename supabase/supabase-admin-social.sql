-- MYTA — Générateur de descriptions vidéo (espace admin). Historique, service role uniquement.
-- Déjà appliqué en prod le 28/10/2026. Idempotent.
CREATE TABLE IF NOT EXISTS social_captions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video      text NOT NULL,
  platform   text NOT NULL,
  goal       text,
  result     jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE social_captions ENABLE ROW LEVEL SECURITY;
