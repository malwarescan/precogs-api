# Precogs Architecture - Key Decisions Sign-Off

**Meeting Date:** TBD  
**Sign-off Required By:** End of Meeting

---

## Decision 1: Knowledge Base Storage

**Question:** Which vector database solution?

**Options:**
- [ ] **Pinecone** - Managed, easy setup, pay-per-use
- [ ] **Weaviate** - Open-source, self-hosted, flexible
- [ ] **Qdrant** - Open-source, fast, Rust-based
- [ ] **pgvector** - PostgreSQL extension, no separate service
- [ ] **Hybrid** - Vector DB + PostgreSQL full-text

**Decision:** _________________________

**Rationale:** _________________________

**Owner:** Architect  
**Due:** Week 1

---

## Decision 2: Embedding Model

**Question:** Which embedding model for semantic search?

**Options:**
- [ ] **OpenAI text-embedding-3-small** - Good quality, API-based
- [ ] **OpenAI text-embedding-3-large** - Higher quality, more expensive
- [ ] **Cohere embed-english-v3.0** - Alternative API
- [ ] **Open-source** (e.g., sentence-transformers) - Self-hosted, free

**Decision:** _________________________

**Rationale:** _________________________

**Owner:** Architect  
**Due:** Week 1

---

## Decision 3: KB Parameter Handling

**Question:** How should `kb` parameter work?

**Options:**
- [ ] **Required** - Must specify KB, no default
- [ ] **Optional, default to "general"** - Fallback if not specified
- [ ] **Optional, error if missing** - Fail fast if no KB specified

**Decision:** _________________________

**Rationale:** _________________________

**Owner:** Backend Lead  
**Due:** Week 1

---

## Decision 4: Retrieval Configuration

**Question:** What are the retrieval parameters?

**Chunk Size:**
- [ ] 512 tokens
- [ ] 1024 tokens
- [ ] 2048 tokens
- [ ] Other: _________

**Top-K Documents:**
- [ ] Top 3
- [ ] Top 5
- [ ] Top 10
- [ ] Other: _________

**Latency Target:**
- [ ] < 20 seconds end-to-end
- [ ] < 30 seconds end-to-end
- [ ] < 60 seconds end-to-end
- [ ] Other: _________

**Decision:** 
- Chunk Size: _________
- Top-K: _________
- Latency Target: _________

**Owner:** Backend Lead + Architect  
**Due:** Week 1

---

## Decision 5: Authentication Model

**Question:** Should authentication be required in production?

**Options:**
- [ ] **Required** - All endpoints need `API_KEY` token
- [ ] **Optional** - Token recommended but not required
- [ ] **Hybrid** - Required for some endpoints, optional for others

**Rate Limits:**
- [ ] Per IP: 60 req/min (current)
- [ ] Per token: ________ req/min
- [ ] Per KB: ________ req/min
- [ ] Other: _________

**Decision:** 
- Auth Required: [ ] Yes [ ] No
- Rate Limits: _________________________

**Owner:** Backend Lead  
**Due:** Week 1

---

## Decision 6: Knowledge Base Domains (Phase 1)

**Question:** Which KB domains to support first?

**Options:**
- [ ] **general** - General-purpose knowledge base
- [ ] **siding-services** - Siding installation services
- [ ] **cladding** - Cladding industry knowledge
- [ ] **Other:** _________

**Decision:** 
- Phase 1 KBs: _________________________

**Owner:** Product Owner  
**Due:** Week 1

---

## Decision 7: Worker Timeouts

**Question:** What are the timeout values?

**URL Fetch Timeout:**
- [ ] 10 seconds
- [ ] 30 seconds
- [ ] 60 seconds
- [ ] Other: _________

**KB Query Timeout:**
- [ ] 5 seconds
- [ ] 10 seconds
- [ ] 30 seconds
- [ ] Other: _________

**Decision:**
- URL Fetch: _________ seconds
- KB Query: _________ seconds

**Owner:** Backend Lead  
**Due:** Week 1

---

## Decision 8: Monitoring & Observability

**Question:** What monitoring stack?

**Options:**
- [ ] **Railway built-in** - Use Railway metrics/logs
- [ ] **Datadog** - Full APM solution
- [ ] **Grafana + Prometheus** - Self-hosted
- [ ] **Other:** _________

**Decision:** _________________________

**Rationale:** _________________________

**Owner:** Backend Lead  
**Due:** Week 2

---

## Decision 9: KB Ingestion Process

**Question:** How do we ingest KB documents?

**Options:**
- [ ] **Manual upload** - Markdown files via API
- [ ] **Automated scraping** - Crawl and ingest
- [ ] **Hybrid** - Manual + automated
- [ ] **Other:** _________

**KB Owner Assignment:**
- general: _________________________
- siding-services: _________________________
- cladding: _________________________

**Decision:** 
- Process: _________________________
- Owners: _________________________

**Owner:** Product Owner  
**Due:** Week 1

---

## Decision 10: Phase 1 Scope

**Question:** What's included in MVP?

**Must Have:**
- [ ] `/v1/suggest` endpoint
- [ ] Single "general" KB
- [ ] Basic worker logic (fetch URL, simple processing)
- [ ] Text-menu for ChatGPT

**Nice to Have (defer if needed):**
- [ ] Multiple KBs
- [ ] Vector DB integration
- [ ] Advanced precog types
- [ ] Interactive CLI menu

**Decision:** 
- MVP Scope: _________________________
- Deferred: _________________________

**Owner:** Product Owner + Backend Lead  
**Due:** End of Meeting

---

## Sign-Off

**Backend Lead:** _________________________ Date: _________

**Architect:** _________________________ Date: _________

**Product Owner:** _________________________ Date: _________

**Dev Team Rep:** _________________________ Date: _________

---

## Next Steps

1. Document all decisions in architecture doc
2. Create implementation tickets
3. Assign owners and due dates
4. Schedule follow-up architecture review (Week 2)

---

**Document Status:** Decision sign-off sheet  
**Last Updated:** $(date)

