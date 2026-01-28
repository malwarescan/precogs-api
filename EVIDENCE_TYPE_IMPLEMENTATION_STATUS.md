# Evidence Type Implementation Status

## What's Been Done

### ✅ 1. Migration Created
- File: `migrations/020_add_evidence_type.sql`
- Adds: `evidence_type` column (structured_data | text_extraction | unknown)
- Adds: `source_path` column for structured_data facts
- Includes: Index, constraint, backfill logic

### ✅ 2. Extraction Updated (Partial)
- File: `src/routes/ingest.js`
- Modified: `addEvidenceAnchors()` function
- Tags units with `evidence_type`
- Skips anchoring for `structured_data` units
- Sets `anchor_missing=true` for metadata by design

### ✅ 3. Storage Updated
- File: `src/routes/ingest.js`  
- Modified: INSERT query to include `evidence_type` and `source_path`
- Updates: ON CONFLICT clause to preserve these fields

### ✅ 4. Facts Endpoint Updated (Partial)
- File: `src/routes/facts.js`
- Added: `evidence_type` filter support (?evidence_type=text_extraction)
- Modified: Response includes `evidence_type` field
- Conditional: `supporting_text` and `evidence_anchor` based on type

## What's Left To Do

### ⏳ 5. Status Endpoint (CRITICAL)
**File:** `src/routes/status.js`

**Changes needed:**
```javascript
// Add separate counts
counts: {
  facts_total: totalCount,
  facts_text_extraction: textExtractionCount,
  facts_structured_data: structuredDataCount,
  pages: pagesCount,
  entities: entitiesCount
}

// Update QA tier computation
const textFactsQuery = await pool.query(`
  SELECT COUNT(*) as count
  FROM public.croutons
  WHERE domain = $1 AND evidence_type = 'text_extraction' AND anchor_missing = false
`, [domain]);

const textFactsCount = parseInt(textFactsQuery.rows[0].count);
const anchorCoverageText = textFactsCount > 0 ? anchoredTextCount / textFactsCount : 0;

// Tier rules
if (textFactsCount >= 10 && anchorCoverageText >= 0.95) {
  qaTier = 'citation_grade';
}
```

### ⏳ 6. Markdown Mirror (CRITICAL)
**File:** `src/routes/ingest.js` - `generateMarkdown()` function

**Changes needed:**
```javascript
// Query stored units BY TYPE
const textExtractionUnits = await pool.query(`
  SELECT * FROM public.croutons
  WHERE domain = $1 AND source_url = $2 AND evidence_type = 'text_extraction'
  ORDER BY updated_at DESC
`, [domain, sourceUrl]);

const structuredDataUnits = await pool.query(`
  SELECT * FROM public.croutons
  WHERE domain = $1 AND source_url = $2 AND evidence_type = 'structured_data'
  ORDER BY updated_at DESC
`, [domain, sourceUrl]);

// Render Section 1: Facts (Text Extraction)
if (textExtractionUnits.rows.length > 0) {
  markdown += '## Facts (Text Extraction) — Citation-Grade\n\n';
  markdown += '_Quoted from page text with verified anchors._\n\n';
  
  for (const unit of textExtractionUnits.rows) {
    // Render with full v1.1 evidence block
    markdown += `${triple}\n`;
    markdown += `meta | slot_id | ${unit.slot_id}\n`;
    markdown += `meta | fact_id | ${unit.fact_id}\n`;
    markdown += `evidence | anchor | ${JSON.stringify(unit.evidence_anchor)}\n`;
    markdown += `evidence | supporting_text | ${unit.supporting_text}\n\n`;
  }
}

// Render Section 2: Metadata (Structured Data)
if (structuredDataUnits.rows.length > 0) {
  markdown += '## Metadata (Structured Data) — Not Anchorable\n\n';
  markdown += '_Extracted from schema.org markup, not quoted text._\n\n';
  
  for (const unit of structuredDataUnits.rows) {
    markdown += `${triple}\n`;
    markdown += `meta | evidence_type | structured_data\n`;
    markdown += `meta | source_path | ${unit.source_path}\n`;
    markdown += `meta | anchor_missing | true\n\n`;
  }
}
```

### ⏳ 7. /v1/extract Endpoint (VALIDATION)
**File:** NEW - `src/routes/extract.js`

