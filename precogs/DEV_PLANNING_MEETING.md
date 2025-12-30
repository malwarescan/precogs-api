# Dev Planning Meeting: Precogs Invocation & Knowledge-Base Architecture

**Date:** TBD  
**Duration:** 60 minutes  
**Attendees:** Dev Team, Backend Lead, Architect, Product Owner

---

## 1. Current State / Recap (5 minutes)

### What We've Built

**API Endpoints:**
- ✅ `/v1/invoke` - Create job, enqueue to Redis Stream
- ✅ `/v1/jobs/:id/events` - SSE stream for job events
- ✅ `/v1/run.ndjson` - Single-endpoint NDJSON stream (creates job + streams)
- ✅ `/v1/metrics` - Operational metrics (processed_total, failed_total, inflight_jobs, redis_lag_ms, build_sha)
- ✅ `/health` & `/health/redis` - Health checks

**User Interfaces:**
- ✅ `/runtime/auto.html` - Auto-run page with SSE
- ✅ `/runtime/ndjson.html` - NDJSON viewer
- ✅ `/runtime/cli.html` - Terminal-style CLI interface
- ✅ `/cli` - Convenience redirect to CLI viewer
- ✅ `/run` - Convenience redirect to NDJSON endpoint

**Infrastructure:**
- ✅ PostgreSQL database (jobs, events tables)
- ✅ Redis Streams (job queue)
- ✅ Worker service skeleton (precogs-worker)
- ✅ Database migrations
- ✅ Railway deployment ready

**Features:**
- ✅ Bearer token authentication (optional via API_KEY)
- ✅ Rate limiting (60 req/min per IP)
- ✅ SSE keep-alive heartbeat (15s intervals)
- ✅ Worker retry logic with exponential backoff
- ✅ Dead letter queue for failed jobs
- ✅ Graceful shutdown handling
- ✅ CORS restriction in production

### Vision Recap

**Goal:** Developer or user clicks link → system uses niche knowledge-base → real-time insights streamed live.

**Current Flow:**
1. User opens URL (e.g., `/cli?precog=schema&task=...`)
2. Page auto-invokes `/v1/invoke` or `/v1/run.ndjson`
3. Job created in database (status: pending)
4. Job enqueued to Redis Stream
5. Worker picks up job, processes it
6. Events streamed back via SSE/NDJSON
7. User sees live terminal output

### Current Friction Points Identified

1. **No knowledge base integration yet** - Worker has placeholder logic
2. **Limited precog types** - Only "schema" placeholder implemented
3. **No domain-specific knowledge bases** - Missing `kb` parameter
4. **Worker processing is stub** - Needs actual precog logic
5. **No text-menu endpoint** - ChatGPT can't see options before invoking
6. **No VS Code/Cursor integration** - Dev tooling missing

---

## 2. Vision for Invocation + Knowledge Base (10 minutes)

### Proposed URL Syntax

```
https://precogs.croutons.ai/run
  ?kb=<knowledgeBase>        # e.g., siding-services, cladding
  &precog=<precog>           # e.g., schema, faq, pricing
  &url=<targetURL>           # URL to analyze
  &type=<type>              # Optional context type
  &task=<task>              # Task description
  &token=<apiKey>           # Optional auth
```

**Example:**
```
https://precogs.croutons.ai/cli
  ?kb=siding-services
  &precog=schema
  &url=https://www.hoosiercladding.com/services/siding-installation
  &type=Service
  &task=Generate%20JSON-LD
```

### Knowledge Base Architecture

**Per-Domain Knowledge Bases:**
- `siding-services` - Domain-specific docs for siding installation services
- `cladding` - Cladding industry knowledge
- `general` - General-purpose knowledge base
- Future: Add more domains as needed

**Storage Options:**
- Vector store (embeddings) for semantic search
- Document store for raw content
- Embedding model for query matching
- Retrieval system to fetch relevant docs

### Worker Flow

