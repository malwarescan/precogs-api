-- migrations/016_protocol_v1_1.sql
-- Protocol v1.1: Evidence anchors, fact identity, extraction hashing, discovery proof

-- 1. Update discovered_pages with discovery proof fields
ALTER TABLE discovered_pages 
  ADD COLUMN IF NOT EXISTS discovered_mirror_url TEXT,
  ADD COLUMN IF NOT EXISTS discovery_method VARCHAR(50), -- 'html_link' | 'http_link' | 'both'
  ADD COLUMN IF NOT EXISTS discovery_checked_at TIMESTAMPTZ;

-- 2. Add extraction tracking to html_snapshots
ALTER TABLE html_snapshots
  ADD COLUMN IF NOT EXISTS extraction_method VARCHAR(100) DEFAULT 'croutons-readability-v1',
  ADD COLUMN IF NOT EXISTS canonical_extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS extraction_text_hash VARCHAR(64); -- sha256 hex

CREATE INDEX IF NOT EXISTS idx_html_snapshots_extraction_hash ON html_snapshots(extraction_text_hash);

-- 3. Add evidence anchors and fact identity to croutons table
-- First check if columns exist, then add
DO $$ 
BEGIN
  -- Evidence anchors
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='croutons' AND column_name='supporting_text') THEN
    ALTER TABLE croutons ADD COLUMN supporting_text TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='croutons' AND column_name='evidence_anchor') THEN
    ALTER TABLE croutons ADD COLUMN evidence_anchor JSONB;
  END IF;
  
  -- Fact identity
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='croutons' AND column_name='slot_id') THEN
    ALTER TABLE croutons ADD COLUMN slot_id VARCHAR(64); -- sha256 hex
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='croutons' AND column_name='fact_id') THEN
    ALTER TABLE croutons ADD COLUMN fact_id VARCHAR(64); -- sha256 hex
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='croutons' AND column_name='previous_fact_id') THEN
    ALTER TABLE croutons ADD COLUMN previous_fact_id VARCHAR(64);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='croutons' AND column_name='revision') THEN
    ALTER TABLE croutons ADD COLUMN revision INTEGER DEFAULT 1;
  END IF;
  
  -- Extraction reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='croutons' AND column_name='extraction_text_hash') THEN
    ALTER TABLE croutons ADD COLUMN extraction_text_hash VARCHAR(64);
  END IF;
END $$;

-- Indexes for fact identity
CREATE INDEX IF NOT EXISTS idx_croutons_slot_id ON croutons(slot_id);
CREATE INDEX IF NOT EXISTS idx_croutons_fact_id ON croutons(fact_id);
CREATE INDEX IF NOT EXISTS idx_croutons_previous_fact_id ON croutons(previous_fact_id);
CREATE INDEX IF NOT EXISTS idx_croutons_revision ON croutons(revision);
CREATE INDEX IF NOT EXISTS idx_croutons_extraction_hash ON croutons(extraction_text_hash);

-- Unique constraint: (domain, slot_id, revision) or (domain, slot_id, fact_id)
-- We'll use a partial unique index for the latest revision per slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_croutons_slot_latest_revision 
  ON croutons(source_url, slot_id, revision) 
  WHERE revision IS NOT NULL;

-- 4. Update markdown_versions with protocol version tracking
ALTER TABLE markdown_versions
  ADD COLUMN IF NOT EXISTS protocol_version VARCHAR(10) DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS markdown_version VARCHAR(10) DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS last_regenerated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_markdown_versions_protocol_version ON markdown_versions(protocol_version);
CREATE INDEX IF NOT EXISTS idx_markdown_versions_markdown_version ON markdown_versions(markdown_version);

-- 5. Add protocol version to verified_domains for status endpoint
ALTER TABLE verified_domains
  ADD COLUMN IF NOT EXISTS protocol_version VARCHAR(10) DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS last_ingested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qa_tier VARCHAR(50), -- 'best_effort_ingestion' | 'citation_grade' | 'full_protocol'
  ADD COLUMN IF NOT EXISTS qa_pass BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_verified_domains_protocol_version ON verified_domains(protocol_version);
CREATE INDEX IF NOT EXISTS idx_verified_domains_qa_tier ON verified_domains(qa_tier);

-- 6. Create evidence_anchor JSONB structure documentation
-- evidence_anchor should contain:
-- {
--   "char_start": integer,
--   "char_end": integer,
--   "fragment_hash": "sha256hex",
--   "extraction_text_hash": "sha256hex",
--   "source_selector": "optional CSS/XPath"
-- }

COMMENT ON COLUMN croutons.evidence_anchor IS 'JSONB with char_start, char_end, fragment_hash, extraction_text_hash, optional source_selector';
COMMENT ON COLUMN croutons.slot_id IS 'Stable identity: sha256(entity_id|predicate|source_url|char_start|char_end|extraction_text_hash)';
COMMENT ON COLUMN croutons.fact_id IS 'Versioned identity: sha256(slot_id|object|fragment_hash)';
COMMENT ON COLUMN croutons.revision IS 'Increments when object changes for same slot_id';
