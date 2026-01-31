# DASHBOARD ARCHITECTURE ANALYSIS — ZERO-AMBIGUITY BREAKDOWN

**Generated**: 2026-01-28  
**Purpose**: Answer all 26 questions about dashboard setup, data sources, capabilities, and implementation requirements.

---

## A) DASHBOARD ARCHITECTURE (WHAT IS IT)

### 1. What codebase owns the dashboard UI?

**Current State**: TWO separate dashboards exist.

**Dashboard 1 (Main PHP Site)**:
- **Repo**: Same monorepo (`/Users/malware/Desktop/projects/croutons.ai`)
- **Path**: `/dashboard.php`
- **Framework**: PHP (Tailwind CSS)
- **Auth**: PHP sessions via `src/lib/auth.php` (requires `requireAuth()`)
- **Status**: STATIC PLACEHOLDER - Shows hardcoded numbers (12,453 facts, etc.)
- **Purpose**: Main website dashboard, NOT connected to live data

**Dashboard 2 (Graph Service)**:
- **Repo**: Same monorepo
- **Path**: `/graph-service/public/dashboard.html`
- **Framework**: Vanilla JavaScript + Vue 3 (CDN)
- **Auth**: NONE (public read-only)
- **Status**: LIVE - Connected to real API endpoints
- **URL**: https://graph.croutons.ai/dashboard.html
- **Purpose**: Operational monitoring dashboard

---

### 2. What service owns the dashboard API (if separate)?

**Current State**: TWO separate API services serve dashboard data.

**Service 1 (Graph Service)**: 
- **Repo**: `/graph-service`
- **Base URL**: https://graph.croutons.ai
- **Routes**:
  - `GET /api/verified-domains` - Returns all verified domains with health metrics
  - `GET /api/source-stats` - Returns AI-readable sources statistics
  - `GET /diag/stats` - Returns live croutons/triples counts
- **DB**: Uses its own PostgreSQL connection (separate from precogs-api)
- **Code**: `/graph-service/src/routes/*.js`

**Service 2 (Precogs API)**:
- **Repo**: `/precogs/precogs-api`
- **Base URL**: https://precogs.croutons.ai
- **Routes**:
  - `GET /v1/status/:domain` - Returns protocol v1.1 status
  - `GET /v1/facts/:domain.ndjson` - Returns facts stream
  - `GET /v1/extract/:domain?url=...` - Returns extraction validation
  - `GET /v1/graph/:domain.jsonld` - Returns entity graph
- **DB**: PostgreSQL (Railway-hosted)
- **Code**: `/precogs/precogs-api/src/routes/*.js`

---

### 3. How does the dashboard authenticate?

**Current State**: 

**Dashboard 1 (PHP)**:
- **Auth**: Session-based (PHP `$_SESSION`)
- **Method**: `requireAuth()` in `/src/lib/auth.php`
- **Endpoints**: All PHP pages require login
- **Roles**: "client" or "admin" can access

**Dashboard 2 (Graph Service HTML)**:
- **Auth**: NONE
- **Method**: Public read-only
- **Endpoints**: All API endpoints are public (no auth required)
- **CORS**: Wide open (`Access-Control-Allow-Origin: *`)

**Precogs API**:
- **Auth**: NONE currently
- **Method**: Public API (but domain verification required for some endpoints)
- **CORS**: Configured in server.js (production: specific origins, dev: wide open)

---

### 4. What environments exist?

**Current State**:

**Production Only** (no staging/dev environments):
- **Main Site**: https://croutons.ai
- **Dashboard 1 (PHP)**: https://croutons.ai/dashboard.php
- **Dashboard 2 (Graph Service)**: https://graph.croutons.ai/dashboard.html
- **Precogs API**: https://precogs.croutons.ai
- **Markdown Mirror**: https://md.croutons.ai

**Local Dev**:
- Run locally with `npm start` or `php -S localhost:8000`
- Requires local PostgreSQL setup OR use `DATABASE_URL` pointing to Railway
- No explicit dev/staging URLs

---

## B) DATA SOURCES (WHAT THE DASHBOARD READS)

