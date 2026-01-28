-- migrations/019_fix_croutons_uniqueness.sql
-- Fix croutons table uniqueness constraints

-- Drop the problematic slot_latest_revision unique index
-- This was causing all INSERTs to fail with unique violations even for fresh domains
DROP INDEX IF EXISTS idx_croutons_slot_latest_revision;

-- The crouton_id UNIQUE constraint is sufficient since it's derived from fact_id
-- which is already deterministic: sha256(slot_id|object|fragment_hash)

-- Add a regular (non-unique) index on slot_id for query performance
CREATE INDEX IF NOT EXISTS idx_croutons_slot_id_perf ON croutons(slot_id) WHERE slot_id IS NOT NULL;

-- Add composite index for revision queries
CREATE INDEX IF NOT EXISTS idx_croutons_slot_revision ON croutons(slot_id, revision) WHERE slot_id IS NOT NULL;
