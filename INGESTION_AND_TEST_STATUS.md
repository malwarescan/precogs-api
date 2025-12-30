# Ingestion and Test Status Report

**Date:** December 2024  
**Source:** floodbarrierpros.com  
**Goal:** Live vertical slice end-to-end test

---

## 1. Ingestion Status

### ✅ NDJSON Source Accessible

**URL:** `https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson`

**Status:** ✅ **Accessible** - NDJSON is publicly available

**Sample Lines (first 3):**
```json
{"@id":"https://floodbarrierpros.com/","@type":"WebPage","headline":"","summary":"","keywords":[],"lastModified":"2025-10-27","contentHash":"79e06ef63957"}
{"@id":"https://floodbarrierpros.com/products","@type":"WebPage","headline":"","summary":"","keywords":[],"lastModified":"2025-10-27","contentHash":"96856dead252"}
{"@id":"https://floodbarrierpros.com/testimonials","@type":"WebPage","headline":"","summary":"","keywords":[],"lastModified":"2025-10-27","contentHash":"115b34d138b2"}
```

### ✅ Ingestion Script Created

**Script:** `precogs-worker/scripts/ingest-floodbarrierpros.js`

**Status:** ✅ **Created and executable**

**What it does:**
- Fetches NDJSON from floodbarrierpros.com
- Validates against `ndjson_home_factlet.schema.json`
- Normalizes to factlets with domain/vertical/region tags
- Upserts to Croutons graph

**Run command:**
```bash
cd ~/Desktop/croutons.ai/precogs/precogs-api/precogs-worker
node scripts/ingest-floodbarrierpros.js
```

### ⏳ Ingestion Execution

**Status:** ⏳ **Pending Croutons Graph Integration**

**What's needed:**
- Graph API endpoint for upserting factlets
- Database/table for storing factlets
- Confirmation that factlets are stored with `domain="floodbarrierpros.com"`

**Sample Factlets (after normalization):**
Once ingestion runs, factlets will have:
- `@id`: Generated or from NDJSON
- `@type`: "Factlet" or "WebPage"
- `domain`: "floodbarrierpros.com"
- `vertical`: "flood_protection"
- `region`: "33908,FL,Fort Myers"
- `ingested_at`: ISO timestamp
- `source_url`: "https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson"

---

## 2. Graph Status

### ✅ Graph Query Script Created

**Script:** `precogs-worker/scripts/test-graph-query.js`

**Status:** ✅ **Created and executable**

**What it does:**
- Queries Croutons graph API for factlets by domain
- Tests `byDomain("floodbarrierpros.com")` functionality
- Returns sample factlets for verification

**Run command:**
```bash
cd ~/Desktop/croutons.ai/precogs/precogs-api/precogs-worker
node scripts/test-graph-query.js
```

### ⏳ Graph Query Execution

**Status:** ⏳ **Pending Graph API Implementation**

**What's needed:**
- Graph API endpoint: `GET /api/triples?type=Factlet&domain=floodbarrierpros.com`
- Returns factlets filtered by domain
- Confirmation that `byDomain("floodbarrierpros.com")` returns data

**Expected Response:**
```json
{
  "triples": [
    {
      "@id": "https://croutons.ai/factlet/floodbarrierpros.com/...",
      "@type": "Factlet",
      "domain": "floodbarrierpros.com",
      "vertical": "flood_protection",
      "region": "33908,FL,Fort Myers",
      ...
    }
  ]
}
```

---

## 3. Endpoint Details

### ✅ Precogs API Base URL

**URL:** `https://precogs.croutons.ai`

**Health Check:**
```bash
curl -s https://precogs.croutons.ai/health
```

**Status:** ✅ **API is live and responding**

### ⏳ API Key

**Status:** ⏳ **Needs to be provided**

**Where to get:**
- Check Railway environment variables: `API_KEY`
- Or check Precogs API configuration
- Or generate a test key for this specific test