### 5. Which DB does the dashboard read from?

**Current State**: MIXED - Two different database connections.

**Dashboard 1 (PHP)**:
- **DB**: NOT CONNECTED - shows hardcoded data
- **Connection**: Would use `/src/db.php` if implemented
- **Schema**: N/A (not reading live data)

**Dashboard 2 (Graph Service)**:
- **DB**: PostgreSQL (Graph Service DB)
- **Connection Name**: Configured in graph-service environment
- **Schema**: `public` schema with tables:
  - `verified_domains`
  - `markdown_versions`
  - `discovered_pages`
  - `croutons` (shared with precogs-api)

**Precogs API**:
- **DB**: PostgreSQL (Railway-hosted)
- **Connection**: `/precogs/precogs-api/src/db.js`
- **Schema**: `public` schema with tables:
  - `croutons` (main facts table)
  - `html_snapshots` (raw HTML + extracted text)
  - `verified_domains`
  - `markdown_versions`
  - `discovered_pages`

---

### 6. Which tables does the dashboard currently use?

**Current State**: Dashboard 2 (Graph Service) queries these tables.

| Table | Purpose | Columns Used | UI Component |
|-------|---------|--------------|--------------|
| `verified_domains` | DNS verification | `domain`, `verified_at`, `protocol_version` | Verified Domains tab |
| `markdown_versions` | Markdown mirrors | `domain`, `path`, `is_active`, `generated_at`, `protocol_version`, `markdown_version`, `content` | Health status, counts |
| `discovered_pages` | Auto-discovery | `domain`, `page_url`, `alternate_href`, `discovered_at`, `is_active` | Active pages count |
| `croutons` | Facts/triples | `domain`, `source_url`, `text`, `triple`, `created_at`, `evidence_type`, `evidence_anchor` | Crouton counts |
| `html_snapshots` | Page snapshots | `domain`, `source_url`, `html`, `canonical_extracted_text`, `extraction_text_hash`, `extraction_method` | Last seen timestamps |

---

### 7. Is there a dedicated "dashboard read model"?

**Current State**: NO - Direct queries against production tables.

**What Exists**:
- Dashboard queries production tables directly
- NO materialized views
- NO denormalized read models
- NO caching layer (except HTTP cache headers)

**Implications**:
- Every dashboard refresh hits production DB
- No optimized aggregation tables
- Counts recomputed on every request

---

## C) CURRENT DASHBOARD FEATURES (WHAT EXISTS TODAY)

### 8. What pages/routes exist in the dashboard?

**Dashboard 1 (PHP) - Static**:
- `/dashboard.php` - Main dashboard (hardcoded stats, not live)

**Dashboard 2 (Graph Service) - Live**:
- `/dashboard.html` - Main entry point
- **Tabs**:
  - **Verified Domains**: Shows DNS-verified domains with health metrics
  - **AI-Readable Sources**: Shows all domains with markdown exposure

---

### 9. What "domain-level" metrics are shown today?

**Current State**: Dashboard 2 shows per-domain:

| Metric | Source | Description |
|--------|--------|-------------|
| **Verification Status** | `verified_domains.verified_at` | When domain was DNS-verified |
| **Health Status** | Computed | `healthy`, `degraded`, or `inactive` based on markdown |
| **Markdown Versions** | `markdown_versions` | Active count / Total versions |
| **Active Pages** | `discovered_pages` | Pages with `<link rel="alternate">` |
| **Crouton Count** | `croutons` | Total facts for domain |
| **Last Activity** | Max of `created_at`, `generated_at` | Days since last update |
| **Discovery Methods** | `source_tracking` | How markdown was discovered |

**NOT SHOWN** (but available in /v1/status):
- Protocol versions (markdown v1.1, facts v1.1)
- Evidence type breakdown (text_extraction vs structured_data)
- Anchor coverage percentage
- QA tier (citation_grade, full_protocol)
- Extract validation results

---

### 10. Can the dashboard display per-domain facts stream, mirror preview, and graph preview?

**Current State**: PARTIALLY - Links but no inline preview.

