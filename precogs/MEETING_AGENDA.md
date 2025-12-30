# Dev Planning Meeting: Precogs Invocation & Knowledge-Base Architecture

**Date:** TBD  
**Duration:** 60 minutes  
**Attendees:** Dev Team, Backend Lead, Architect, Product Owner

---

## 1. Current State / Recap (5 minutes)

### What We've Built

- **API endpoints:** `/v1/invoke`, `/v1/jobs/:id/events`, `/v1/run.ndjson`, `/v1/metrics`, `/health`, `/health/redis`
- **User Interfaces:** `/runtime/auto.html`, `/runtime/ndjson.html`, `/runtime/cli.html`, `/cli`, `/run`
- **Infrastructure:** PostgreSQL (jobs, events), Redis Streams (job queue), Worker service skeleton, migrations, deployment ready
- **Features:** token auth, rate limiting, SSE keep-alive, worker retry logic, dead letter queue, graceful shutdown, CORS restriction

### Vision Recap

**Goal:** Developer or user clicks link → system uses niche knowledge-base → real-time insights streamed live.

**Flow:**
1. User opens URL (e.g., `/cli?precog=schema&task=…`)
2. Page auto-invokes job → job created → enqueued → worker processes → events streamed → user sees output

### Current Friction Points

1. No knowledge-base integration yet
2. Limited precog types
3. No domain-specific knowledge bases (`kb` parameter missing)
4. Worker logic is placeholder
5. No text-menu endpoint for ChatGPT
6. No VS Code / Cursor integration

---

## 2. Vision for Invocation + Knowledge Base (10 minutes)

### URL Syntax

```
https://precogs.croutons.ai/run
  ?kb=<knowledgeBase>
  &precog=<precog>
  &url=<targetURL>
  &type=<type>
  &task=<task>
  &token=<apiKey>
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

- **Domains:** siding-services, cladding, general, etc.
- **Storage:** vector store for semantic search, document store for raw content
- **Retrieval:** embeddings, top-k docs

### Worker Flow

1. Job picked up (with `kb`, `precog`, `url`, `task`)
2. Fetch URL content
3. Query KB for relevant docs
4. Generate reasoning using URL + docs
5. Stream events:
   - `grounding.chunk`
   - `reasoning.delta`
   - `answer.delta`
   - `answer.complete`
6. Update job status

### Goals

- Low-friction one-click URL invocation
- Shareable links, live streaming
- Domain-specific knowledge bases

---

## 3. Architecture & Component Breakdown (15 minutes)

### Component 1: Invocation Endpoint

- **Current:** `/v1/run.ndjson`
- **Proposed params:** `kb`, `precog`, `url`, `type`, `task`, `token`
- **Decisions:** Is `kb` required? Default to "general"? Validate `kb`?

### Component 2: Knowledge Base Storage & Retrieval

**Options:**
- **A:** Vector DB (Pinecone, Weaviate, Qdrant)
- **B:** PostgreSQL full-text search
- **C:** Hybrid

**Decisions:** choice of vector DB, embedding model, chunk size, retrieval size, caching

### Component 3: Job Processing / Worker

- **Needs to implement:** URL fetching, KB query, precog logic, streaming events
- **Decisions:** timeouts (URL fetch, KB query), max docs, error handling strategy, streaming chunk size

### Component 4: Streaming Interface

**Interfaces:**
- CLI (`/cli`) – terminal style
- NDJSON (`/v1/run.ndjson`) – raw power users
- `/v1/suggest` – text menu for ChatGPT users

**Decisions:** which interface for which audience? Interactive menu?

### Component 5: Authentication & Rate Limiting

- **Current:** optional token via `API_KEY`, rate limit 60 req/min per IP
- **Proposed:** per-token rate limits, per-KB limits, required auth in production?

### Component 6: Deployment & Operations

- **Current:** Railway services (API + worker)
- **Proposed:** KB ingestion service, monitoring/alerting, log aggregation
- **Decisions:** Separate KB ingestion service? Monitoring stack choice?

---

## 4. Focusing on Friction Reduction (10 minutes)

### Friction Points

- No knowledge base, placeholder logic, no menu/options, manual KB setup, no dev tooling.

### Simplification Strategies

- One-click URL invocation (done)
- Default `kb` fallback to "general"
- Clear user experience (CLI shows progress, link simple)

### MVP Prioritisation

- **Phase 1:** text-menu endpoint, single general KB, basic processing
- **Phase 2:** multiple KBs, vector retrieval, domain-specific logic
- **Phase 3:** Dev tools integration, function-call API

---

## 5. Plan & Roadmap (10 minutes)

### Phase 1: Weeks 1-2

- **Deliverables:** `/v1/suggest`, general KB, basic worker logic
- **Metrics:** invocation links used, < 30s latency, successful job completion
- **Owner:** Backend Lead + 1 Dev

### Phase 2: Weeks 3-4

- **Deliverables:** multiple KBs, vector DB integration, domain-specific logic
- **Metrics:** 3+ KBs, improved relevance, < 20s latency
- **Owner:** Backend Lead + Architect

### Phase 3: Weeks 5-6

- **Deliverables:** VS Code extension, function-call API, advanced CLI
- **Metrics:** Devs using editor integration, tool invocation working, docs complete
- **Owner:** Dev Team + Product Owner

### Overall Metrics

- Usage count
- Latency
- Reliability (>95% jobs success)
- Error rate (<5%)
- User satisfaction

---

## 6. Risks & Dependencies (5 minutes)

### Risk 1: KB Ingestion

- **Mitigation:** start simple, document process, assign KB owner

### Risk 2: Worker Scale/Latency

- **Mitigation:** caching, performance targets, monitoring

### Risk 3: Security

- **Mitigation:** rate limiting, token auth, abuse detection

### Risk 4: Team Capacity

- **Mitigation:** clear scope, defer non-critical features, resource plan

### Dependencies

- Vector DB choice
- Embedding model
- KB content creation
- Worker logic

---

## 7. Next Steps & Actions (5 minutes)

### Immediate Actions

- Decide vector database
- Design KB schema
- Build `/v1/suggest` endpoint
- Implement basic worker logic
- Create "general" KB with sample docs

### Owners

- **Invocation endpoint:** Backend Lead
- **KB model/schema:** Architect
- **Worker implementation:** Backend Lead + Dev
- **Streaming UI:** Dev Team
- **Documentation:** Product Owner

### Due by Next Meeting

- Vector DB decision
- KB schema
- `/v1/suggest` prototype
- Worker demo
- Sample KB docs

### Follow-Up Meetings

- **Architecture Review:** Week 2
- **Prototype Demo:** Week 3
- **Production Planning:** Week 4

---

## Pre-Meeting Prep Questions

- Which KB domains first? (Siding services, cladding, general?)
- Which interface for dev vs non-dev? (CLI vs NDJSON vs both)
- What chunk-size, retrieval limits, latency targets?
- What auth model & rate limits?

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

- **Stream:** `precogs:jobs`
- **Consumer Group:** `cg1`
- **Dead Letter Queue:** `precogs:jobs:dlq`

### Current Endpoints

- `GET /health`
- `GET /health/redis`
- `GET /metrics`
- `POST /v1/invoke`
- `GET /v1/jobs/:id/events`
- `GET /v1/run.ndjson`
- `GET /run`
- `GET /cli`
- `GET /runtime/*`

---

**Document Status:** Pre-meeting prep  
**Last Updated:** $(date)

