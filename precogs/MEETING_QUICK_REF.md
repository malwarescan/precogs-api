# Precogs Dev Planning - Quick Reference

## Current State Summary

✅ **Built:**
- API endpoints (invoke, run.ndjson, metrics)
- CLI/NDJSON streaming interfaces
- PostgreSQL + Redis infrastructure
- Worker skeleton with retry logic
- Railway deployment ready

⏳ **Missing:**
- Knowledge base integration
- Actual worker processing logic
- Text-menu endpoint (`/v1/suggest`)
- VS Code/Cursor integration

## Key Decisions Needed

1. **Vector Database:** Pinecone, Weaviate, or pgvector?
2. **KB Schema:** Document structure, metadata fields
3. **Retrieval Strategy:** Top-k, chunk size, latency targets
4. **Auth Model:** Required in production? Rate limits?
5. **Phase 1 Scope:** What's in MVP vs Phase 2?

## Proposed URL Syntax

```
/cli?kb=siding-services&precog=schema&url=...&task=...
```

## Three-Phase Roadmap

**Phase 1 (Weeks 1-2):** Text-menu + basic KB  
**Phase 2 (Weeks 3-4):** Full KB integration  
**Phase 3 (Weeks 5-6):** Dev tooling

## Success Metrics

- Usage: Invocation links clicked
- Latency: < 30s (Phase 1), < 20s (Phase 2)
- Reliability: > 95% completion rate
- Error Rate: < 5%

## Risks

1. KB ingestion ownership/maintenance
2. Worker scale/latency
3. Security/abuse prevention
4. Team capacity

## Next Actions

- Choose vector database
- Design KB schema
- Build `/v1/suggest` endpoint
- Implement basic worker logic
- Create sample KB

---

**Full Details:** See `DEV_PLANNING_MEETING.md`

