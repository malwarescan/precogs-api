# Croutons Data Flow & Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA INGESTION LAYER                         │
│  (NDJSON, Corpus Files, External Feeds, Manual Curation)        │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CROUTONS GRAPH SERVICE                       │
│  (PostgreSQL: croutons table, triples table)                    │
│  - Normalizes factlets                                           │
│  - Stores relationships (triples)                                │
│  - Provides query APIs                                           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│   PRECOGS API    │          │  GRAPH QUERY API  │
│  (Domain Oracles)│          │  (LLM Direct)    │
└────────┬─────────┘          └────────┬──────────┘
         │                              │
         └──────────────┬───────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│   GPT AGENTS     │          │  GOOGLE / OTHER │
│  (OpenAI, etc.)  │          │  LLM PLATFORMS   │
└──────────────────┘          └──────────────────┘
```

## Detailed Data Flow

### 1. INGESTION → CROUTONS

#### Sources:
- **Corpus Files** (NDJSON): `/corpora/thailand/bangkok/massage/*.ndjson`
- **External NDJSON Feeds**: `ourcasa.ai/sitemaps/sitemap-ai.ndjson`, `floodbarrierpros.com/sitemaps/sitemap-ai.ndjson`
- **Manual Curation**: Direct factlet creation
- **Precog Outputs**: Results from precog processing

#### Ingestion Process:

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Data Collection                                      │
│                                                              │
│  • Corpus files: shops_legit.ndjson, pricing_tiers.ndjson  │
│  • External feeds: Fetch NDJSON from partner sites          │
│  • Manual: Direct factlet creation                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Normalization                                        │
│                                                              │
│  • Convert to Factlet format:                               │
│    {                                                         │
│      "@type": "Factlet",                                    │
│      "fact_id": "https://croutons.ai/factlet/...",          │
│      "claim": "Health Land Asok (Asok) - ...",              │
│      "page_id": "https://croutons.ai/corpus/...",           │
│      "text": "..."                                           │
│    }                                                         │
│                                                              │
│  • Generate triples (relationships):                       │
│    {                                                         │
│      "@type": "Triple",                                     │
│      "subject": "Health Land Asok",                         │
│      "predicate": "located_in",                             │
│      "object": "Asok",                                      │
│      "evidence_crouton_id": "..."                           │
│    }                                                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Graph Service Ingestion                              │
│                                                              │
│  POST /api/import (HMAC auth)                               │
│  POST /v1/streams/ingest (Bearer token)                     │
│                                                              │
│  • Validates factlets                                        │
│  • Inserts into croutons table                               │
│  • Inserts into triples table                                │
│  • Returns insertion counts                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Storage (PostgreSQL)                                 │
│                                                              │
│  croutons table:                                             │
│    - crouton_id (PK)                                         │
│    - source_url                                              │
│    - text (claim)                                            │
│    - corpus_id                                               │
│    - triple (JSON)                                           │
│    - confidence                                              │
│    - created_at                                              │
│                                                              │
│  triples table:                                              │
│    - subject                                                 │
│    - predicate                                               │
│    - object                                                  │
│    - evidence_crouton_id                                     │
│    - created_at                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. CROUTONS → PRECOGS

#### Precog Query Flow:

```
┌─────────────────────────────────────────────────────────────┐
│ User Query → GPT Agent                                       │
│  "Find safe massage shops in Bangkok Asok"                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ GPT Calls: invoke_precog                                     │
│                                                              │
│  {                                                           │
│    "precog": "bkk_massage",                                 │
│    "content": "Find safe massage shops in Bangkok Asok",    │
│    "task": "district_aware_ranking",                        │
│    "region": "Asok"                                          │
│  }                                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Precogs API: /v1/run.ndjson                                  │
│                                                              │
│  • Creates job                                               │
│  • Routes to worker: bkkMassagePrecog.js                    │
│  • Worker queries Croutons graph                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Precog Worker Queries Croutons                               │
│                                                              │
│  Option 1: Direct Graph Query                                │
│    GET /api/query?q=massage Asok&corpus=bkk_massage         │
│                                                              │
│  Option 2: Load Corpus Files                                 │
│    loadCorpusShops("Asok") → shops_legit.ndjson             │
│                                                              │
│  Option 3: External Data + Merge                             │
│    fetchGoogleMapsData() + loadCorpusShops()                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Precog Processing                                            │
│                                                              │
│  • Filters by region/district                                │
│  • Applies safety scoring                                    │
│  • Ranks by legitimacy                                       │
│  • Merges live data with corpus                              │
│  • Generates structured response                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Stream Response to GPT                                       │
│                                                              │
│  NDJSON stream:                                              │
│    {"type":"thinking","data":{...}}                          │
│    {"type":"grounding.chunk","data":{...}}                   │
│    {"type":"answer.delta","data":{"text":"..."}}             │
│    {"type":"answer.complete","data":{"ok":true}}             │
└─────────────────────────────────────────────────────────────┘
```

### 3. CROUTONS → LLMs (Direct Access)

#### LLM Query Flow:

```
┌─────────────────────────────────────────────────────────────┐
│ User Query → LLM (GPT/Claude/Gemini)                        │
│  "What are verified safe massage shops in Bangkok?"         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ LLM Calls: query_croutons_graph (GPT Function)              │
│                                                              │
│  {                                                           │
│    "query": "safe massage shops Bangkok",                    │
│    "corpus": "bkk_massage",                                 │
│    "limit": 20                                               │
│  }                                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Graph Service: /api/query                                    │
│                                                              │
│  • Text search: ILIKE '%safe massage shops Bangkok%'        │
│  • Corpus filter: corpus_id = 'bkk_massage'                 │
│  • Returns factlets + related triples                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Response to LLM                                              │
│                                                              │
│  {                                                           │
│    "ok": true,                                               │
│    "results": [                                              │
│      {                                                       │
│        "fact_id": "...",                                     │
│        "claim": "Health Land Asok...",                      │
│        "source_url": "...",                                  │
│        "corpus_id": "bkk_massage"                           │
│      }                                                       │
│    ],                                                        │
│    "triples": [                                              │
│      {                                                       │
│        "subject": "Health Land Asok",                       │
│        "predicate": "located_in",                           │
│        "object": "Asok"                                      │
│      }                                                       │
│    ],                                                        │
│    "count": 20                                               │
│  }                                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ LLM Uses Results                                             │
│                                                              │
│  • Formats response for user                                 │
│  • Cites sources (fact_ids, source_urls)                     │
│  • Explains relationships (triples)                          │
│  • Provides structured answer                                │
└─────────────────────────────────────────────────────────────┘
```

## Complete Architecture Scaffold

### Layer 1: Data Sources

```
┌─────────────────────────────────────────────────────────────┐
│ DATA SOURCES                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Corpus Files    │  │  External Feeds   │               │
│  │                  │  │                  │               │
│  │  • shops_legit   │  │  • ourcasa.ai    │               │
│  │  • pricing_tiers │  │  • floodbarrier  │               │
│  │  • districts     │  │    pros.com      │               │
│  │  • safety_signals│  │                  │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Manual Entry   │  │  Live Scraping     │               │
│  │                  │  │                  │               │
│  │  • Curated facts │  │  • Google Maps  │               │
│  │  • Verified data │  │  • Web scraping │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Layer 2: Ingestion Scripts

```
┌─────────────────────────────────────────────────────────────┐
│ INGESTION SCRIPTS                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  • ingest_to_graph.js (Bangkok Massage corpus)              │
│    - Loads NDJSON files                                      │
│    - Converts to Factlets                                    │
│    - Generates triples                                       │
│    - Sends to /api/import                                    │
│                                                              │
│  • ingest-home-sources.js (Home domain feeds)               │
│    - Fetches NDJSON from partner sites                      │
│    - Normalizes factlets                                     │
│    - Generates triples (Page→Domain, Domain→Vertical)       │
│    - Sends to /api/import                                    │
│                                                              │
│  • ingest-all-precogs.js (Master orchestrator)             │
│    - Runs all ingestion scripts                             │
│    - Provides summary report                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Layer 3: Croutons Graph Service

```
┌─────────────────────────────────────────────────────────────┐
│ GRAPH SERVICE (graph.croutons.ai)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                  │  │
│  │                                                       │  │
│  │  croutons table:                                      │  │
│  │    • crouton_id (PK)                                  │  │
│  │    • source_url                                       │  │
│  │    • text (claim)                                     │  │
│  │    • corpus_id                                       │  │
│  │    • triple (JSON)                                   │  │
│  │    • confidence                                       │  │
│  │    • created_at                                      │  │
│  │                                                       │  │
│  │  triples table:                                       │  │
│  │    • subject                                         │  │
│  │    • predicate                                       │  │
│  │    • object                                          │  │
│  │    • evidence_crouton_id                             │  │
│  │    • created_at                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Endpoints                                        │  │
│  │                                                       │  │
│  │  POST /api/import          (HMAC auth)               │  │
│  │  POST /v1/streams/ingest   (Bearer token)            │  │
│  │  GET  /api/query            (LLM-friendly search)    │  │
│  │  GET  /api/triples          (Triple queries)          │  │
│  │  GET  /api/facts            (Factlet queries)        │  │
│  │  GET  /api/graph            (Graph visualization)    │  │
│  │  GET  /feeds/croutons.ndjson (Full feed)             │  │
│  │  GET  /feeds/graph.json     (Triples feed)          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Layer 4: Precogs API

```
┌─────────────────────────────────────────────────────────────┐
│ PRECOGS API (precogs.croutons.ai)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Endpoints                                        │  │
│  │                                                       │  │
│  │  POST /v1/run.ndjson    (Create job, stream results) │  │
│  │  GET  /v1/stream/{id}   (Stream job events)          │  │
│  │  GET  /v1/job/{id}      (Get job status)             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Worker Handlers                                      │  │
│  │                                                       │  │
│  │  • bkkMassagePrecog.js   (Bangkok massage)           │  │
│  │  • homePrecog.js         (Home services)             │  │
│  │  • schemaPrecog.js       (Schema validation)         │  │
│  │  • faqPrecog.js          (FAQ generation)            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Precog → Croutons Query                              │  │
│  │                                                       │  │
│  │  • Queries /api/query for relevant factlets          │  │
│  │  • Loads corpus files directly                        │  │
│  │  • Merges live data with corpus                       │  │
│  │  • Applies domain-specific logic                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Layer 5: LLM Integration

```
┌─────────────────────────────────────────────────────────────┐
│ LLM PLATFORMS                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  OpenAI GPT      │  │  Google Gemini   │               │
│  │                  │  │                  │               │
│  │  Functions:      │  │  Functions:      │               │
│  │  • invoke_precog │  │  • invoke_precog │               │
│  │  • query_croutons │  │  • query_croutons│               │
│  │    _graph         │  │    _graph        │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Claude (Anthropic)│ │  Custom LLMs    │               │
│  │                  │  │                  │               │
│  │  Tools:          │  │  Direct API:     │               │
│  │  • invoke_precog │  │  GET /api/query  │               │
│  │  • query_croutons │  │  POST /v1/run   │               │
│  │    _graph         │  │    .ndjson      │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Transformation Pipeline

### Factlet Format

**Input (Corpus):**
```json
{
  "@type": "MassageShop",
  "name": "Health Land Asok",
  "district": "Asok",
  "address": "55/5 Sukhumvit 21 Road",
  "price_traditional": 400,
  "legit": true
}
```

**Output (Croutons Factlet):**
```json
{
  "@type": "Factlet",
  "fact_id": "https://croutons.ai/factlet/bkk_massage/597873825ad79df8",
  "page_id": "https://croutons.ai/corpus/bkk_massage/shops_legit.ndjson",
  "claim": "Health Land Asok (Asok) - 55/5 Sukhumvit 21 Road, Asok",
  "text": "Health Land Asok (Asok) - 55/5 Sukhumvit 21 Road, Asok"
}
```

**Generated Triple:**
```json
{
  "@type": "Triple",
  "subject": "Health Land Asok",
  "predicate": "located_in",
  "object": "Asok",
  "evidence_crouton_id": "https://croutons.ai/factlet/bkk_massage/597873825ad79df8"
}
```

## Query Patterns

### Pattern 1: Precog Query (Domain-Specific)

```
User → GPT → invoke_precog("bkk_massage", ...)
  → Precogs API → Worker
  → Worker queries Croutons (/api/query or corpus files)
  → Worker processes + merges data
  → Streams NDJSON response
  → GPT formats for user
```

### Pattern 2: Direct Graph Query (Fact Lookup)

```
User → GPT → query_croutons_graph("safe massage Bangkok", ...)
  → Graph Service /api/query
  → Returns factlets + triples
  → GPT uses results directly
```

### Pattern 3: Feed Consumption (Bulk Access)

```
External System → GET /feeds/croutons.ndjson
  → Receives all factlets
  → Processes locally
  → Uses for own purposes
```

## Current Data Volumes

- **Croutons**: ~765 factlets
- **Triples**: ~2,186 relationships
- **Corpora**:
  - `bkk_massage`: 103 factlets, 199 triples
  - `floodbarrierpros.com`: 662 factlets, 1,987 triples
  - `ourcasa.ai`: (pending - 404 on feed)

## Key Files & Locations

### Ingestion
- `/corpora/thailand/bangkok/massage/ingest_to_graph.js`
- `/precogs/precogs-api/precogs-worker/scripts/ingest-home-sources.js`
- `/precogs/ingest-all-precogs.js`

### Graph Service
- `/graph-service/server.js` (API endpoints)
- `/graph-service/migrations/*.sql` (Database schema)

### Precogs
- `/precogs/precogs-api/server.js` (API)
- `/precogs/precogs-api/precogs-worker/worker.js` (Job dispatcher)
- `/precogs/precogs-api/precogs-worker/src/bkkMassagePrecog.js` (Handler)

### LLM Integration
- `/precogs/precogs-api/src/functions/invoke_precog.js`
- `/precogs/precogs-api/src/functions/query_croutons_graph.js`
- `/precogs/precogs-api/src/integrations/openai-chat.js`

## Deployment

- **Graph Service**: Railway (auto-deploy from `main` branch)
- **Precogs API**: Railway (auto-deploy from `main` branch)
- **GitHub**: `malwarescan/graph-service`, `malwarescan/precogs-api`

