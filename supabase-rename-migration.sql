-- ArchivalMaster: agrega campo original_filename a materiales
-- Ejecutar en Supabase SQL Editor

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS original_filename TEXT;

COMMENT ON COLUMN materials.original_filename IS
  'Nombre original del archivo tal como llega del proveedor (ej: clip_0023.mp4)';
