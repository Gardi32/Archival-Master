-- Research Items table
-- Run this in your Supabase SQL Editor after the main schema

CREATE TABLE IF NOT EXISTS research_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Identification
  id_number       INTEGER,
  shot_code       TEXT,
  subject         TEXT NOT NULL DEFAULT '',
  date            DATE,
  ep              TEXT,
  scene           TEXT,

  -- Supplier
  supplier_name   TEXT,
  delivery_timing TEXT,
  location        TEXT,

  -- File / Screener
  file_type       TEXT,                  -- SOURCE ON LINE VIDEO | REQUESTED GRAPHIC | REQUESTED VIDEO
  screener_filename TEXT,
  supplier_clip_id  TEXT,

  -- Content
  description     TEXT,
  log             TEXT,
  link_scr        TEXT,
  tags            TEXT,

  -- Pricing
  usd_cost        NUMERIC,
  special_conditions TEXT,

  -- Rights Management
  send_scr         BOOLEAN DEFAULT FALSE,
  support_supplier TEXT,
  image_voice_rights TEXT,
  rights_supplier  TEXT,
  other_rights     TEXT,
  media            TEXT,
  territory        TEXT,
  duration_rights  TEXT,
  in_context_promo BOOLEAN DEFAULT FALSE,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-updated timestamp
CREATE OR REPLACE TRIGGER research_items_updated_at
  BEFORE UPDATE ON research_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE research_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "research_items_select" ON research_items
  FOR SELECT USING (has_project_access(project_id));

CREATE POLICY "research_items_insert" ON research_items
  FOR INSERT WITH CHECK (has_project_access(project_id));

CREATE POLICY "research_items_update" ON research_items
  FOR UPDATE USING (has_project_role(project_id, ARRAY['admin','editor']));

CREATE POLICY "research_items_delete" ON research_items
  FOR DELETE USING (has_project_role(project_id, ARRAY['admin','editor']));

-- Index
CREATE INDEX IF NOT EXISTS research_items_project_id_idx ON research_items(project_id);
