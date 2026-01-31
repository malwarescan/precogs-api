# DAY 1 BACKEND DEPLOYMENT STATUS

**Date**: 2026-01-28  
**Time**: ~19:35 UTC  
**Status**: ✅ CODE DEPLOYED | ⏳ TESTING IN PROGRESS

---

## DEPLOYMENTS COMPLETED

### Track 1: Graph Service
- **Commit**: `5cf58b6` - "feat: Add /api/urls endpoint for per-URL verification"
- **Deployed**: ~19:33 UTC
- **Changes**: Added `/api/urls?domain=<domain>` endpoint
- **Location**: Inline in `server.js` (lines ~1078-1112)

### Track 2: Precogs API
- **Commit**: `4d294a2` - "feat: Add per-URL verification support"
- **Deployed**: ~19:35 UTC
- **Changes**: 
  - `facts.js`: Added `source_url` query parameter filter
  - `extract.js`: Added `failed_examples` and `first_failed_fact`

---

## EDGE CASES PATCHED

### Graph Service `/api/urls`
- ✅ `id DESC` tie-breaker for deterministic ordering
- ✅ No `LENGTH(canonical_extracted_text)` (performance)
- ✅ Returns only needed fields

### Precogs `source_url` Filter
- ✅ Trims whitespace from input
- ✅ Strips ALL trailing slashes (`/+$`)
- ✅ Matches both variants (base and base+/)
- ✅ Non-destructive to original URL

### Precogs `failed_examples`
- ✅ Uses nullish coalescing (`??`) for all fields
- ✅ Always returns array (empty `[]` on pass)
- ✅ Safe field mapping (no undefined crashes)
- ✅ Limits to 3 examples

---

## ACCEPTANCE TESTS (Running)

**Scheduled**: 19:38 UTC (3 minutes from deploy)

### Test A: Graph Service URLs
```bash
curl -s "https://graph.croutons.ai/api/urls?domain=nrlc.ai" | jq '.'
```
**Expected**: `ok: true`, `count: 1`, valid data

### Test B: Precogs Facts Filter
```bash
curl -s "https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson?evidence_type=text_extraction&source_url=https%3A%2F%2Fnrlc.ai%2F" | wc -l
```
**Expected**: `19`

### Test C: Extract failed_examples
```bash
curl -s "https://precogs.croutons.ai/v1/extract/nrlc.ai?url=https%3A%2F%2Fnrlc.ai%2F" | jq '.validation.failed_examples'
```
**Expected**: `[]`

### Test A+: Non-Root URL (If Available)
```bash
# Pick URL from Test A, then:
curl -s "https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson?source_url=<URL>" | head -1
```
**Expected**: NDJSON OR empty (NOT 500)

---

## CODE CHANGES SUMMARY

### Graph Service: +36 lines
```javascript
// GET /api/urls - List URLs from html_snapshots
app.get("/api/urls", async (req, res) => {
  const { domain } = req.query;
  if (!domain) return res.status(400).json({ ok: false, error: 'Domain required' });
  
  const query = `
    SELECT DISTINCT ON (source_url)
      source_url, fetched_at, extraction_text_hash, extraction_method
    FROM public.html_snapshots
    WHERE domain = $1
    ORDER BY source_url, fetched_at DESC, id DESC
  `;
  
  const result = await pool.query(query, [domain]);
  res.json({ ok: true, domain, count: result.rows.length, data: result.rows });
});
```

### Precogs Facts: +13 lines
```javascript
const sourceUrlFilter = (req.query.source_url || '').trim();
if (sourceUrlFilter) {
  const base = sourceUrlFilter.replace(/\/+$/, '');
  const urlA = base;
  const urlB = base + '/';
  query += ` AND (source_url = $${params.length + 1} OR source_url = $${params.length + 2})`;
  params.push(urlA, urlB);
}
```

### Precogs Extract: +15 lines
```javascript
const failedResults = validationResults.filter(r => !r.passed);
const firstFailedFact = failedResults[0] || null;
const failureExamples = failedResults.slice(0, 3).map(f => ({
  slot_id: f.slot_id ?? null,
  fact_id: f.fact_id ?? null,
  reason: f.error ?? 'validation_failed',
  char_start: f.char_start ?? null,
  char_end: f.char_end ?? null,
  expected_fragment_hash: f.expected_hash ?? f.fragment_hash ?? null,
  actual_fragment_hash: f.computed_hash ?? null
}));

// In response:
validation: {
  // ... existing fields ...
  first_failed_fact: firstFailedFact,
  failed_examples: failureExamples
}
```

---

## DEPLOYMENT ARCHITECTURE

```
graph-service (Railway)
├── server.js (+36 lines)
└── /api/urls endpoint → queries html_snapshots

precogs-api (Railway)
├── src/routes/facts.js (+13 lines)
│   └── /v1/facts/:domain.ndjson?source_url=...
└── src/routes/extract.js (+15 lines)
    └── /v1/extract/:domain?url=... (now with failed_examples)
```

---

## NEXT: AWAIT TEST RESULTS

**ETA**: 19:38 UTC  
**Status**: Background tests running

Once tests pass:
- ✅ Post results to Slack (formatted)
- ✅ Green light Day 2 frontend work
- ✅ Frontend can implement without waiting

---

**Last Updated**: 2026-01-28 19:35 UTC  
**Test Results**: Pending (~19:38 UTC)
