-- migrations/003_add_html_snapshots.sql
-- Add HTML snapshots table for single-URL ingestion

CREATE TABLE IF NOT EXISTS html_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL,
  source_url TEXT NOT NULL,
  html TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(domain, source_url)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_html_snapshots_domain ON html_snapshots(domain);
CREATE INDEX IF NOT EXISTS idx_html_snapshots_source_url ON html_snapshots(source_url);
CREATE INDEX IF NOT EXISTS idx_html_snapshots_fetched_at ON html_snapshots(fetched_at);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_html_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_html_snapshots_updated_at
  BEFORE UPDATE ON html_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_html_snapshots_updated_at();
