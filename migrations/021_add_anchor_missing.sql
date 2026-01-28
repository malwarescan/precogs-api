-- migrations/021_add_anchor_missing.sql
-- Add anchor_missing column for text extraction fact validation

-- Add anchor_missing flag
ALTER TABLE public.croutons 
  ADD COLUMN IF NOT EXISTS anchor_missing BOOLEAN DEFAULT false;

-- Set anchor_missing=true for facts without evidence_anchor
UPDATE public.croutons
SET anchor_missing = true
WHERE evidence_anchor IS NULL AND evidence_type = 'text_extraction';

-- Comment for documentation
COMMENT ON COLUMN public.croutons.anchor_missing IS 'Flag indicating if evidence anchor is missing or invalid. Only applicable for text_extraction facts.';
