-- migrations/002_add_verified_domains.sql
-- Add verified domains table for publisher verification

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS verified_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  verification_token VARCHAR(64) NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if table exists but is missing them
DO $$ 
BEGIN
  -- Add verification_token if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verified_domains' AND column_name = 'verification_token'
  ) THEN
    ALTER TABLE verified_domains ADD COLUMN verification_token VARCHAR(64);
    -- Update existing rows with a placeholder (they'll need to re-verify)
    UPDATE verified_domains SET verification_token = gen_random_uuid()::text WHERE verification_token IS NULL;
    ALTER TABLE verified_domains ALTER COLUMN verification_token SET NOT NULL;
  END IF;

  -- Add verified_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verified_domains' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE verified_domains ADD COLUMN verified_at TIMESTAMPTZ;
  END IF;

  -- Add created_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verified_domains' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE verified_domains ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verified_domains' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE verified_domains ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Index for fast domain lookups
CREATE INDEX IF NOT EXISTS idx_verified_domains_domain ON verified_domains(domain);
CREATE INDEX IF NOT EXISTS idx_verified_domains_verified_at ON verified_domains(verified_at);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_verified_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_verified_domains_updated_at
  BEFORE UPDATE ON verified_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_verified_domains_updated_at();
