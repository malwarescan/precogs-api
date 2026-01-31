# BACKEND EXACT DIFFS - Copy/Paste Ready (FINAL - Edge Cases Patched)

## File 1: `/precogs/precogs-api/src/routes/facts.js`

### Change Location: After line 59

**INSERT THIS CODE** (between line 59 and line 60):

```javascript
    
    // PHASE F: Add source_url filter for per-URL verification
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

**Result**: Lines 59-73 will become:
```javascript
    }
    
    // PHASE F: Add source_url filter for per-URL verification
    const sourceUrlFilter = req.query.source_url;
    if (sourceUrlFilter) {
      // Handle trailing slash variants without destructive mutation
      const urlA = sourceUrlFilter;
      const urlB = sourceUrlFilter.endsWith('/') 
        ? sourceUrlFilter.slice(0, -1) 
        : sourceUrlFilter + '/';
      
      query += ` AND (source_url = $${params.length + 1} OR source_url = $${params.length + 2})`;
      params.push(urlA, urlB);
    }
    
    query += ` ORDER BY created_at DESC LIMIT 1000`;
```

---

## File 2: `/precogs/precogs-api/src/routes/extract.js`

### Change 1: After line 196 (Add failure summary)

**INSERT THIS CODE** (between line 196 and line 197):

```javascript
    
    // Build failure summary for dashboard (schema-stable, always returns array)
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

### Change 2: Update validation object (lines 208-214)

**REPLACE THIS**:
```javascript
      validation: {
        facts_validated: factsValidated,
        facts_passed: factsPassed,
        facts_failed: factsFailed,
        pass_rate: passRate,
        citation_grade: passRate >= 0.95 && factsPassed >= 10
      },
```

**WITH THIS**:
```javascript
      validation: {
        facts_validated: factsValidated,
        facts_passed: factsPassed,
        facts_failed: factsFailed,
        pass_rate: passRate,
        citation_grade: passRate >= 0.95 && factsPassed >= 10,
        first_failed_fact: firstFailedFact,
        failed_examples: failureExamples
      },
```

**Result**: Lines 196-220 will become:
```javascript
      factsPassed++;
    }
    
    // Build failure summary for dashboard
    const failedResults = validationResults.filter(r => !r.passed);
    const firstFailedFact = failedResults.length > 0 ? failedResults[0] : null;
    const failureExamples = failedResults.slice(0, 3).map(f => ({
      slot_id: f.slot_id,
      fact_id: f.fact_id,
      reason: f.error,
      char_start: f.char_start,
      char_end: f.char_end,
      expected_hash: f.expected_hash || f.fragment_hash,
      actual_hash: f.computed_hash || f.actual_hash
    }));
    
    // 5. Build response
    const passRate = factsValidated > 0 ? factsPassed / factsValidated : 0;
    
    res.json({
      domain,
      source_url: canonicalUrl,
      extraction_method: extractionMethod,
      extraction_text_hash: extractionTextHash,
      canonical_text_length: canonicalExtractedText.length,
      fetched_at: snapshot.fetched_at,
      validation: {
        facts_validated: factsValidated,
        facts_passed: factsPassed,
        facts_failed: factsFailed,
        pass_rate: passRate,
        citation_grade: passRate >= 0.95 && factsPassed >= 10,
        first_failed_fact: firstFailedFact,
        failed_examples: failureExamples
      },
      // Only include validation results if there are failures (for debugging)
      validation_results: factsFailed > 0 ? validationResults.filter(r => !r.passed) : undefined,
      // Optional: return excerpt of canonical text (not full text to keep response size manageable)
      canonical_text_excerpt: canonicalExtractedText.substring(0, 500) + (canonicalExtractedText.length > 500 ? '...' : '')
    });
```

---

## Testing Commands (Run After Deploy)

### Test 1: Facts source_url Filter
```bash
# Should return exactly 19 lines (text_extraction facts for nrlc.ai homepage)
curl -s "https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson?evidence_type=text_extraction&source_url=https%3A%2F%2Fnrlc.ai%2F" | wc -l
```

**Expected Output**: `19`

### Test 2: Extract failed_examples Field
```bash
# Should show empty array (nrlc.ai passes 100%)
curl -s "https://precogs.croutons.ai/v1/extract/nrlc.ai?url=https%3A%2F%2Fnrlc.ai%2F" | jq '.validation.failed_examples'
```

**Expected Output**: `[]`

### Test 3: Extract first_failed_fact Field
```bash
# Should show null (nrlc.ai passes)
curl -s "https://precogs.croutons.ai/v1/extract/nrlc.ai?url=https%3A%2F%2Fnrlc.ai%2F" | jq '.validation.first_failed_fact'
```

**Expected Output**: `null`

### Test 4: Trailing Slash Handling
```bash
# Both should return same count (19)
curl -s "https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson?evidence_type=text_extraction&source_url=https%3A%2F%2Fnrlc.ai%2F" | wc -l
curl -s "https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson?evidence_type=text_extraction&source_url=https%3A%2F%2Fnrlc.ai" | wc -l
```

**Expected**: Both return `19`

### Test A+: Non-Root URL Facts (Catches "homepage only" bugs)
```bash
# After Test A, pick a non-root URL from /api/urls response, then:
curl -s "https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson?evidence_type=text_extraction&source_url=<ENCODED_NON_ROOT_URL>" | head -1
```

**Expected**: Either NDJSON row OR empty (not 500)

---

## Commit Message Template

```
feat: Add per-URL verification support for dashboard

Backend changes:
- Add source_url query parameter to /v1/facts endpoint
- Handle trailing slash variants safely (both with/without)
- Add failed_examples and first_failed_fact to /v1/extract
- Limit failure examples to 3 for response size control

Acceptance:
- Facts filter: 19 text_extraction facts for nrlc.ai homepage
- Extract validation: failed_examples [] for passing URL
- Trailing slash: both variants return same results

Part of: Dashboard per-URL verification MVP
```

---

## ETA

**Backend changes**: 15 minutes total
- facts.js: 5 minutes
- extract.js: 10 minutes
- Test: 5 minutes

**Total**: 20 minutes including testing
