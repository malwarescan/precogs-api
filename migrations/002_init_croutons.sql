-- migrations/002_init_croutons.sql
-- Creates croutons schema and tables for AI-first fact layer

CREATE SCHEMA IF NOT EXISTS croutons;

CREATE TABLE IF NOT EXISTS croutons.croutons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim TEXT NOT NULL,
  entities TEXT[] DEFAULT '{}',
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  sources TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS croutons_croutons_created_at_idx ON croutons.croutons(created_at);
CREATE INDEX IF NOT EXISTS croutons_croutons_updated_at_idx ON croutons.croutons(updated_at);
CREATE INDEX IF NOT EXISTS croutons_croutons_confidence_idx ON croutons.croutons(confidence);
CREATE INDEX IF NOT EXISTS croutons_croutons_entities_idx ON croutons.croutons USING GIN(entities);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION croutons.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_croutons_updated_at 
    BEFORE UPDATE ON croutons.croutons 
    FOR EACH ROW 
    EXECUTE FUNCTION croutons.update_updated_at_column();
