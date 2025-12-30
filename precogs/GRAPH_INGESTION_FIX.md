# Graph Dashboard Not Showing Precog Data - Fix

## Problem

The graph service dashboard at https://graph.croutons.ai/dashboard.html shows **0 croutons** and **0 triples** even though we've created corpus files for the Bangkok Massage precog.

## Root Cause

**The corpus files exist but haven't been ingested into the graph service.**

The precogs load corpus files directly from the filesystem, but they don't automatically send that data to the graph service. The graph service needs data to be explicitly ingested via its API.

## Solution

### Step 1: Get HMAC Secret

The graph service requires HMAC-signed requests. Get the `PUBLISH_HMAC_KEY` from:

1. **Railway Dashboard**:
   - Go to Railway → `graph-service` project
   - Environment Variables → `PUBLISH_HMAC_KEY`
   - Copy the value

2. **Or check deployment config**:
   - The key should be set in Railway environment variables
   - Default for local dev: `dev-secret`

### Step 2: Run Ingestion Script

```bash
cd corpora/thailand/bangkok/massage

# Set the HMAC secret
export PUBLISH_HMAC_KEY="your-key-from-railway"

# Run ingestion
node ingest_to_graph.js
```

### Step 3: Verify

1. **Check dashboard**: https://graph.croutons.ai/dashboard.html
   - Should show croutons count > 0
   - Search for "bkk_massage" or "MassageShop"

2. **Query API**:
   ```bash
   curl "https://graph.croutons.ai/api/facts?corpus_id=bkk_massage&limit=10" | jq
   ```

## What the Script Does

The `ingest_to_graph.js` script:

1. **Loads all corpus NDJSON files**:
   - `shops_legit.ndjson`
   - `shops_risky.ndjson`
   - `pricing_tiers.ndjson`
   - `neighborhood_profiles.ndjson`
   - `etiquette.ndjson`
   - `scam_patterns.ndjson`
   - `safety_signals.ndjson`
   - `female_safe_spaces.ndjson`

2. **Converts to Factlet format**:
   - Each corpus record → `Factlet` with `@type: "Factlet"`
   - Generates deterministic `fact_id`
   - Extracts `claim` text
   - Sets `corpus_id: "bkk_massage"`

3. **Signs with HMAC**:
   - Uses `PUBLISH_HMAC_KEY` to sign NDJSON body
   - Adds `X-Signature: sha256=<hmac>` header

4. **Sends to graph service**:
   - POST to `https://graph.croutons.ai/api/import`
   - Graph service validates and inserts croutons

## Architecture Note

**Why precogs don't auto-ingest:**

- **Precogs are query/analysis tools** - They read data (corpus files or graph) and return answers
- **Graph service is the data store** - It needs explicit ingestion via API
- **Separation of concerns** - Precogs don't write to graph, they query it

**Data flow:**
```
Corpus Files → [Ingestion Script] → Graph Service → [Precogs Query] → GPT Agents
```

## For Future Precogs

When creating new precogs with corpus data:

1. **Create corpus files** (as per `HOW_TO_ADD_PRECOG.md`)
2. **Create ingestion script** (copy `ingest_to_graph.js` and modify)
3. **Run ingestion** before expecting data in dashboard
4. **Verify** in dashboard

## Files Created

- `corpora/thailand/bangkok/massage/ingest_to_graph.js` - Ingestion script
- `corpora/thailand/bangkok/massage/INGESTION_INSTRUCTIONS.md` - Detailed guide
- `precogs/GRAPH_INGESTION_FIX.md` - This document

## Next Steps

1. ✅ Get `PUBLISH_HMAC_KEY` from Railway
2. ✅ Run `ingest_to_graph.js`
3. ✅ Verify data appears in dashboard
4. ✅ Test `bkk_massage` precog queries graph (if implemented)

---

**Status**: Ready to ingest. Just need HMAC key from Railway.

