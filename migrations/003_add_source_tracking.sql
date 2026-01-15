-- migrations/003_add_source_tracking.sql
-- Add source participation metadata for AI-readable source tracking

CREATE SCHEMA IF NOT EXISTS source_tracking;

-- Table to track source participation and AI readability
CREATE TABLE IF NOT EXISTS source_tracking.source_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crouton_id UUID NOT NULL REFERENCES croutons.croutons(id) ON DELETE CASCADE,
  source_domain TEXT NOT NULL,
  source_url TEXT NOT NULL,
  ai_readable_source BOOLEAN DEFAULT false,
  markdown_discovered BOOLEAN DEFAULT false,
  discovery_method TEXT CHECK (discovery_method IN ('alternate_link', 'direct_md', 'api', 'manual')),
  first_observed TIMESTAMPTZ DEFAULT NOW(),
  last_verified TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS source_participation_crouton_idx ON source_tracking.source_participation(crouton_id);
CREATE INDEX IF NOT EXISTS source_participation_domain_idx ON source_tracking.source_participation(source_domain);
CREATE INDEX IF NOT EXISTS source_participation_ai_readable_idx ON source_tracking.source_participation(ai_readable_source);
CREATE INDEX IF NOT EXISTS source_participation_last_verified_idx ON source_tracking.source_participation(last_verified);

-- Trigger to auto-update last_verified when ai_readable_source changes
CREATE OR REPLACE FUNCTION source_tracking.update_last_verified()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.ai_readable_source IS DISTINCT FROM NEW.ai_readable_source THEN
        NEW.last_verified = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_source_participation_last_verified 
    BEFORE UPDATE ON source_tracking.source_participation 
    FOR EACH ROW 
    EXECUTE FUNCTION source_tracking.update_last_verified();

-- Function to extract domain from URL
CREATE OR REPLACE FUNCTION source_tracking.extract_domain(url TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN regexp_replace(url, '^https?://([^/]+).*$', '\1');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
