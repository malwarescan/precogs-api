# IMPLEMENTATION REVIEW + REQUIRED FIXES
## Per-URL Verification Dashboard MVP

**From**: Project Supervisor  
**To**: Dev Team  
**Status**: Plan is 95% correct — patch these 14 items before merge to ship cleanly

---

## CRITICAL FIXES (Must-Do Before Merge)

### Frontend Fixes (Items 1-8)

#### 1. ✗ BUG: `selectedDomain` Never Set (Will Run with Null)

**Problem**: 
```javascript
<select @change="loadUrlsForDomain($event.target.value)">
// But loadUrlsForDomain() never sets this.urlVerification.selectedDomain
```

**Result**: Verify button calls `runProofBundle(null, url)` → hits `/v1/status/null`

**Fix** (add to `loadUrlsForDomain` method):
```javascript
async loadUrlsForDomain(domain) {
  this.urlVerification.selectedDomain = domain; // ADD THIS LINE
  this.urlVerification.urls.loading = true;
  // ... rest of method
}
```

---

#### 2. ✓ Verify Button Domain Param (Fixed by #1)

**Status**: Will work once #1 is fixed.

---

#### 3. ✗ BUG: Mirror Path Hardcoded to `index.md`

**Problem**:
```javascript
fetch(`https://md.croutons.ai/${domain}/index.md`)
// Always fetches index.md, even for /about/, /en-us/services/, etc.
```

**Fix** (add helper function):
```javascript
// Add to methods:
mirrorPathFrom(url) {
  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname;
    
    // Root path -> index.md
    if (path === '/' || path === '') return 'index.md';
    
    // Remove leading slash
    path = path.replace(/^\//, '');
    
    // Remove trailing slash
    path = path.replace(/\/$/, '');
    
    // Add .md extension
    return path + '.md';
  } catch {
    return 'index.md';
  }
}
```

**Then update mirror fetch**:
```javascript
// OLD:
fetch(`https://md.croutons.ai/${domain}/index.md`)

// NEW:
fetch(`https://md.croutons.ai/${domain}/${this.mirrorPathFrom(url)}`)
```

**Examples**:
- `https://nrlc.ai/` → `index.md` ✓
- `https://nrlc.ai/about/` → `about.md` ✓
- `https://nrlc.ai/en-us/services/` → `en-us/services.md` ✓

---

#### 4. ✗ BUG: NDJSON Parsing Will Throw on Empty/Error Responses

**Problem**:
```javascript
const textFacts = factsText.trim().split('\n').filter(l => l).map(l => JSON.parse(l));
// If endpoint returns HTML error page, JSON.parse() throws → entire modal crashes
```

**Fix** (wrap in try-catch):
```javascript
// Parse NDJSON safely
let textFacts = [];
let structuredFacts = [];

try {
  textFacts = factsText.trim().split('\n').filter(l => l).map(l => JSON.parse(l));
} catch (e) {
  console.error('[proof-bundle] Failed to parse text facts:', e);
  textFacts = []; // Graceful fallback
}

try {
  structuredFacts = factsStructured.trim().split('\n').filter(l => l).map(l => JSON.parse(l));
} catch (e) {
  console.error('[proof-bundle] Failed to parse structured facts:', e);
  structuredFacts = [];
}
```

---

#### 5. ✓ Extract Response Shape (Already Correct)

**Status**: Code already uses `extract.validation?.citation_grade` and `extract.validation?.failed_examples` correctly.

