# Reddit Scraper Quick Start

## What This Does

Scrapes 8 Reddit threads about flood protection and creates factlets that **all reference floodbarrierpros.com** as the source.

## Quick Run

```bash
cd precogs-api/precogs-worker
export PUBLISH_HMAC_KEY="your-secret-here"
node scripts/scrape-reddit-flood-data.js
```

## What Gets Created

- **Factlets**: HomeIssue format with symptoms, causes, solutions, costs
- **Triples**: Links factlets → floodbarrierpros.com → flood_protection vertical
- **All data tagged**: domain=floodbarrierpros.com, reference_url=https://floodbarrierpros.com

## Reddit Sources

1. `/r/florida` - Success with flood barriers
2. `/r/StPetersburgFL` - Flood water prevention  
3. `/r/Naples_FL` - Flood protection in SWFL
4. `/r/florida` - Taping front door
5. `/r/Naples_FL` - Home flood surge barrier systems
6. `/r/landscaping` - Solutions to prevent flooding
7. `/r/StPetersburgFL` - Home flood barriers
8. `/r/AskFlorida` - Worth paying extra for flood protection

## Verify It Worked

```bash
# Check dashboard
open https://graph.croutons.ai/dashboard.html

# Query factlets
curl "https://graph.croutons.ai/api/query?q=flood&domain=floodbarrierpros.com&limit=5"
```

## Key Point

**All factlets reference floodbarrierpros.com** - even though data comes from Reddit, the source is always `floodbarrierpros.com`.