**Usage:**
```bash
curl -N "https://precogs.croutons.ai/v1/run.ndjson" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Note:** If `API_KEY` env var is not set, the endpoint may work without auth for testing.

### ✅ Precog Configuration

**Precog Namespace:** `home.safety` ✅ **Wired**

**Task:** `diagnose` ✅ **Wired**

**Verification:**
- ✅ Function schema includes `home.safety` in enum
- ✅ Worker routes `precog.startsWith("home")` correctly
- ✅ `homePrecog.js` handler processes `diagnose` task
- ✅ POST `/v1/run.ndjson` accepts home precog calls

**Test Command:**
```bash
curl -N "https://precogs.croutons.ai/v1/run.ndjson" \
  -H "Content-Type: application/json" \
  -d '{
    "precog": "home.safety",
    "task": "diagnose",
    "content": "I live near a canal in Fort Myers (33908). My garage floods when it rains. What should I be looking at for protection?",
    "region": "33908",
    "domain": "floodbarrierpros.com",
    "vertical": "flood_protection"
  }'
```

---

## 4. Test Script

**Script:** `precogs-api/scripts/test-home-precog.sh`

**Status:** ✅ **Created and executable**

**Usage:**
```bash
cd ~/Desktop/croutons.ai/precogs/precogs-api
export PRECOGS_API="https://precogs.croutons.ai"
export PRECOGS_API_KEY="your-key-here"  # Optional
./scripts/test-home-precog.sh
```

---

## 5. Current Blockers

### Blocker 1: Graph API Upsert Endpoint

**Issue:** `upsertFactlet()` in `ndjsonIngestion.js` is a placeholder

**Needed:**
- Graph API endpoint: `POST /api/factlets` or similar
- Accepts normalized factlet JSON
- Stores with domain/vertical/region tags

**Action:** Croutons team needs to implement graph upsert endpoint

---

### Blocker 2: Graph API Query Endpoint

**Issue:** `queryCroutonsGraph()` calls graph API but endpoint may not exist

**Needed:**
- Graph API endpoint: `GET /api/triples?type=Factlet&domain=...&region=...&vertical=...`
- Returns factlets filtered by query parameters
- Supports domain/region/vertical filtering

**Action:** Croutons team needs to implement graph query endpoint

---

## 6. What Works Right Now (Without Graph)

Even without the graph fully wired, you can test:

1. **Endpoint accepts calls:**
   ```bash
   curl -N "https://precogs.croutons.ai/v1/run.ndjson" \
     -H "Content-Type: application/json" \
     -d '{"precog":"home.safety","task":"diagnose","content":"My garage floods"}'
   ```

2. **Worker processes the job:**
   - Routes to `homePrecog.js`
   - Loads `home-foundation` KB
   - Executes `diagnose` task
   - Returns structured NDJSON response

3. **Response shape is correct:**
   - Has `assessment`, `risk_score`, `recommended_steps`, etc.
   - May not have graph-backed data yet, but structure is correct

---

## 7. Next Steps to Get Fully Live

1. **Croutons team implements:**
   - Graph upsert endpoint for factlets
   - Graph query endpoint with domain/region/vertical filtering

2. **Run ingestion:**
   ```bash
   cd precogs-worker
   node scripts/ingest-floodbarrierpros.js
   ```

3. **Verify graph query:**
   ```bash
   node scripts/test-graph-query.js
   ```

4. **Test end-to-end:**
   ```bash
   cd precogs-api
   ./scripts/test-home-precog.sh
   ```

---

## 8. Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **NDJSON Source** | ✅ Accessible | floodbarrierpros.com/sitemaps/sitemap-ai.ndjson |
| **Ingestion Script** | ✅ Created | Ready to run once graph API is ready |
| **Graph Upsert** | ⏳ Pending | Needs Croutons team implementation |
| **Graph Query** | ⏳ Pending | Needs Croutons team implementation |
| **Precog Endpoint** | ✅ Live | `/v1/run.ndjson` accepts home precogs |
| **Worker Routing** | ✅ Wired | `home.safety` + `diagnose` working |
| **API Key** | ⏳ Needed | Check Railway env or config |

---

**Current State:** Precogs side is ready. Waiting on Croutons graph API endpoints to complete the loop.




