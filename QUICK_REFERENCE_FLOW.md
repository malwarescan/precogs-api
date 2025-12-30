# Quick Reference: Data Flow

## Simple Flow Diagram

```
┌─────────────┐
│ DATA SOURCE │  (NDJSON files, external feeds, manual entry)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  INGESTION  │  (ingest_to_graph.js, ingest-home-sources.js)
│   SCRIPT    │  • Converts to Factlets
└──────┬──────┘  • Generates Triples
       │         • Sends to Graph Service
       ▼
┌─────────────┐
│   CROUTONS  │  (PostgreSQL: croutons + triples tables)
│    GRAPH    │  • Stores factlets
└──────┬──────┘  • Stores relationships
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│ PRECOGS  │   │  QUERY   │   │  FEEDS   │
│   API    │   │   API    │   │  (NDJSON)│
└────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │
     └──────┬───────┴──────┬───────┘
            │               │
            ▼               ▼
     ┌──────────┐    ┌──────────┐
     │   GPT    │    │  GOOGLE   │
     │  AGENTS   │    │  /OTHER  │
     └───────────┘    └──────────┘
```

## Data Transformation

```
Raw Data → Factlet → Triple → Graph → Query → LLM
```

**Example:**
```
{"name":"Health Land","district":"Asok"}
  ↓
{"@type":"Factlet","fact_id":"...","claim":"Health Land (Asok)"}
  ↓
{"subject":"Health Land","predicate":"located_in","object":"Asok"}
  ↓
[Stored in PostgreSQL]
  ↓
GET /api/query?q=massage Asok
  ↓
[Returns factlets + triples]
  ↓
GPT uses results to answer user
```

## Key Endpoints

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `POST /api/import` | Ingest factlets + triples | HMAC |
| `POST /v1/streams/ingest` | Ingest (alternative) | Bearer |
| `GET /api/query` | LLM-friendly search | None |
| `GET /api/triples` | Query relationships | None |
| `GET /feeds/croutons.ndjson` | Full factlet feed | None |
| `POST /v1/run.ndjson` | Invoke precog | None |

## GPT Functions

1. **`invoke_precog`** - Domain-specific analysis
   - Routes to precog worker
   - Worker queries Croutons
   - Returns processed results

2. **`query_croutons_graph`** - Direct fact lookup
   - Queries `/api/query`
   - Returns factlets + triples
   - No processing, raw data

## File Locations

- **Ingestion**: `/corpora/*/ingest_to_graph.js`
- **Graph Service**: `/graph-service/server.js`
- **Precogs**: `/precogs/precogs-api/`
- **LLM Functions**: `/precogs/precogs-api/src/functions/`

## Quick Commands

```bash
# Ingest corpus
node corpora/thailand/bangkok/massage/ingest_to_graph.js

# Ingest all precogs
node precogs/ingest-all-precogs.js

# Query graph
curl "https://graph.croutons.ai/api/query?q=YOUR_QUERY"

# Check dashboard
open https://graph.croutons.ai/dashboard.html
```

