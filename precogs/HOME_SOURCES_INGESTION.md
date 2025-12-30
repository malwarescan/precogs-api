# Home Precogs Data Sources - Ingestion Guide

## Overview

Home precogs (`home`, `home.hvac`, `home.plumbing`, etc.) pull data from external partner NDJSON feeds. These feeds need to be ingested into the Croutons graph so precogs can query them.

## Data Sources

### 1. **ourcasa.ai**
- **NDJSON URL:** `https://ourcasa.ai/sitemaps/sitemap-ai.ndjson`
- **Domain:** `ourcasa.ai`
- **Vertical:** `home_services`
- **Region:** Multi-region

### 2. **floodbarrierpros.com**
- **NDJSON URL:** `https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson`
- **Domain:** `floodbarrierpros.com`
- **Vertical:** `flood_protection`
- **Region:** Naples, FL (primary)

## How It Works

### Architecture

```
External NDJSON Feeds → [Ingestion Script] → Graph Service → [Home Precogs Query] → GPT Agents
```

1. **Partner sites publish NDJSON** (e.g., `ourcasa.ai/sitemaps/sitemap-ai.ndjson`)
2. **Ingestion script fetches and normalizes** factlets
3. **Graph service stores** factlets with domain/vertical/region tags
4. **Home precogs query graph** with `domain=ourcasa.ai` or `domain=floodbarrierpros.com`

### Precog Query Flow

When a home precog is called with `domain="ourcasa.ai"`:

1. Precog queries graph: `GET /api/triples?domain=ourcasa.ai&vertical=home_services`
2. Graph returns factlets tagged with `domain=ourcasa.ai`
3. Precog filters/boosts by domain, region, vertical
4. Precog returns enriched answer

## Ingestion Script

**File:** `precogs-api/precogs-worker/scripts/ingest-home-sources.js`

### Usage

```bash
cd precogs-api/precogs-worker

# Set HMAC secret (get from Railway/graph-service)
export PUBLISH_HMAC_KEY="your-hmac-secret-here"

# Run ingestion
node scripts/ingest-home-sources.js
```

### What It Does

1. **Fetches NDJSON** from both sources:
   - `ourcasa.ai/sitemaps/sitemap-ai.ndjson`
   - `floodbarrierpros.com/sitemaps/sitemap-ai.ndjson`

2. **Validates** against `ndjson_home_factlet.schema.json`

3. **Normalizes** to Factlet format:
   - Generates `fact_id` if missing
   - Sets `domain`, `vertical`, `region` tags
   - Extracts `claim` text

4. **Signs with HMAC** using `PUBLISH_HMAC_KEY`

5. **Sends to graph service** via `POST /api/import`

## Configuration

### Domain Map (in `homePrecog.js`)

The `getNDJSONUrlForDomain()` function maps domains to NDJSON URLs:

```javascript
const domainMap = {
  "floodbarrierpros.com": "https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson",
  "ourcasa.ai": "https://ourcasa.ai/sitemaps/sitemap-ai.ndjson",
};
```

This enables fallback: if graph query fails, precog fetches directly from NDJSON feed.

## Verification

### Check Dashboard

After ingestion, verify data appears:

1. **Dashboard:** https://graph.croutons.ai/dashboard.html
   - Should show croutons count > 0
   - Search for "ourcasa.ai" or "floodbarrierpros.com"

### Query Graph API

```bash
# Query ourcasa.ai factlets
curl "https://graph.croutons.ai/api/triples?domain=ourcasa.ai&limit=10" | jq

# Query floodbarrierpros.com factlets
curl "https://graph.croutons.ai/api/triples?domain=floodbarrierpros.com&limit=10" | jq
```

### Test Home Precog

```bash
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

Should return factlets from `floodbarrierpros.com` in the response.

## Scheduled Ingestion

For production, set up scheduled ingestion:

1. **Cron job** or **scheduled task** runs `ingest-home-sources.js` periodically
2. **Frequency:** Every 15 minutes to 1 hour (depending on update frequency)
3. **Monitor:** Check logs for ingestion success/failure

## Troubleshooting

### Error: "Failed to fetch NDJSON"

**Cause:** NDJSON feed URL not accessible or changed

**Fix:**
- Verify URLs are accessible: `curl https://ourcasa.ai/sitemaps/sitemap-ai.ndjson`
- Check if URLs changed
- Update `getNDJSONUrlForDomain()` if needed

### Error: "Invalid HMAC signature"

**Cause:** Wrong `PUBLISH_HMAC_KEY`

**Fix:**
- Get correct key from Railway → graph-service → Environment Variables
- Set: `export PUBLISH_HMAC_KEY="correct-key"`

### Error: "Graph query returns empty"

**Cause:** Data not ingested yet

**Fix:**
- Run ingestion script first
- Verify data in dashboard
- Check graph API query returns results

### Precog falls back to NDJSON

**Cause:** Graph query failed, using fallback

**Fix:**
- Check graph service is running
- Verify data is ingested
- Check graph API endpoint is accessible

## Files Reference

- **Ingestion script:** `precogs-api/precogs-worker/scripts/ingest-home-sources.js`
- **Home precog handler:** `precogs-api/precogs-worker/src/homePrecog.js`
- **Domain map:** Lines 179-185 in `homePrecog.js`
- **NDJSON ingestion module:** `precogs-api/precogs-worker/src/ndjsonIngestion.js`
- **Schema:** `precogs-api/precogs-worker/kb/home-foundation/ndjson_home_factlet.schema.json`

## Next Steps

1. ✅ **Add ourcasa.ai to domain map** (done)
2. ✅ **Create ingestion script** (done)
3. ⏳ **Run ingestion** (needs `PUBLISH_HMAC_KEY`)
4. ⏳ **Verify in dashboard**
5. ⏳ **Test home precog queries**
6. ⏳ **Set up scheduled ingestion** (production)

---

**Status:** Ready to ingest. Just need HMAC key from Railway.

