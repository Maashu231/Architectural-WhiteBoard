-- ══════════════════════════════════════════════════════
-- Architectural Whiteboard — Database Schema
-- ══════════════════════════════════════════════════════

-- Diagrams table with ownership
CREATE TABLE IF NOT EXISTS diagrams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  nodes      JSONB NOT NULL DEFAULT '[]',
  edges      JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_diagrams_user_id ON diagrams(user_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_updated_at ON diagrams(updated_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS diagrams_updated_at ON diagrams;
CREATE TRIGGER diagrams_updated_at
  BEFORE UPDATE ON diagrams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE diagrams ENABLE ROW LEVEL SECURITY;

-- Policies: owner-only CRUD
DROP POLICY IF EXISTS "Owner select" ON diagrams;
CREATE POLICY "Owner select" ON diagrams
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner insert" ON diagrams;
CREATE POLICY "Owner insert" ON diagrams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner update" ON diagrams;
CREATE POLICY "Owner update" ON diagrams
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner delete" ON diagrams;
CREATE POLICY "Owner delete" ON diagrams
  FOR DELETE USING (auth.uid() = user_id);

-- ── Diagram sharing (future) ──────────────────────────
CREATE TABLE IF NOT EXISTS diagram_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id  UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission  TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (diagram_id, shared_with)
);

CREATE INDEX IF NOT EXISTS idx_diagram_shares_user
  ON diagram_shares(shared_with);