**What Works**:
- ✅ **Domain link**: Click domain → Opens `https://md.croutons.ai/{domain}/index.md` in new tab
- ❌ **Facts stream**: No preview, must manually curl `/v1/facts/{domain}.ndjson`
- ❌ **Mirror preview**: No inline viewer, opens raw markdown
- ❌ **Graph preview**: No link or preview for `/v1/graph/{domain}.jsonld`

**What's Missing**:
- Inline facts viewer
- Markdown renderer
- Graph visualizer
- Per-URL drill-down

---

### 11. Is there currently any per-URL verification UI?

**Current State**: NO - Only domain-level metrics exist.

**What Exists**:
- Domain-level health status only
- No per-URL breakdowns
- No URL list view
- No per-URL validation results
- No "Verify URL" button

**What's Missing**:
- List of URLs per domain
- Per-URL fact counts
- Per-URL anchor validation
- Per-URL proof bundle

---

## D) PROTOCOL v1.1 SIGNALS (WHAT WE STORE AND CAN SHOW INSTANTLY)

### 12. For a given domain, where do we store protocol v1.1 data?

**Current State**: All data is stored and queryable.

| Data | Table | Column | Type |
|------|-------|--------|------|
| **Facts (all types)** | `croutons` | (all rows) | Mixed |
| **Text extraction facts** | `croutons` | `evidence_type='text_extraction'` | Filtered |
| **Structured data facts** | `croutons` | `evidence_type='structured_data'` | Filtered |
| **Evidence anchor** | `croutons` | `evidence_anchor` | JSONB `{char_start, char_end, fragment_hash, extraction_text_hash}` |
| **Anchor missing flag** | `croutons` | `anchor_missing` | BOOLEAN |
| **Extraction method** | `html_snapshots` | `extraction_method` | VARCHAR |
| **Canonical text** | `html_snapshots` | `canonical_extracted_text` | TEXT |
| **Extraction hash** | `html_snapshots` | `extraction_text_hash` | VARCHAR(64) |
| **Markdown version** | `markdown_versions` | `markdown_version` OR detected from `content` frontmatter | VARCHAR |
| **Protocol version** | `verified_domains`, `markdown_versions` | `protocol_version` | VARCHAR |

**Schema Details**:

```sql
-- Full croutons table schema
CREATE TABLE croutons (
  id UUID PRIMARY KEY,
  crouton_id VARCHAR(64) UNIQUE,
  domain VARCHAR(255) NOT NULL,
  source_url TEXT NOT NULL,
  text TEXT NOT NULL,
  triple JSONB,
  confidence REAL DEFAULT 0.5,
  slot_id VARCHAR(64),
  fact_id VARCHAR(64),
  previous_fact_id VARCHAR(64),
  revision INTEGER DEFAULT 1,
  supporting_text TEXT,
  evidence_anchor JSONB,
  extraction_text_hash VARCHAR(64),
  evidence_type VARCHAR(50) DEFAULT 'unknown',
  source_path TEXT,
  anchor_missing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_croutons_domain ON croutons(domain);
CREATE INDEX idx_croutons_source_url ON croutons(source_url);
CREATE INDEX idx_croutons_evidence_type ON croutons(evidence_type);
```

---

### 13. Do we store last_ingested_at per domain and per URL?

**Current State**: MIXED - Not consistently stored.

**Domain-level**:
- **Table**: `verified_domains`
- **Column**: `last_ingested_at`
- **Status**: NULL for nrlc.ai (not being updated during ingest)
- **Location in code**: Not set in `/src/routes/ingest.js`

**Per-URL level**:
- **Table**: `html_snapshots`
- **Column**: `fetched_at`
- **Status**: ✅ WORKS - Updated on every ingest
- **Per-URL tracking**: YES - Each URL has its own `fetched_at` timestamp

**Why status returns null**:
- `verified_domains.last_ingested_at` is NOT being updated by ingest endpoint
- Dashboard would show "never" or null for last ingest time
- Fix: Update `verified_domains.last_ingested_at` in `POST /v1/ingest` handler

---

