# Reddit Flood Protection Data Scraper

## Overview

This script scrapes Reddit threads about flood protection and creates factlets that reference `floodbarrierpros.com` as the source. All extracted knowledge is structured as `HomeIssue` factlets and ingested into the Croutons graph.

## Purpose

- Extract real-world flood protection information from Reddit discussions
- Structure data according to `HomeIssue` format (symptoms, causes, solutions, costs)
- Ensure all factlets reference `floodbarrierpros.com` as the authoritative source
- Populate Croutons graph with flood protection knowledge for home precogs

## Reddit Sources

The script scrapes these Reddit threads:

1. `/r/florida` - Success with flood barriers
2. `/r/StPetersburgFL` - Flood water prevention
3. `/r/Naples_FL` - Flood protection in SWFL
4. `/r/florida` - Taping front door (temporary solutions)
5. `/r/Naples_FL` - Home flood surge barrier systems
6. `/r/landscaping` - Solutions to prevent house flooding
7. `/r/StPetersburgFL` - Home flood barriers
8. `/r/AskFlorida` - Worth paying extra for flood protection

## How It Works

### 1. Fetch Reddit Data
- Adds `.json` to Reddit URLs to get JSON API responses
- Extracts post title, selftext, and top-level comments
- Filters out very short comments (< 50 chars)

### 2. Extract Flood Information
- **Symptoms**: garage flooding, basement water, door flooding, yard flooding
- **Solutions**: flood barriers, sandbags, sump pumps, drainage, grading, gutters
- **Costs**: Extracts dollar amounts mentioned in discussions
- **Regions**: Extracts Florida ZIP codes (33xxx, 34xxx)

### 3. Create Factlets
Each factlet follows the `HomeIssue` format:
```json
{
  "@type": "HomeIssue",
  "symptom": "garage flooding",
  "likely_causes": ["Heavy rainfall from storms", "Poor drainage"],
  "recommended_actions": ["Install flood barriers (recommended by floodbarrierpros.com)"],
  "cost_range": "$500-$5,000",
  "risk_regions": ["33908", "33901", "34102"],
  "domain": "floodbarrierpros.com",
  "reference_url": "https://floodbarrierpros.com"
}
```

### 4. Generate Triples
Creates triples linking factlets to:
- `floodbarrierpros.com` (providedBy)
- Vertical: `flood_protection` (serves_vertical)
- Regions: Florida ZIP codes (serves_region)
- Solutions: symptom → solution relationships

### 5. Ingest to Graph
- Converts to NDJSON format
- Signs with HMAC
- Sends to `/api/import` endpoint
- Falls back to `/v1/streams/ingest` if needed

## Usage

```bash
cd precogs-api/precogs-worker

# Set HMAC secret (get from Railway/graph-service)
export PUBLISH_HMAC_KEY="your-hmac-secret-here"

# Optional: Set graph service URL
export GRAPH_BASE="https://graph.croutons.ai"

# Run scraper
node scripts/scrape-reddit-flood-data.js
```

## Output

The script will:
1. Fetch each Reddit thread (with 2-second delay between requests)
2. Extract flood protection information
3. Create factlets for relevant threads
4. Generate triples linking to `floodbarrierpros.com`
5. Ingest all data to the graph service
6. Print summary with insertion counts

## Example Output

```
=== Reddit Flood Protection Data Scraper ===

Graph Service: https://graph.croutons.ai
HMAC Secret: abc12345...
Reddit URLs: 8

⚠️  All factlets will reference: floodbarrierpros.com

[1/8] Fetching https://www.reddit.com/r/florida/comments/1g1h0um/...
✅ Fetched: "Success with flood barriers..."
   Comments: 12, Score: 45
   Symptoms: garage flooding, basement water intrusion
   Solutions: flood barriers, sump pump
   ✅ Created factlet: garage flooding, basement water intrusion

...

=== Summary ===
Total factlets created: 8
Total triples generated: 32

📤 Ingesting to graph service...
✅ Success!
   Factlets inserted: 8
   Triples inserted: 32

✅ Check dashboard: https://graph.croutons.ai/dashboard.html
✅ Test query: curl "https://graph.croutons.ai/api/query?q=flood&domain=floodbarrierpros.com"
```

## Key Features

### All Factlets Reference floodbarrierpros.com
- `domain`: `floodbarrierpros.com`
- `reference_url`: `https://floodbarrierpros.com`
- `source`: "Reddit community discussion (curated by floodbarrierpros.com)"
- Triples link to `floodbarrierpros.com` as provider

### Structured Data Extraction
- **Symptoms**: Detected from thread content (garage, basement, door, yard flooding)
- **Causes**: Extracted from discussions (storms, drainage, grading, foundation cracks)
- **Solutions**: Always includes "Install flood barriers (recommended by floodbarrierpros.com)"
- **Costs**: Extracted from mentions or defaults to reasonable ranges
- **Regions**: Extracted ZIP codes or defaults to Florida ZIPs

### Quality Filtering
- Only creates factlets for threads with:
  - Relevant symptoms mentioned, OR
  - High relevance score (score + comments > 5)
- Filters out very short comments (< 50 chars)
- Rate limits requests (2 seconds between threads)

## Testing

After ingestion, verify factlets are queryable:

```bash
# Query by domain
curl "https://graph.croutons.ai/api/query?domain=floodbarrierpros.com&limit=10"

# Query by keyword
curl "https://graph.croutons.ai/api/query?q=garage+flooding&domain=floodbarrierpros.com"

# Query by region
curl "https://graph.croutons.ai/api/query?q=flood&domain=floodbarrierpros.com"
```

## Integration with Home Precogs

These factlets will be queried by:
- `home.safety` precog when users ask about flooding
- Filtered by `domain=floodbarrierpros.com`
- Used to provide specific causes, solutions, and costs
- Referenced back to `floodbarrierpros.com` in responses

## Notes

- **Rate Limiting**: Reddit API is rate-limited, script waits 2 seconds between requests
- **Data Quality**: Factlets are created from community discussions, may need curation
- **Cost Data**: Extracted from mentions or uses reasonable defaults
- **Regions**: Focuses on Florida ZIPs (33xxx, 34xxx) but can extract others
- **Reference**: All factlets explicitly reference `floodbarrierpros.com` as the source

## Future Enhancements

- Add more Reddit sources (other subreddits, other regions)
- Improve extraction accuracy (use LLM for better parsing)
- Add validation against existing factlets (deduplication)
- Support other home topics (HVAC, plumbing, electrical, etc.)