```javascript
export async function getExtract(req, res) {
  const { domain } = req.params;
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'url query parameter required' });
  }
  
  // Check if domain is verified (optional security)
  const verifiedQuery = await pool.query(`
    SELECT verified_at FROM verified_domains WHERE domain = $1
  `, [domain]);
  
  if (verifiedQuery.rows.length === 0) {
    return res.status(403).json({ error: 'Domain not verified' });
  }
  
  // Fetch canonical extraction
  const snapshotQuery = await pool.query(`
    SELECT canonical_extracted_text, extraction_text_hash, extraction_method
    FROM public.html_snapshots
    WHERE domain = $1 AND source_url = $2
  `, [domain, url]);
  
  if (snapshotQuery.rows.length === 0) {
    return res.status(404).json({ error: 'No snapshot found for URL' });
  }
  
  const snapshot = snapshotQuery.rows[0];
  
  // Fetch text_extraction facts for validation
  const factsQuery = await pool.query(`
    SELECT slot_id, fact_id, supporting_text, evidence_anchor
    FROM public.croutons
    WHERE domain = $1 AND source_url = $2 AND evidence_type = 'text_extraction'
  `, [domain, url]);
  
  // Validate each fact
  const validation = [];
  for (const fact of factsQuery.rows) {
    if (!fact.evidence_anchor) {
      validation.push({
        slot_id: fact.slot_id,
        fact_id: fact.fact_id,
        pass: false,
        errors: ['no_anchor']
      });
      continue;
    }
    
    const { char_start, char_end, fragment_hash } = fact.evidence_anchor;
    const slice = snapshot.canonical_extracted_text.substring(char_start, char_end);
    const computedHash = crypto.createHash('sha256').update(slice).digest('hex');
    
    const pass = slice === fact.supporting_text && computedHash === fragment_hash;
    
    validation.push({
      slot_id: fact.slot_id,
      fact_id: fact.fact_id,
      pass,
      errors: !pass ? [
        slice !== fact.supporting_text ? 'slice_mismatch' : null,
        computedHash !== fragment_hash ? 'hash_mismatch' : null
      ].filter(Boolean) : []
    });
  }
  
  res.json({
    domain,
    source_url: url,
    extraction_method: snapshot.extraction_method,
    extraction_text_hash: snapshot.extraction_text_hash,
    canonical_text_length: snapshot.canonical_extracted_text.length,
    facts_validated: factsQuery.rows.length,
    facts_passed: validation.filter(v => v.pass).length,
    validation
  });
}
```

**Register route:**
```javascript
// In server.js
import { getExtract } from './src/routes/extract.js';
app.get('/v1/extract/:domain', getExtract);
```

## Deployment Steps

1. ✅ Commit migration file
2. ✅ Commit ingest.js changes
3. ✅ Commit facts.js changes
4. ⏳ Commit status.js changes
5. ⏳ Commit markdown generation changes
6. ⏳ Create and commit extract.js
7. ⏳ Push to Railway
8. ⏳ Wait for deployment
9. ⏳ Re-ingest nrlc.ai
10. ⏳ Run acceptance tests

## Acceptance Tests

```bash
# 1. Check both evidence types exist
curl "https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson" | \
  jq -r '.evidence_type' | sort | uniq -c

# Expected output:
#   12 structured_data
#   X text_extraction (where X >= 5)

# 2. Verify text_extraction facts have real anchors
curl "https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson?evidence_type=text_extraction" | \
  head -1 | jq '{
    evidence_type,
    has_supporting: (.supporting_text != null),
    supporting_length: (.supporting_text | length),
    char_start: .evidence_anchor.char_start,
    anchor_missing
  }'

# Expected:
# - evidence_type: "text_extraction"
# - has_supporting: true
# - supporting_length: > 50 (not truncated)
# - char_start: not always 0
# - anchor_missing: false

# 3. Validate anchors
curl "https://precogs.croutons.ai/v1/extract/nrlc.ai?url=https%3A%2F%2Fnrlc.ai" | \
  jq '{
    facts_validated,
    facts_passed,
    pass_rate: (.facts_passed / .facts_validated)
  }'

# Expected:
# - pass_rate: 1.0 (100%)

# 4. Check status endpoint
curl "https://precogs.croutons.ai/v1/status/nrlc.ai" | \
  jq '{
    tier: .qa.tier,
    facts_total: .counts.facts_total,
    facts_text: .counts.facts_text_extraction,
    facts_structured: .counts.facts_structured_data,
    anchor_coverage: .qa.anchor_coverage_text
  }'

# Expected:
# - tier: "citation_grade" (if >= 10 text facts with 95%+ anchor coverage)
# - facts_text: >= 5
# - anchor_coverage: >= 0.95

# 5. Check markdown mirror sections
curl "https://md.croutons.ai/nrlc.ai/index.md" | \
  grep -A 2 "## Facts (Text Extraction)\|## Metadata (Structured Data)"

# Expected:
# - Both sections present
# - Text Extraction section has evidence blocks
# - Metadata section labeled as not anchorable
```

## Current Blockers

1. **Migration not applied yet** - Need to push and deploy
2. **Extraction still creates synthetic text** - Units from schema.org still have clean_text
3. **No real body text extraction** - Need to extract sentences from doc_clean_text/sections
4. **Status endpoint not updated** - Still using old counts
5. **Markdown generation not separated** - Still mixing both types

## Next Immediate Actions

1. Finish status.js changes
2. Finish markdown generation changes
3. Create extract.js
4. Commit all changes
5. Deploy
6. Re-ingest to populate evidence_type
7. Run acceptance tests
8. Fix any issues found

## Estimated Time Remaining

- Code changes: 30-45 minutes
- Deployment: 2-3 minutes
- Testing & fixes: 15-30 minutes
- **Total: 45-75 minutes**
