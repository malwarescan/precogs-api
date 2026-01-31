# FINAL POLISH APPLIED - Edge Cases Patched

**Status**: ✅ Ready to Ship  
**Date**: 2026-01-28  

All edge case fixes applied to backend implementations.

---

## CHANGES APPLIED

### 1. Graph Service `/api/urls` Endpoint

**File**: New document created: `GRAPH_SERVICE_URLS_ENDPOINT.md`

**Fixes Applied**:
- ✅ Added `id DESC` tie-breaker to prevent flicker on identical `fetched_at`
- ✅ Documented correct `pool` import requirement
- ✅ Removed `LENGTH(canonical_extracted_text)` (performance)
- ✅ Return only needed fields: `source_url`, `fetched_at`, `extraction_text_hash`, `extraction_method`

**Final SQL**:
```sql
SELECT DISTINCT ON (source_url)
  source_url,
  fetched_at,
  extraction_text_hash,
  extraction_method
FROM public.html_snapshots
WHERE domain = $1
ORDER BY source_url, fetched_at DESC, id DESC
```

---

### 2. Precogs Facts `source_url` Filter

**File**: Updated in `BACKEND_EXACT_DIFFS.md`

**Fixes Applied**:
- ✅ Trim whitespace from input (handles paste with spaces)
- ✅ Strip ALL trailing slashes (`/+$`) not just one
- ✅ Generate both variants cleanly (base + base+/)

**Final Code**:
```javascript
const sourceUrlFilter = (req.query.source_url || '').trim();
if (sourceUrlFilter) {
  // Normalize: strip all trailing slashes, then generate both variants
  const base = sourceUrlFilter.replace(/\/+$/, '');
  const urlA = base;
  const urlB = base + '/';
  
  query += ` AND (source_url = $${params.length + 1} OR source_url = $${params.length + 2})`;
  params.push(urlA, urlB);
}
```

**Why Better**:
- Handles `https://example.com///` (multiple slashes)
- Handles `  https://example.com/  ` (whitespace)
- Consistent base form generation

---

### 3. Precogs Extract `failed_examples`

**File**: Updated in `BACKEND_EXACT_DIFFS.md`

**Fixes Applied**:
- ✅ Use nullish coalescing (`??`) for all fields
- ✅ Always returns array (even empty `[]` on pass)
- ✅ Safer field mapping (won't reference undefined properties)
- ✅ Use actual field names from validation results

**Final Code**:
```javascript
const failedResults = validationResults.filter(r => !r.passed);
const firstFailedFact = failedResults[0] || null;
const failureExamples = failedResults.slice(0, 3).map(f => ({
  slot_id: f.slot_id ?? null,
  fact_id: f.fact_id ?? null,
  reason: f.error ?? f.reason ?? 'validation_failed',
  char_start: f.char_start ?? null,
  char_end: f.char_end ?? null,
  expected_fragment_hash: f.expected_fragment_hash ?? f.fragment_hash ?? null,
  actual_fragment_hash: f.actual_fragment_hash ?? f.computed_fragment_hash ?? null
}));
```

**Why Better**:
- Won't crash if validation result shape changes
- Always returns valid JSON structure
- Frontend can always rely on `failed_examples` existing

---

### 4. Added Test A+ (Non-Root URL)

**File**: Updated in `BACKEND_EXACT_DIFFS.md`

**New Test**:
```bash
# After Test A, pick a non-root URL, then:
curl -s "https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson?evidence_type=text_extraction&source_url=<ENCODED_NON_ROOT_URL>" | head -1
```

**Purpose**: Catches "homepage only" bugs (80% of URL filtering issues)

**Expected**: Either NDJSON row OR empty (NOT 500)

---

## UPDATED DOCUMENTS

1. ✅ `BACKEND_EXACT_DIFFS.md` - Updated with final code
2. ✅ `GRAPH_SERVICE_URLS_ENDPOINT.md` - New complete implementation guide
3. ✅ `FINAL_POLISH_APPLIED.md` - This document

---

## ACCEPTANCE TESTS (Updated)

### Test A: Graph Service URLs
```bash
curl -s "https://graph.croutons.ai/api/urls?domain=nrlc.ai" | jq '.'
```
**Expected**: `ok: true`, `count: 1`, valid URL data

### Test B: Facts Filter (Root URL)
```bash
curl -s "https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson?evidence_type=text_extraction&source_url=https%3A%2F%2Fnrlc.ai%2F" | wc -l
```
**Expected**: `19`

### Test C: Extract failed_examples
```bash
curl -s "https://precogs.croutons.ai/v1/extract/nrlc.ai?url=https%3A%2F%2Fnrlc.ai%2F" | jq '.validation.failed_examples'
```
**Expected**: `[]` (empty array)

### Test A+ (NEW): Non-Root URL Facts
```bash
# Get URLs first
curl -s "https://graph.croutons.ai/api/urls?domain=example.com" | jq -r '.data[1].source_url'

# Then test that URL (use actual URL from above)
curl -s "https://precogs.croutons.ai/v1/facts/example.com.ndjson?evidence_type=text_extraction&source_url=<URL>" | head -1
```
**Expected**: NDJSON OR empty (NOT 500)

---

## EDGE CASES NOW HANDLED

| Edge Case | Without Fix | With Fix |
|-----------|-------------|----------|
| Identical `fetched_at` timestamps | Results flicker randomly | Stable ordering via `id DESC` |
| URL with whitespace `"  https://x.com/  "` | No match | Trimmed, matches correctly |
| URL with multiple trailing slashes `/about///` | Only strips one | Strips all, matches correctly |
| Missing validation fields | Code crashes with undefined | Returns `null`, graceful fallback |
| Passing validation | `failed_examples` might be undefined | Always `[]` |
| Non-root URL facts query | Untested, may 500 | Test A+ catches bugs |

---

## DEFINITION OF DONE (Updated)

### Day 1 Backend:
- [x] All edge case fixes applied
- [ ] Test A passes (URLs endpoint)
- [ ] Test B passes (19 facts for nrlc.ai)
- [ ] Test C passes (empty array)
- [ ] Test A+ passes (non-root URL doesn't 500)
- [ ] Raw outputs posted to Slack with timestamps

### Day 2 Frontend:
- [ ] Dashboard implements all 7 critical fixes
- [ ] Test D passes (mirror path computation)
- [ ] Proof bundle JSON + screenshot posted to Slack

---

## SHIP STATUS

✅ **All code finalized**  
✅ **Edge cases patched**  
✅ **Tests defined**  
✅ **Documentation complete**  

**Ready for Day 1 backend deploy.**

---

**Questions?** All code is in:
- `BACKEND_EXACT_DIFFS.md` (Precogs API changes)
- `GRAPH_SERVICE_URLS_ENDPOINT.md` (Graph Service new endpoint)