### 14. Do we store discovery proof per domain/page?

**Current State**: YES but INCOMPLETE for nrlc.ai.

**Table**: `discovered_pages`

**Columns**:
- `domain`
- `page_url`
- `alternate_href` (the markdown URL discovered via `<link rel="alternate">`)
- `discovered_at`
- `last_scanned_at`
- `discovery_method` (e.g., "alternate_link", "manual")
- `is_active`

**Status for nrlc.ai**:
- `discovery.discovered_mirror_url`: null
- `discovery.discovery_method`: null
- `discovery.discovery_checked_at`: null

**Why null**: 
- nrlc.ai was manually ingested, NOT discovered via auto-discovery
- No entry in `discovered_pages` table for nrlc.ai
- To populate: Run `POST /v1/discover` with nrlc.ai domain

---

## E) ENDPOINT AVAILABILITY (CAN DASHBOARD CALL THESE)

### 15. Confirm endpoints are accessible from dashboard

**Current State**: ALL endpoints accessible with CORS.

| Endpoint | URL | CORS | Auth | Status |
|----------|-----|------|------|--------|
| `/v1/status/:domain` | https://precogs.croutons.ai/v1/status/nrlc.ai | ✅ Yes | ❌ None | ✅ LIVE |
| `/v1/extract/:domain` | https://precogs.croutons.ai/v1/extract/nrlc.ai?url=... | ✅ Yes | ✅ Domain verified | ✅ LIVE |
| `/v1/facts/:domain.ndjson` | https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson | ✅ Yes | ❌ None | ✅ LIVE |
| `/v1/facts/:domain.ndjson?evidence_type=text_extraction` | (with query param) | ✅ Yes | ❌ None | ✅ LIVE |
| `/v1/graph/:domain.jsonld` | https://precogs.croutons.ai/v1/graph/nrlc.ai.jsonld | ✅ Yes | ❌ None | ✅ LIVE |
| `https://md.croutons.ai/:domain/index.md` | https://md.croutons.ai/nrlc.ai/index.md | ✅ Yes | ❌ None | ✅ LIVE |

**CORS Headers**:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

### 16. Are there rate limits or timeouts on /v1/extract?

**Current State**: RATE LIMITS exist, no explicit timeout.

**Rate Limit**:
- **Implementation**: In-memory per-IP limiter in `server.js`
- **Window**: 60 seconds
- **Max requests**: 60 requests per minute per IP
- **Response when exceeded**: HTTP 429 with `retryAfter` in seconds

**Timeout**:
- **Server-side**: None explicitly set (uses Node.js defaults)
- **Client-side**: Browser default (~2 minutes for most browsers)

**Typical Response Time**:
- **For nrlc.ai**: < 1 second (19 facts validated)
- **Scales with**: Number of text_extraction facts to validate
- **Worst case**: ~100ms per fact (for 100 facts = 10 seconds)

**For Dashboard**:
- ✅ Safe to call directly from browser
- ⚠️ May timeout for domains with >1000 text facts
- ✅ Rate limit (60 req/min) is sufficient for dashboard usage

---

### 17. Can dashboard call NDJSON endpoints directly?

**Current State**: YES but with caveats.

**Browser Support**:
- ✅ Can fetch NDJSON streams directly
- ✅ CORS allows cross-origin requests
- ⚠️ Must parse NDJSON manually (not native JSON)

**Parsing Required**:
```javascript
const response = await fetch('https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson');
const text = await response.text();
const facts = text.trim().split('\\n').map(line => JSON.parse(line));
```

**Limitations**:
- ❌ No streaming parser in browser (must load entire response first)
- ❌ Large responses (>1MB) may be slow
- ✅ Endpoint has `LIMIT 1000` built-in (safe for browser)

**Recommendation**:
- ✅ OK to call directly for dashboard (< 1000 facts)
- ❌ NO PROXY NEEDED for current usage
- ⚠️ Future: Add pagination if fact counts grow beyond 1000

---

## F) PER-URL VERIFICATION (WHAT WE WANT TO BUILD)

### 18. Do we support filtering facts by URL (source_url)?

