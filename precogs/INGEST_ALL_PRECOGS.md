# Ingest All Precogs to Graph Dashboard

## Overview

This guide explains how to ingest all precog data into the Croutons graph so it appears in the dashboard at https://graph.croutons.ai/dashboard.html

## Quick Start

```bash
cd precogs

# Set HMAC secret (get from Railway → graph-service → Environment Variables)
export PUBLISH_HMAC_KEY="your-key-here"

# Run master ingestion script
node ingest-all-precogs.js
```

## What Gets Ingested

### 1. **Bangkok Massage (bkk_massage)**
- **Source:** Local corpus files in `corpora/thailand/bangkok/massage/`
- **Files:**
  - `shops_legit.ndjson` (20 shops)
  - `shops_risky.ndjson` (12 shops)
  - `pricing_tiers.ndjson` (20 tiers)
  - `neighborhood_profiles.ndjson` (10 districts)
  - `etiquette.ndjson` (10 rules)
  - `scam_patterns.ndjson` (8 patterns)
  - `safety_signals.ndjson` (8 signals)
  - `female_safe_spaces.ndjson` (15 spaces)
- **Total:** ~103 factlets
- **Script:** `corpora/thailand/bangkok/massage/ingest_to_graph.js`

### 2. **Home Domain Sources (home.* precogs)**
- **Source:** External NDJSON feeds from partner sites
- **Sources:**
  - `ourcasa.ai` → `https://ourcasa.ai/sitemaps/sitemap-ai.ndjson`
  - `floodbarrierpros.com` → `https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson`
- **Total:** Varies (depends on partner feed size)
- **Script:** `precogs-api/precogs-worker/scripts/ingest-home-sources.js`

### 3. **Schema Precog**
- **Status:** No corpus data (uses KB rules only)
- **Action:** None needed

### 4. **FAQ / Pricing Precogs**
- **Status:** No handlers/corpus yet
- **Action:** None needed

## Master Ingestion Script

**File:** `precogs/ingest-all-precogs.js`

This script:
1. Finds all ingestion scripts
2. Runs them sequentially
3. Reports success/failure for each
4. Provides summary at the end

### Usage

```bash
cd precogs
export PUBLISH_HMAC_KEY="your-key"
node ingest-all-precogs.js
```

### Output Example

```
=== CRoutons Graph Ingestion - All Precogs ===

Graph Service: https://graph.croutons.ai
HMAC Secret: grph_xxx...

Found 2 ingestion tasks:

1. Bangkok Massage (bkk_massage)
   Ingests corpus files: shops, pricing, districts, safety signals, etc.
   Script: /path/to/corpora/thailand/bangkok/massage/ingest_to_graph.js

2. Home Domain Sources (ourcasa.ai, floodbarrierpros.com)
   Ingests external NDJSON feeds from partner sites
   Script: /path/to/precogs-api/precogs-worker/scripts/ingest-home-sources.js

============================================================
Running: Bangkok Massage (bkk_massage)
============================================================

=== Bangkok Massage Corpus Ingestion ===
...
✅ Bangkok Massage (bkk_massage) completed successfully

============================================================
Running: Home Domain Sources (ourcasa.ai, floodbarrierpros.com)
============================================================

=== Home Domain NDJSON Ingestion ===
...
✅ Home Domain Sources (ourcasa.ai, floodbarrierpros.com) completed successfully

============================================================
=== Ingestion Summary ===
============================================================
✅ Successful: 2
❌ Failed: 0
Total: 2

📊 Check dashboard: https://graph.croutons.ai/dashboard.html
```

## Individual Ingestion (Alternative)

If you prefer to run ingestion scripts individually:

### Bangkok Massage

```bash
cd corpora/thailand/bangkok/massage
export PUBLISH_HMAC_KEY="your-key"
node ingest_to_graph.js
```

### Home Domain Sources

```bash
cd precogs-api/precogs-worker
export PUBLISH_HMAC_KEY="your-key"
node scripts/ingest-home-sources.js
```

## Verification

### 1. Check Dashboard

After ingestion, visit: https://graph.croutons.ai/dashboard.html

**Expected:**
- Croutons count > 0 (should show total ingested)
- Triples count > 0 (if triples were generated)
- Search should return results

### 2. Query Graph API

```bash
# Check total croutons
curl "https://graph.croutons.ai/api/facts?limit=10" | jq '.facts | length'

# Check bkk_massage corpus
curl "https://graph.croutons.ai/api/facts?corpus_id=bkk_massage&limit=10" | jq

# Check ourcasa.ai
curl "https://graph.croutons.ai/api/triples?domain=ourcasa.ai&limit=10" | jq

# Check floodbarrierpros.com
curl "https://graph.croutons.ai/api/triples?domain=floodbarrierpros.com&limit=10" | jq
```

### 3. Test Precogs

```bash
# Test bkk_massage
curl -X POST "https://precogs.croutons.ai/v1/run.ndjson" \
  -H "Content-Type: application/json" \
  -d '{
    "precog": "bkk_massage",
    "content_source": "inline",
    "content": "Find safe massage in Asok",
    "region": "Asok"
  }'

# Test home precog
curl -X POST "https://precogs.croutons.ai/v1/run.ndjson" \
  -H "Content-Type: application/json" \
  -d '{
    "precog": "home.safety",
    "task": "diagnose",
    "content": "My garage floods in Naples, FL",
    "region": "Naples, FL",
    "domain": "floodbarrierpros.com",
    "vertical": "flood_protection"
  }'
```

## Troubleshooting

### Error: "PUBLISH_HMAC_KEY not set"

**Fix:**
```bash
export PUBLISH_HMAC_KEY="your-key-from-railway"
```

Get the key from: Railway → graph-service → Environment Variables → `PUBLISH_HMAC_KEY`

### Error: "Invalid HMAC signature"

**Cause:** Wrong HMAC key

**Fix:** Verify key matches graph-service environment variable

### Error: "Script not found"

**Cause:** Script paths are incorrect

**Fix:** Run from `precogs/` directory, or update paths in `ingest-all-precogs.js`

### Dashboard shows 0 croutons

**Possible causes:**
1. Ingestion didn't run successfully
2. HMAC signature validation failed
3. Graph service database issue

**Fix:**
- Check ingestion script output for errors
- Verify HMAC key is correct
- Check graph service logs in Railway

### Some precogs show data, others don't

**Cause:** Only some ingestion scripts ran successfully

**Fix:**
- Check ingestion summary output
- Re-run failed ingestion scripts individually
- Check script paths are correct

## Scheduled Ingestion

For production, set up scheduled ingestion:

### Option 1: Cron Job

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/croutons.ai/precogs && export PUBLISH_HMAC_KEY="your-key" && node ingest-all-precogs.js >> /var/log/croutons-ingestion.log 2>&1
```

### Option 2: Railway Cron

Use Railway's cron service to run the script periodically.

### Option 3: GitHub Actions

Set up a GitHub Actions workflow to run ingestion on schedule.

## Files Reference

- **Master script:** `precogs/ingest-all-precogs.js`
- **Bangkok Massage:** `corpora/thailand/bangkok/massage/ingest_to_graph.js`
- **Home Sources:** `precogs-api/precogs-worker/scripts/ingest-home-sources.js`
- **Documentation:** This file (`INGEST_ALL_PRECOGS.md`)

## Next Steps

1. ✅ **Get HMAC key** from Railway
2. ✅ **Run master ingestion script**
3. ✅ **Verify in dashboard**
4. ✅ **Test precogs**
5. ⏳ **Set up scheduled ingestion** (production)

---

**Status:** Ready to ingest. Just need HMAC key from Railway.