```
1. Receive job from Redis Stream
2. Extract: kb, precog, url, task, context
3. Fetch target URL content
4. Query knowledge base (kb) for relevant docs
5. Retrieve top-k relevant documents
6. Generate reasoning using:
   - Target URL content
   - Knowledge base documents
   - Precog-specific logic
7. Stream events:
   - grounding.chunk (KB docs retrieved)
   - reasoning.delta (step-by-step reasoning)
   - answer.delta (final answer chunks)
   - answer.complete (done)
8. Update job status in database
```

### Goals

- **Low friction:** One-click URL invocation
- **Easy click:** Shareable links that work anywhere
- **Live stream:** Real-time results as they're generated
- **Domain-specific:** Knowledge bases tailored to use cases

---

## 3. Architecture & Component Breakdown (15 minutes)

### Component 1: Invocation Endpoint

**Current:** `/v1/run.ndjson` handles both job creation and streaming

**Proposed Parameters:**
- `kb` (required) - Knowledge base identifier
- `precog` (required) - Precog type (schema, faq, pricing, etc.)
- `url` (required) - Target URL to analyze
- `type` (optional) - Context type (Service, Product, etc.)
- `task` (optional) - Task description/prompt
- `token` (optional) - API key for authentication

**Decisions Needed:**
- Should `kb` be required or default to "general"?
- How to validate `kb` exists?
- Should we support multiple `kb` values (union)?

### Component 2: Knowledge Base Storage & Retrieval

**Storage Options:**

**Option A: Vector Database (Recommended)**
- Use: Pinecone, Weaviate, Qdrant, or pgvector (PostgreSQL extension)
- Embeddings: OpenAI, Cohere, or open-source models
- Pros: Semantic search, scalable, industry standard
- Cons: Additional service, embedding costs

**Option B: PostgreSQL Full-Text Search**
- Use: PostgreSQL `tsvector` + `tsquery`
- Pros: No additional service, already have PostgreSQL
- Cons: Less semantic, keyword-based only

**Option C: Hybrid**
- Vector store for semantic search
- PostgreSQL for metadata and full-text fallback

**Retrieval Strategy:**
- Query knowledge base with: `url` domain, `type`, `task` keywords
- Return top-k documents (e.g., k=5-10)
- Include relevance scores
- Cache frequently accessed docs

**Decisions Needed:**
- Which vector database?
- Which embedding model?
- Chunk size for documents?
- Retrieval limit (top-k)?
- Caching strategy?

### Component 3: Job Processing / Worker

**Current State:**
- Worker skeleton exists
- Consumer group: `cg1` on stream `precogs:jobs`
- Retry logic with exponential backoff
- Dead letter queue for failures

**Needed Implementation:**
- Fetch target URL content (with retries, timeout)
- Query knowledge base for relevant docs
- Implement precog-specific logic:
  - `schema` - Generate/validate JSON-LD
  - `faq` - Extract FAQ items
  - `pricing` - Extract pricing information
  - Future precogs...
- Stream events progressively
- Handle errors gracefully

**Decisions Needed:**
- URL fetching timeout?
- KB query timeout?
- Max document retrieval?
- Streaming chunk size?
- Error handling strategy?

### Component 4: Streaming Interface

**Current Options:**
- ✅ CLI interface (`/cli`) - Terminal-style, ChatGPT-friendly
- ✅ NDJSON (`/v1/run.ndjson`) - Raw stream for power users
- ✅ SSE (`/v1/jobs/:id/events`) - EventSource-compatible

**Proposed Addition:**
- `/v1/suggest` - Text menu endpoint for ChatGPT
  - Returns available options before invocation
  - Shows available knowledge bases
  - Shows available precog types
  - Shows example URLs/tasks

**Decisions Needed:**
- Which interface for which use case?
- Should we add interactive menu to CLI?
- How to handle multiple streaming formats?

### Component 5: Authentication & Rate Limiting

**Current:**
- Bearer token auth (optional via `API_KEY`)
- Rate limiting: 60 req/min per IP
- Token in query param for SSE compatibility

**Proposed:**
- Keep current model (optional auth)
- Add per-token rate limits (if token provided)
- Add per-knowledge-base rate limits
- Add abuse detection

