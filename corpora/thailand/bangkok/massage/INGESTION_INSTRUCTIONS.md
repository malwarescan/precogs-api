# Bangkok Massage Corpus Ingestion Guide

## Problem

The Bangkok Massage corpus files exist but haven't been ingested into the graph service. The dashboard at https://graph.croutons.ai/dashboard.html shows **0 croutons** because the data hasn't been sent to the graph.

## Solution

Use the `ingest_to_graph.js` script to convert corpus NDJSON files to Factlet format and send them to the graph service.

## Prerequisites

1. **HMAC Secret**: You need the `PUBLISH_HMAC_KEY` from the graph service deployment
   - Check Railway environment variables for `graph-service`
   - Or use `dev-secret` for local development

2. **Graph Service URL**: Defaults to `https://graph.croutons.ai`
   - Can override with `GRAPH_BASE` environment variable

## Usage

### Option 1: Direct Execution

```bash
cd corpora/thailand/bangkok/massage

# Set HMAC secret (get from Railway/graph-service)
export PUBLISH_HMAC_KEY="your-hmac-secret-here"

# Run ingestion
node ingest_to_graph.js
```

### Option 2: With Environment Variables

```bash
export PUBLISH_HMAC_KEY="your-hmac-secret-here"
export GRAPH_BASE="https://graph.croutons.ai"

node ingest_to_graph.js
```

## What It Does

1. **Loads corpus files**:
   - `shops_legit.ndjson`
   - `shops_risky.ndjson`
   - `pricing_tiers.ndjson`
   - `neighborhood_profiles.ndjson`
   - `etiquette.ndjson`
   - `scam_patterns.ndjson`
   - `safety_signals.ndjson`
   - `female_safe_spaces.ndjson`

2. **Converts to Factlet format**:
   - Each corpus record becomes a `Factlet`
   - Generates deterministic `fact_id` from record content
   - Extracts `claim` text from record fields
   - Sets `corpus_id: "bkk_massage"`

3. **Signs with HMAC**:
   - Uses `PUBLISH_HMAC_KEY` to sign NDJSON body
   - Adds `X-Signature: sha256=<hmac>` header

4. **Sends to graph service**:
   - POST to `https://graph.croutons.ai/api/import`
   - Graph service validates HMAC and inserts croutons

## Expected Output

```
=== Bangkok Massage Corpus Ingestion ===

Graph Service: https://graph.croutons.ai
HMAC Secret: grph_xxx...
Corpus Directory: /path/to/corpora/thailand/bangkok/massage

📂 Processing shops_legit.ndjson...
✅ Loaded 20 records from shops_legit.ndjson
📤 Sending 20 factlets to https://graph.croutons.ai/api/import...
✅ shops_legit.ndjson: 20 factlets inserted

📂 Processing shops_risky.ndjson...
✅ Loaded 12 records from shops_risky.ndjson
📤 Sending 12 factlets to https://graph.croutons.ai/api/import...
✅ shops_risky.ndjson: 12 factlets inserted

...

=== Ingestion Complete ===
Total processed: 103 records
Total inserted: 103 factlets

✅ Check dashboard: https://graph.croutons.ai/dashboard.html
```

## Verification

After ingestion, verify the data appears in the dashboard:

1. **Check dashboard**: https://graph.croutons.ai/dashboard.html
   - Should show croutons count > 0
   - Search for "bkk_massage" or "MassageShop"

2. **Query via API**:
   ```bash
   curl "https://graph.croutons.ai/api/facts?corpus_id=bkk_massage&limit=10" | jq
   ```

3. **Check feeds**:
   ```bash
   curl "https://graph.croutons.ai/feeds/croutons.ndjson" | grep "bkk_massage" | head -5
   ```

## Troubleshooting

### Error: "Invalid HMAC signature"

**Cause**: Wrong `PUBLISH_HMAC_KEY` or missing environment variable

**Fix**:
```bash
# Get the correct key from Railway
# Then set it:
export PUBLISH_HMAC_KEY="correct-key-here"
```

### Error: "HTTP 401: Unauthorized"

**Cause**: HMAC signature validation failed

**Fix**: Check that `PUBLISH_HMAC_KEY` matches the graph service's environment variable

### Error: "HTTP 500: Internal Server Error"

**Cause**: Graph service database issue or malformed data

**Fix**: Check graph service logs in Railway dashboard

### No records inserted

**Cause**: Factlet format doesn't match graph service expectations

**Fix**: Check that records have:
- `@type: "Factlet"`
- `fact_id` or `@id`
- `page_id`
- `claim` or `text`

## Next Steps

After successful ingestion:

1. **Verify in dashboard**: Check that croutons appear
2. **Test precog**: Query `bkk_massage` precog to see if it can query graph
3. **Monitor**: Check graph service logs for any errors

## Notes

- **Idempotent**: Re-running ingestion will update existing croutons (ON CONFLICT DO UPDATE)
- **Batch processing**: Files are ingested one at a time with 500ms delay
- **Error handling**: If one file fails, others continue processing
- **Metadata preserved**: Original corpus fields are stored in `metadata` field

