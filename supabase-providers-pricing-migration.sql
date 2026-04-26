-- Add pricing fields to providers table
-- Run this in your Supabase SQL Editor

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS rate_value     NUMERIC,
  ADD COLUMN IF NOT EXISTS rate_timing    TEXT,
  ADD COLUMN IF NOT EXISTS rate_variables TEXT;