**Decisions Needed:**
- Should auth be required for production?
- Rate limits per KB?
- Rate limits per precog type?
- Abuse detection thresholds?

### Component 6: Deployment & Operations

**Current:**
- Railway deployment
- Separate services: precogs-api, precogs-worker
- Shared PostgreSQL and Redis
- Metrics endpoint for monitoring

**Proposed:**
- Add knowledge base ingestion service (separate or same worker?)
- Add monitoring/alerting
- Add log aggregation
- Add performance tracking

**Decisions Needed:**
- Separate KB ingestion service?
- How to deploy KB updates?
- Monitoring/alerting tools?
- Log aggregation solution?

---

## 4. Focusing on Friction Reduction (10 minutes)

### Current Friction Points

1. **No knowledge base** - Can't actually use domain knowledge yet
2. **Placeholder worker logic** - Doesn't do real processing
3. **No menu/options** - ChatGPT can't see what's available
4. **Manual KB setup** - No clear process for adding knowledge bases
5. **No dev tooling** - Can't integrate into VS Code/Cursor easily

### Simplification Strategies

**One-Click URL Invocation:**
- ✅ Already implemented (`/cli`, `/run`)
- ✅ Auto-invokes on page load
- ✅ Streams results live

**Minimal Configuration:**
- Default `kb` to "general" if not specified
- Sensible defaults for all parameters
- Clear error messages if KB doesn't exist

**Clear User Experience:**
- CLI interface shows what's happening
- Progress indicators (grounding → reasoning → answer)
- Clear completion status

**MVP Prioritization:**

**Phase 1 (MVP):**
- ✅ URL invocation (done)
- ✅ Streaming interface (done)
- ⏳ Text-menu endpoint (`/v1/suggest`)
- ⏳ Single knowledge base ("general")
- ⏳ Basic worker logic (fetch URL, simple processing)

**Phase 2:**
- Multiple knowledge bases
- Domain-specific KBs
- Advanced precog types

**Phase 3:**
- VS Code/Cursor integration
- Function-call API
- Advanced dev tooling

---

## 5. Plan & Roadmap (10 minutes)

### Phase 1: Text-Menu + Basic KB (Weeks 1-2)

**Deliverables:**
- `/v1/suggest` endpoint - Returns available options
- Single "general" knowledge base
- Basic worker implementation:
  - Fetch URL content
  - Simple document retrieval
  - Basic precog processing
- Documentation for adding KB documents

**Success Metrics:**
- ChatGPT can see menu options
- Can invoke and stream results
- Worker processes jobs successfully
- < 30s end-to-end latency

**Owner:** Backend Lead + 1 Dev

### Phase 2: Full KB Integration (Weeks 3-4)

**Deliverables:**
- Multiple knowledge bases (siding-services, cladding, etc.)
- Vector database integration
- Embedding-based retrieval
- Domain-specific precog logic
- KB ingestion pipeline

**Success Metrics:**
- 3+ knowledge bases available
- KB queries return relevant docs
- Domain-specific results improve quality
- < 20s end-to-end latency

**Owner:** Backend Lead + Architect

### Phase 3: Deep Dev Tooling (Weeks 5-6)

**Deliverables:**
- VS Code extension
- Cursor integration
- Function-call API
- Advanced CLI features (interactive menus)
- Developer documentation

**Success Metrics:**
- Devs can invoke from editor
- Function-call API works reliably
- Documentation complete
- 10+ active dev users

**Owner:** Dev Team + Product Owner

### Success Metrics Overall

- **Usage:** Number of invocation links clicked
- **Latency:** End-to-end job completion time
- **Reliability:** Worker job completion rate (> 95%)
- **Error Rate:** Failed jobs / total jobs (< 5%)
- **User Satisfaction:** Feedback from ChatGPT users

---

## 6. Risks & Dependencies (5 minutes)

### Risk 1: Knowledge Base Ingestion

**Risk:** Who builds it? How do we maintain it?

**Mitigation:**
- Start with manual ingestion (markdown files)
- Build simple ingestion API
- Document process clearly
- Assign KB owner per domain