**Verification**: Ensure backend puts `failed_examples` under `validation` object (see backend fix #12).

---

#### 6. ✗ BUG: No `response.ok` Check for Cross-Origin Fetches

**Problem**:
```javascript
fetch(url).then(r => r.json())
// If Railway returns 502/504 HTML, r.json() throws
```

**Fix** (add helper function):
```javascript
// Add to methods:
async fetchSafely(url, parseAs = 'json') {
  const response = await fetch(url);
  
  if (!response.ok) {
    const text = await response.text();
    const snippet = text.substring(0, 300);
    throw new Error(`HTTP ${response.status}: ${snippet}`);
  }
  
  if (parseAs === 'json') return response.json();
  if (parseAs === 'text') return response.text();
  return response;
}
```

**Then update all fetches in `runProofBundle`**:
```javascript
// OLD:
fetch(url).then(r => r.json())

// NEW:
this.fetchSafely(url, 'json')
this.fetchSafely(url, 'text')
```

---

#### 7. ✗ BUG: Missing `formatDate()` Function

**Problem**: Template uses `formatDate()` but it's not defined.

**Fix** (add to methods):
```javascript
formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toISOString().replace('T', ' ').slice(0, 19) + 'Z';
  } catch {
    return iso;
  }
}
```

---

#### 8. ✗ UX: Don't Use `alert()` (Breaks Flow)

**Problem**:
```javascript
alert('Proof bundle copied to clipboard!');
// Annoying, blocks UI
```

**Fix** (add toast state):
```javascript
// Add to data():
urlVerification: {
  // ... existing fields ...
  proofBundle: { 
    show: false, 
    loading: false, 
    data: null, 
    error: null,
    copied: false  // ADD THIS
  }
}

// Update copyProofBundle:
copyProofBundle() {
  const json = JSON.stringify(this.urlVerification.proofBundle.data, null, 2);
  navigator.clipboard.writeText(json);
  this.urlVerification.proofBundle.copied = true;
  setTimeout(() => {
    this.urlVerification.proofBundle.copied = false;
  }, 1500);
}
```

**Update template**:
```html
<button @click="copyProofBundle" class="...">
  {{ urlVerification.proofBundle.copied ? '✓ Copied!' : 'Copy JSON' }}
</button>
```

---

### Backend Fixes (Items 9-12)

#### 9. ⚠️ Performance: `/api/urls` Should Not Compute `LENGTH()` on Large Text

**Problem**:
```sql
LENGTH(canonical_extracted_text) as canonical_text_length
-- If canonical_text is 500KB, DB computes LENGTH on every row
```

**Fix** (only if canonical_text_length column exists):
```sql
SELECT DISTINCT ON (source_url)
  source_url,
  fetched_at,
  extraction_text_hash,
  extraction_method
  -- REMOVED: LENGTH(canonical_extracted_text) as canonical_text_length
FROM public.html_snapshots
WHERE domain = $1
ORDER BY source_url, fetched_at DESC
```

**Note**: If you have a stored `canonical_text_length` column, use that instead.

---

#### 10. ✗ BUG: `source_url` Filter Not Trailing-Slash Tolerant

**Current Code** (in facts.js ~line 59):
```javascript
const sourceUrlFilter = req.query.source_url;
if (sourceUrlFilter) {
  const normalizedUrl = sourceUrlFilter.replace(/\/$/, '');
  query += ` AND (source_url = $${params.length + 1} OR source_url = $${params.length + 2})`;
  params.push(normalizedUrl, normalizedUrl + '/');
}
```

**Problem**: Mutates original URL; fails for edge cases.

**Better Fix**:
```javascript
const sourceUrlFilter = req.query.source_url;
if (sourceUrlFilter) {
  // Compute both variants without mutating
  const urlA = sourceUrlFilter;
  const urlB = sourceUrlFilter.endsWith('/') 
    ? sourceUrlFilter.slice(0, -1) 
    : sourceUrlFilter + '/';
  
  query += ` AND (source_url = $${params.length + 1} OR source_url = $${params.length + 2})`;
  params.push(urlA, urlB);
}
```

**Why Better**: Handles root `/` and non-root `/about/` consistently without destructive replace.

---

#### 11. ✓ Citation-Grade Logic (Already Correct)

**Status**: Code already checks `extract.validation.citation_grade` from backend.

**Keep**:
```javascript
const citationGrade = extract.validation?.citation_grade || false;
```

**Optional Enhancement**: Show "insufficient facts" warning separately if fact count < 5.

---

#### 12. ✗ REQUIRED: Add `failed_examples` to Extract Response

**File**: `/precogs/precogs-api/src/routes/extract.js`

**Current Response** (~line 201):
```javascript
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
    citation_grade: passRate >= 0.95 && factsPassed >= 10
  },
  validation_results: factsFailed > 0 ? validationResults.filter(r => !r.passed) : undefined,
  canonical_text_excerpt: canonicalExtractedText.substring(0, 500) + (canonicalExtractedText.length > 500 ? '...' : '')
});
```

**Add BEFORE Building Response** (~line 196):
```javascript
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
```

**Update Response**:
```javascript
validation: {
  facts_validated: factsValidated,
  facts_passed: factsPassed,
  facts_failed: factsFailed,
  pass_rate: passRate,
  citation_grade: passRate >= 0.95 && factsPassed >= 10,
  first_failed_fact: firstFailedFact,        // ADD THIS
  failed_examples: failureExamples           // ADD THIS
}
```

---

### UX Improvements (Items 13-14) - Still Within "1 Day"

#### 13. ✓ Recommended: Add "Open Endpoints" Links

**Add to Modal** (below proof bundle JSON):
```html
<div class="flex gap-4 mt-4 text-sm">
  <span class="text-[#6B6B6B] font-mono">Quick links:</span>
  <a :href="`https://precogs.croutons.ai/v1/status/${urlVerification.proofBundle.data.domain}`" 
     target="_blank" class="text-[#00C2FF] hover:underline">Status</a>
  <a :href="`https://precogs.croutons.ai/v1/extract/${urlVerification.proofBundle.data.domain}?url=${encodeURIComponent(urlVerification.proofBundle.data.source_url)}`" 
     target="_blank" class="text-[#00C2FF] hover:underline">Extract</a>
  <a :href="urlVerification.proofBundle.data.mirror_url" 
     target="_blank" class="text-[#00C2FF] hover:underline">Mirror</a>
  <a :href="`https://precogs.croutons.ai/v1/graph/${urlVerification.proofBundle.data.domain}.jsonld`" 
     target="_blank" class="text-[#00C2FF] hover:underline">Graph</a>
</div>
```

**Benefit**: Instant debugging without terminal.

---

#### 14. ✓ Recommended: Add AbortController for Cancellation

**Add to Data**:
```javascript
urlVerification: {
  // ... existing fields ...
  proofBundle: { 
    // ... existing fields ...
    abortController: null  // ADD THIS
  }
}
```

**Update `runProofBundle`**:
```javascript
async runProofBundle(domain, url) {
  // Cancel previous request if still running
  if (this.urlVerification.proofBundle.abortController) {
    this.urlVerification.proofBundle.abortController.abort();
  }
  
  const controller = new AbortController();
  this.urlVerification.proofBundle.abortController = controller;
  
  try {
    const [status, extract, ...rest] = await Promise.all([
      fetch(url, { signal: controller.signal }).then(r => r.json()),
      // ... other fetches with { signal: controller.signal }
    ]);
    // ... rest of logic
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Proof bundle request cancelled');
      return;
    }
    throw error;
  } finally {
    this.urlVerification.proofBundle.abortController = null;
  }
}
```

**Benefit**: Prevents stuck modal when endpoint hangs.

---

## EXACT CODE DIFFS FOR BACKEND

### File: `/precogs/precogs-api/src/routes/facts.js`

**Location**: After line 59 (after `evidence_type` filter)

**REPLACE**:
```javascript
// (Nothing here currently)
```

**WITH**:
```javascript
// Add source_url filter (Per-URL verification)
const sourceUrlFilter = req.query.source_url;
if (sourceUrlFilter) {
  // Compute both variants (with and without trailing slash)
  const urlA = sourceUrlFilter;
  const urlB = sourceUrlFilter.endsWith('/') 
    ? sourceUrlFilter.slice(0, -1) 
    : sourceUrlFilter + '/';
  
  query += ` AND (source_url = $${params.length + 1} OR source_url = $${params.length + 2})`;
  params.push(urlA, urlB);
}
```

---

### File: `/precogs/precogs-api/src/routes/extract.js`

**Location**: After line 196 (after validation loop), BEFORE `res.json({...})`

**INSERT**:
```javascript
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
```

**THEN UPDATE** (line ~201, inside `validation:` object):
```javascript
validation: {
  facts_validated: factsValidated,
  facts_passed: factsPassed,
  facts_failed: factsFailed,
  pass_rate: passRate,
  citation_grade: passRate >= 0.95 && factsPassed >= 10,
  first_failed_fact: firstFailedFact,        // ADD THIS LINE
  failed_examples: failureExamples           // ADD THIS LINE
}
```

---

## ACCEPTANCE TESTS (Copy/Paste After Deploy)

### A) Graph Service URLs Endpoint
```bash
curl -s "https://graph.croutons.ai/api/urls?domain=nrlc.ai" | jq '.ok,.count,.data[0].source_url'
# Expected: true, 1, "https://nrlc.ai/"
```

### B) Facts Filter (source_url)
```bash
curl -s "https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson?evidence_type=text_extraction&source_url=https%3A%2F%2Fnrlc.ai%2F" | wc -l
# Expected: 19 (for nrlc.ai homepage)
```

### C) Extract failed_examples Field Exists
```bash
curl -s "https://precogs.croutons.ai/v1/extract/nrlc.ai?url=https%3A%2F%2Fnrlc.ai%2F" | jq '.validation.failed_examples'
# Expected: [] (empty array for passing URL)
```

### D) Mirror Path Computation
**Manual Test**: 
1. Pick a non-root URL from `/api/urls?domain=...`
2. Run Verify in dashboard
3. Confirm modal fetches correct mirror path (not always index.md)
4. Check mirror response has `markdown_version: "1.1"`

---

## SUMMARY FOR DEV TEAM

**Your plan is 95% correct.** Proceed exactly as written, but:

### Must-Fix Before Merge:
1. ✅ Set `selectedDomain` in `loadUrlsForDomain` (item #1)
2. ✅ Add `mirrorPathFrom()` helper for correct mirror URLs (item #3)
3. ✅ Wrap NDJSON parsing in try-catch (item #4)
4. ✅ Add `fetchSafely()` helper with response.ok checks (item #6)
5. ✅ Add `formatDate()` helper (item #7)
6. ✅ Replace `alert()` with toast state (item #8)
7. ✅ Remove `LENGTH(canonical_extracted_text)` from SQL (item #9)
8. ✅ Update `source_url` filter logic (item #10)
9. ✅ Add `failed_examples` to extract response (item #12)

### Recommended (Still in 1-day scope):
10. ✅ Add "Open endpoints" links (item #13)
11. ✅ Add AbortController for cancellation (item #14)

### Already Correct:
- Verify button domain param (fixed by #1)
- Extract response shape (already uses `validation.`)
- Citation-grade logic (already correct)

**Ship cleanly in 2 days with these patches applied.**

---

**Questions?** Reply with specific line numbers from facts.js/extract.js if you need clarification on exact placement.
