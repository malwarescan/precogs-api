# Ingestion Fix Summary - Getting All Precog Data into Dashboard

## Current Status

**Dashboard shows:** 7 croutons (should be 700+)

**Expected:**
- Bangkok Massage: ~103 factlets
- floodbarrierpros.com: ~662 factlets  
- ourcasa.ai: Varies (depends on feed)

**Total expected:** ~765+ croutons

## Issues Fixed

### 1. Endpoint 404 Errors
**Problem:** `/api/import` was returning 404

**Fix:** Added fallback to `/v1/streams/ingest` endpoint
- Scripts now try `/api/import` first (HMAC)
- Fallback to `/v1/streams/ingest` (Bearer token) if first fails

### 2. Missing Required Fields
**Problem:** Graph service requires `fact_id` and `claim` (non-empty)

**Fix:** 
- Ensured all records have non-empty `claim` field
- Added fallback claim generation if missing
- Filter out invalid records before sending

### 3. Format Issues
**Problem:** Some records might not match expected format

**Fix:**
- Simplified Factlet format (removed extra fields)
- Ensured `@type: "Factlet"` is present
- Ensured `fact_id` and `claim` are always present

## Files Updated

1. `corpora/thailand/bangkok/massage/ingest_to_graph.js`
   - Added endpoint fallback
   - Fixed claim extraction
   - Ensured non-empty claims

2. `precogs-api/precogs-worker/scripts/ingest-home-sources.js`
   - Added endpoint fallback
   - Fixed claim extraction
   - Added record filtering

## Next Steps

### 1. Run Ingestion Again

```bash
cd precogs
export PUBLISH_HMAC_KEY="your-key-from-railway"
node ingest-all-precogs.js
```

### 2. Verify Results

```bash
# Check total count
curl "https://graph.croutons.ai/diag/stats" | jq '.counts'

# Check specific sources
curl "https://graph.croutons.ai/api/facts?limit=100" | jq '.facts | length'
```

### 3. Expected Output

After successful ingestion:
- Dashboard should show **700+ croutons**
- Bangkok Massage data should be searchable
- Home domain data (floodbarrierpros.com) should be searchable

## Troubleshooting

### If still only 7 croutons:

1. **Check ingestion logs** - Look for errors in script output
2. **Verify endpoint** - Check which endpoint succeeded (should see "✅" messages)
3. **Check Bearer token** - `/v1/streams/ingest` requires Bearer token in Authorization header
4. **Verify data format** - Check that records have `fact_id` and `claim`

### Common Issues:

- **"Missing API key"** - Set `PUBLISH_HMAC_KEY` environment variable
- **"Invalid API key"** - Check Railway → graph-service → Environment Variables
- **"No valid records found"** - Check that records have `@type: "Factlet"`, `fact_id`, and `claim`
- **Records skipped** - Check logs for "Skipping invalid JSON line" messages

## Verification Commands

```bash
# Check current count
curl "https://graph.croutons.ai/diag/stats"

# Check Bangkok Massage data
curl "https://graph.croutons.ai/api/facts?limit=10" | jq '.facts[] | select(.corpus_id == "bkk_massage")'

# Check floodbarrierpros.com data  
curl "https://graph.croutons.ai/api/facts?limit=10" | jq '.facts[] | select(.source_url | contains("floodbarrierpros"))'
```

---

**Status:** Scripts fixed and ready. Run ingestion again to populate all data.

