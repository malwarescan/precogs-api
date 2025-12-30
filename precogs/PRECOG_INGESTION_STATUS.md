# Precog Ingestion Status

## Summary

**Question:** Should all precogs have their data ingested into the Croutons graph?

**Answer:** Yes, but it depends on the precog type:

1. **Corpus-based precogs** (like `bkk_massage`) → **YES, ingest local corpus files**
2. **Graph-query precogs** (like `home.*`) → **NO local corpus, but external NDJSON sources should be ingested**
3. **KB-based precogs** (like `schema`) → **NO, uses knowledge base rules only**

---

## Precog-by-Precog Breakdown

### ✅ **bkk_massage** - NEEDS INGESTION

**Status:** Has corpus files, ingestion script created

**Corpus Location:** `corpora/thailand/bangkok/massage/`

**Files:**
- `shops_legit.ndjson` (20 shops)
- `shops_risky.ndjson` (12 shops)
- `pricing_tiers.ndjson` (20 tiers)
- `neighborhood_profiles.ndjson` (10 districts)
- `etiquette.ndjson` (10 rules)
- `scam_patterns.ndjson` (8 patterns)
- `safety_signals.ndjson` (8 signals)
- `female_safe_spaces.ndjson` (15 spaces)
- `triples.ndjson` (199 triples)

**Ingestion Script:** `corpora/thailand/bangkok/massage/ingest_to_graph.js`

**Action Required:** Run ingestion script with `PUBLISH_HMAC_KEY`

---

### ⚠️ **home.* precogs** - EXTERNAL DATA SOURCES

**Status:** Query graph, no local corpus files

**Data Source:** External partner NDJSON feeds (e.g., `floodbarrierpros.com/sitemaps/sitemap-ai.ndjson`)

**How it works:**
1. Partner sites publish NDJSON feeds
2. **Those feeds should be ingested into graph** (via Croutons ingestion service)
3. Home precogs query graph for factlets
4. Precogs filter by domain/region/vertical

**Current Status:**
- ✅ Precog handler exists (`homePrecog.js`)
- ✅ Graph query logic implemented
- ⏳ External NDJSON ingestion not yet implemented (needs Croutons team)

**Action Required:** 
- Set up NDJSON source registry in Croutons admin
- Implement ingestion job for external partner feeds
- Ingest partner NDJSON feeds (e.g., floodbarrierpros.com)

**Note:** These precogs don't have local corpus files - they rely on external data being ingested.

---

### ❌ **schema** - NO INGESTION NEEDED

**Status:** Uses KB rules only, no corpus data

**Data Source:** Knowledge base rules (`kb/schema-foundation/`)

**How it works:**
- Validates JSON-LD against KB rules
- No corpus data to ingest

**Action Required:** None

---

### ❓ **faq** - UNKNOWN

**Status:** Registered in enum, no handler yet

**Action Required:** 
- Determine if it needs corpus data
- If yes, create corpus files and ingestion script

---

### ❓ **pricing** - UNKNOWN

**Status:** Registered in enum, no handler yet

**Action Required:**
- Determine if it needs corpus data
- If yes, create corpus files and ingestion script

---

## Ingestion Architecture

### For Corpus-Based Precogs (like bkk_massage):

```
Corpus Files → [Ingestion Script] → Graph Service → [Precog Queries] → GPT Agents
```

**Example:**
```bash
cd corpora/thailand/bangkok/massage
export PUBLISH_HMAC_KEY="your-key"
node ingest_to_graph.js
```

### For Graph-Query Precogs (like home.*):

```
External NDJSON Feeds → [Croutons Ingestion Service] → Graph Service → [Precog Queries] → GPT Agents
```

**Example:**
- Partner publishes: `https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson`
- Croutons ingestion service fetches and ingests
- Home precogs query graph with `domain=floodbarrierpros.com`

---

## Current Ingestion Status

| Precog | Has Corpus? | Ingested? | Action |
|--------|------------|-----------|--------|
| `bkk_massage` | ✅ Yes (103 records) | ❌ No | Run `ingest_to_graph.js` |
| `home.*` | ❌ No (external feeds) | ⏳ Pending | Set up external feed ingestion |
| `schema` | ❌ No (KB only) | N/A | None |
| `faq` | ❓ Unknown | ❓ Unknown | Determine requirements |
| `pricing` | ❓ Unknown | ❓ Unknown | Determine requirements |

---

## Recommendations

1. **Immediate:** Ingest `bkk_massage` corpus (script ready, just needs HMAC key)

2. **Next:** Set up external NDJSON ingestion for home precogs:
   - Create NDJSON source registry in Croutons admin
   - Implement ingestion job
   - Register partner feeds (e.g., floodbarrierpros.com)

3. **Future:** For any new corpus-based precogs:
   - Create corpus files
   - Create ingestion script (copy `ingest_to_graph.js`)
   - Run ingestion before expecting data in dashboard

---

## Files Reference

- **bkk_massage ingestion:** `corpora/thailand/bangkok/massage/ingest_to_graph.js`
- **bkk_massage instructions:** `corpora/thailand/bangkok/massage/INGESTION_INSTRUCTIONS.md`
- **Home precog handler:** `precogs-api/precogs-worker/src/homePrecog.js`
- **Home precog graph query:** Lines 90-172 in `homePrecog.js`
- **NDJSON ingestion module:** `precogs-api/precogs-worker/src/ndjsonIngestion.js` (ready but needs Croutons integration)