**Current State**: NO - But easy to add.

**What Exists Now**:
```javascript
// Current: /v1/facts/:domain.ndjson?evidence_type=text_extraction
// Filters by: domain, evidence_type
```

**What's Missing**:
```javascript
// Desired: /v1/facts/:domain.ndjson?source_url=https://nrlc.ai/&evidence_type=text_extraction
// Filters by: domain, source_url, evidence_type
```

**Implementation**:
- **File**: `/precogs/precogs-api/src/routes/facts.js`
- **Line**: ~56 (in `getFactsStream` function)
- **Change**: Add `source_url` query parameter support

```javascript
// Add after line 59
const sourceUrlFilter = req.query.source_url;
if (sourceUrlFilter) {
  query += ` AND source_url = $${params.length + 1}`;
  params.push(sourceUrlFilter);
}
```

**ETA**: 5 minutes (1 line change + test)

---

### 19. Does /v1/extract return failure details?

**Current State**: PARTIAL - Returns failures but not detailed examples.

**What Exists**:
```json
{
  "validation": {
    "facts_validated": 19,
    "facts_passed": 19,
    "facts_failed": 0,
    "pass_rate": 1.0
  },
  "validation_results": [] // Only included if facts_failed > 0
}
```

**What's Included When Failures Exist**:
- Only FAILED facts (passed facts excluded to reduce response size)
- Each failure shows: `fact_id`, `slot_id`, `passed: false`, `error`, error details

**What's Missing**:
- `first_failed_fact` (pointer to first failure)
- `failure_examples` (up to 3 examples)
- Grouping by error type

**Implementation**:
- **File**: `/precogs/precogs-api/src/routes/extract.js`
- **Line**: ~216 (before building response)
- **Change**: Add summary fields

```javascript
// After line 196 (after validation loop)
const failedResults = validationResults.filter(r => !r.passed);
const firstFailedFact = failedResults.length > 0 ? failedResults[0] : null;
const failureExamples = failedResults.slice(0, 3);

// Add to response (line 216)
validation_results: factsFailed > 0 ? {
  first_failed_fact: firstFailedFact,
  failure_examples: failureExamples,
  all_failures: failedResults
} : undefined
```

**ETA**: 10 minutes (add summary fields + test)

---

### 20. Do we store per-URL validation results?

**Current State**: NO - Always live recompute.

**What Exists**:
- `/v1/extract` recomputes validation on every request
- No cached validation results
- No `validation_results` table

**Implications**:
- ✅ Always current (no stale data)
- ❌ Slower (recomputes every time)
- ❌ No historical validation tracking

**Options**:

**Option A: Keep Live (Current)**
- Dashboard calls `/v1/extract` on demand
- Wait 1-5 seconds per URL
- Acceptable for dashboard usage

**Option B: Cache in DB**
- Create `url_validation_cache` table
- Store validation results after each ingest
- Dashboard reads cached results instantly

**Option C: Cache in Redis**
- Store validation results in Redis with TTL
- Invalidate on new ingest
- Faster than DB, no new schema

**Recommendation**: 
- **NOW**: Keep live (Option A) - Dashboard can wait 1-5s
- **LATER**: Add Redis cache (Option C) if scale requires

**ETA for Option C**: 30 minutes (add Redis caching layer)

---

### 21. Do we have a "pages" table?

**Current State**: YES - Multiple sources for URL lists.

**Table 1: `html_snapshots`**
- **Purpose**: Stores every ingested page
- **Schema**: `domain`, `source_url`, `html`, `canonical_extracted_text`, `fetched_at`
- **Usage**: Primary source for "list of URLs per domain"
- **Query**:
```sql
SELECT source_url, fetched_at 
FROM html_snapshots 
WHERE domain = 'nrlc.ai' 
ORDER BY fetched_at DESC;
```

**Table 2: `discovered_pages`**
- **Purpose**: Tracks auto-discovered pages with `<link rel="alternate">`
- **Schema**: `domain`, `page_url`, `alternate_href`, `discovered_at`, `is_active`
- **Usage**: Shows which pages exposed markdown via auto-discovery
- **Note**: May NOT include manually ingested URLs