**Owner:** Product Owner + Backend Lead

### Risk 2: Worker Scale/Latency

**Risk:** Streaming jobs may have delay, especially with KB queries

**Mitigation:**
- Set clear latency targets
- Implement caching for KB queries
- Optimize embedding queries
- Monitor and alert on latency

**Owner:** Backend Lead

### Risk 3: Security

**Risk:** Controlling access, preventing abuse

**Mitigation:**
- Rate limiting (already implemented)
- Optional authentication
- Monitor for abuse patterns
- Add IP blocking if needed

**Owner:** Backend Lead

### Risk 4: Team Capacity

**Risk:** Dev hours vs other work

**Mitigation:**
- Prioritize MVP features
- Defer non-critical features
- Consider external help for KB ingestion
- Clear scope boundaries

**Owner:** Product Owner

### Dependencies

- Vector database selection and setup
- Embedding model selection
- Knowledge base content creation
- URL fetching reliability
- Worker processing logic

---

## 7. Next Steps & Actions (5 minutes)

### Immediate Actions (This Week)

1. **Decide on vector database** - Research and choose (Pinecone, Weaviate, pgvector)
2. **Design KB schema** - Document structure, metadata fields
3. **Build `/v1/suggest` endpoint** - Text menu for ChatGPT
4. **Implement basic worker logic** - Fetch URL, simple processing
5. **Create "general" KB** - Initial knowledge base with sample docs

### Owners

- **Invocation endpoint:** Backend Lead
- **KB model/schema:** Architect
- **Worker implementation:** Backend Lead + 1 Dev
- **Streaming UI:** Dev Team
- **Documentation:** Product Owner

### Due by Next Meeting

- Vector database decision
- KB schema design
- `/v1/suggest` endpoint prototype
- Basic worker logic demo
- Sample KB with 5-10 documents

### Follow-Up Meetings

- **Architecture Review:** Week 2 (review KB design)
- **Prototype Demo:** Week 3 (show working KB integration)
- **Production Planning:** Week 4 (deploy to production)

---

## Pre-Meeting Prep Questions

### For Dev Team

1. **Which knowledge base domains to support first?**
   - Siding services?
   - Cladding?
   - General?
   - Other?

2. **What streaming interface best serves devs vs non-devs?**
   - CLI for non-devs?
   - NDJSON for devs?
   - Both?

3. **What are chunk-size, retrieval limits, latency targets?**
   - Chunk size: 512 tokens? 1024?
   - Retrieval: top-5? top-10?
   - Latency: < 20s? < 30s?

4. **What auth model and rate limits should we enforce?**
   - Required auth in production?
   - Rate limits per KB?
   - Rate limits per user?

### Architecture Best Practices to Review

- Separation of concerns (API, Worker, KB)
- Simple architecture (avoid over-engineering)
- Modularity (easy to add new precogs, KBs)
- Scalability (handle growth)
- Observability (metrics, logs, tracing)

---

## Appendix: Technical Details

### Current Database Schema

```sql
-- Jobs table
CREATE TABLE precogs.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  precog TEXT NOT NULL,
  prompt TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  status precogs.job_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT
);

-- Events table
CREATE TABLE precogs.events (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES precogs.jobs(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ DEFAULT NOW(),
  type TEXT NOT NULL,
  data JSONB NOT NULL
);
```

### Current Redis Streams

- Stream: `precogs:jobs`
- Consumer Group: `cg1`
- Dead Letter Queue: `precogs:jobs:dlq`

### Current Endpoints

- `GET /health` - Health check
- `GET /health/redis` - Redis health
- `GET /metrics` - Operational metrics
- `POST /v1/invoke` - Create job
- `GET /v1/jobs/:id/events` - SSE stream
- `GET /v1/run.ndjson` - NDJSON stream
- `GET /run` - Redirect to NDJSON
- `GET /cli` - Redirect to CLI viewer
- `GET /runtime/*` - Static files

---

**Document Status:** Pre-meeting prep  
**Last Updated:** $(date)