**Table 3: `croutons`**
- **Purpose**: Facts table (has `source_url` column)
- **Schema**: `domain`, `source_url`, `text`, `triple`, etc.
- **Usage**: Can derive URL list from distinct `source_url` values
- **Note**: Only includes URLs with facts

**Recommendation for Dashboard**:
- **Use**: `html_snapshots` as primary source (most complete)
- **Join**: With `croutons` for fact counts per URL
- **Join**: With `discovered_pages` for discovery method

---

## G) DASHBOARD OUTPUT / EXPORT (PROOF BUNDLE)

### 22. Do we have a "copy proof bundle" export?

**Current State**: NO - Manual curl commands only.

**What Exists**:
- Shell script: `FINAL_GO_LIVE_PROOF.sh` (captures proof bundle via curl)
- No dashboard UI for export
- No "Copy JSON" button
- No download functionality

**What's Missing**:
- Dashboard button: "Generate Proof Bundle"
- JSON download option
- Copy to clipboard functionality
- Shareable proof bundle URL

**Where Should It Be Stored**:

**Option A: Generate on Demand (NO STORAGE)**
- Dashboard runs 6 API calls when user clicks "Generate Proof"
- Returns JSON in modal
- Provides "Download JSON" and "Copy to Clipboard" buttons
- **Pros**: No storage, always current
- **Cons**: Slower (6 API calls), no history

**Option B: Store in DB Table**
- Create `proof_bundles` table
- Store: `domain`, `url`, `generated_at`, `bundle_data JSONB`
- **Pros**: Instant retrieval, historical tracking
- **Cons**: Storage overhead, potential staleness

**Option C: Store as Files**
- Save to: `storage/proof-bundles/{domain}/{timestamp}.json`
- **Pros**: Easy to serve as downloads, no DB schema change
- **Cons**: File management, backups

**Recommendation**: Option A (on-demand) for MVP - simple, no storage.

**ETA**: 2 hours (add dashboard UI + bundle generation logic)

---

### 23. Should dashboard generate 6-proof outputs automatically?

**Current State**: NO - Must run shell script manually.

**What's Needed**:
- Dashboard calls these 6 endpoints when user clicks "Verify URL":
  1. `/v1/facts/:domain.ndjson?evidence_type=text_extraction` (count types)
  2. `/v1/facts/:domain.ndjson?evidence_type=text_extraction` (sample fact)
  3. `/v1/extract/:domain?url=...` (validation)
  4. `https://md.croutons.ai/:domain/index.md` (mirror check)
  5. `/v1/status/:domain` (status check)
  6. `/v1/graph/:domain.jsonld` (graph length)

**Save Where**:
- **Option A**: Display in modal (no save)
- **Option B**: Save to `proof_bundles` table
- **Option C**: Generate downloadable JSON file

**Recommendation**: Display in modal with download option (A + file generation).

**ETA**: 2 hours (implement proof bundle generator in dashboard)

---

## H) OWNERSHIP + DELIVERY

### 24. Who owns implementing dashboard features vs API changes?

**Current Ownership** (based on codebase):

| Area | Owner | Repo Path |
|------|-------|-----------|
| **Dashboard UI (Graph Service)** | Frontend dev | `/graph-service/public/dashboard.html` |
| **Dashboard API (Graph Service)** | Backend dev | `/graph-service/src/routes/*.js` |
| **Precogs API Endpoints** | Backend dev | `/precogs/precogs-api/src/routes/*.js` |
| **Database Migrations** | Backend dev | `/precogs/precogs-api/migrations/*.sql` |
| **PHP Dashboard** | Frontend dev | `/dashboard.php` |

**Recommendation**:
- **Backend**: Add `source_url` filter, failure examples, validation caching
- **Frontend**: Add "Verify URL" UI, proof bundle generator, inline viewers

---

### 25. What's the fastest path to ship "Verify URL" MVP?

**Options Analysis**:

**Option A: Dashboard Calls Existing Endpoints Only**
- **What**: Add UI that calls existing `/v1/extract`, `/v1/facts`, `/v1/status`
- **Backend Changes**: NONE
- **Frontend Changes**: Add "Verify URL" page with 6 API calls + results display
- **Pros**: No backend changes, ships in 1 day
- **Cons**: Slower (6 sequential API calls), no per-URL fact filtering
- **ETA**: 1 day (frontend only)

**Option B: Add 2 API Upgrades**
- **What**: 
  1. Add `source_url` filter to `/v1/facts/:domain.ndjson?source_url=...`
  2. Add `failure_examples` to `/v1/extract` response
- **Backend Changes**: 2 endpoint modifications (15 minutes each)
- **Frontend Changes**: Same as Option A
- **Pros**: Faster dashboard (filtered facts), better error details
- **Cons**: Requires backend deploy
- **ETA**: 1.5 days (30 min backend + 1 day frontend + deploy)

**Option C: Store Per-URL Validation Summaries**
- **What**: 
  1. Create `url_validation_cache` table
  2. Store validation results after each ingest
  3. Dashboard reads cached results
- **Backend Changes**: New table, cache logic in ingest, new read endpoint
- **Frontend Changes**: Same as Option A
- **Pros**: Instant dashboard, historical tracking
- **Cons**: Most complex, schema migration required
- **ETA**: 3 days (1 day backend + 1 day frontend + 1 day testing)

**RECOMMENDATION**: **Option B** (2 API upgrades)

**Reasoning**:
- Only 30 minutes of backend work
- Significantly improves dashboard UX
- No schema changes (easier to ship)
- Can add Option C caching later if needed

**ETA**: **1.5 days total**

---

## I) CLARIFY ONE THING: "INSTANT"

### 26. Define "instant" in current architecture

**Current Capabilities**:

**"Instant from DB" (< 100ms)**:
- Domain-level metrics (status, counts)
- Facts list (first 1000)
- Markdown version detection
- Graph existence check

**"Fast Live Compute" (< 2 seconds)**:
- `/v1/extract` validation for < 50 facts
- Facts stream with filtering
- Status endpoint tier calculation

**"Slow Live Compute" (2-10 seconds)**:
- `/v1/extract` validation for 50-200 facts
- Full proof bundle generation (6 API calls)
- NDJSON parsing in browser

**"Too Slow for Dashboard" (> 10 seconds)**:
- `/v1/extract` for > 200 facts
- Full text search across all facts
- Historical trend analysis

**What We Can Support at Scale**:

**NOW (With Current Architecture)**:
- ✅ Live validation up to 100 facts per URL (< 3 seconds)
- ✅ Proof bundle generation on-demand (< 10 seconds)
- ✅ Per-URL fact filtering with added `source_url` param (< 1 second)

**FUTURE (If Scale Requires)**:
- Redis cache for validation results (< 100ms)
- Materialized views for domain aggregates (< 50ms)
- Background job for proof bundle pre-generation (instant retrieval)

**RECOMMENDATION**: 
- **Keep live compute** for MVP (acceptable 1-3 second delays)
- **Add caching** only when URLs have > 100 text_extraction facts OR dashboard usage exceeds 100 requests/minute

---

## SUMMARY: IMPLEMENTATION ROADMAP

### MVP "Verify URL" Feature

**Backend (30 minutes)**:
1. Add `source_url` query param to `/v1/facts/:domain.ndjson` (15 min)
2. Add `failure_examples` to `/v1/extract` response (15 min)

**Frontend (1 day)**:
1. Add "URLs" tab to dashboard
2. Show list of URLs per domain (from `html_snapshots`)
3. Add "Verify" button per URL
4. Modal shows proof bundle results (6 API calls)
5. "Download JSON" and "Copy" buttons

**Total ETA**: 1.5 days

**No Schema Changes Required**  
**No Caching Layer Needed**  
**Uses Only Existing Infrastructure**

---

**Last Updated**: 2026-01-28  
**Dashboard URLs**:
- Live: https://graph.croutons.ai/dashboard.html
- API: https://precogs.croutons.ai
- Markdown: https://md.croutons.ai
