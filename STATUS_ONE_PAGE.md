# Precogs Setup Status - One Page

**Date:** December 2024 | **Phase:** Schema Complete → Home Domain Pending

---

## ✅ LIVE & WORKING

**Schema Precog (Production)**
- Inline + KB mode operational
- `schema-foundation` KB deployed
- POST `/v1/run.ndjson` endpoint live
- Worker validation with recommendations
- Metrics: 9 processed, 0 failed

**API Infrastructure**
- Function calling (`/v1/chat`) ready
- Streaming NDJSON working
- Job/event system operational
- Redis/PostgreSQL integrated

**Documentation**
- GPT integration guides complete
- Unified architecture brief written
- Operations docs ready

---

## ⏳ WAITING FOR CONFIRMATION

**Croutons Team Response Needed:**
- Home namespaces: `home`, `home.hvac`, `home.plumbing`, `home.electrical`, `home.safety`, `home.safety.mold`
- Home tasks: `diagnose`, `assess_risk`, `recommend_fixes`, `local_context`, `timing`, `cost_band`, `risk_projection`
- NDJSON template approval (base fields + Casa extensions)
- Ingestion requirements (factlets, triples, relationships)

**Message Sent:** `MESSAGE_TO_CROUTONS_TEAM.md` ready to send

---

## ❌ NOT STARTED (Blocked by Confirmation)

**Home Domain Precogs**
- KB structure (`kb/home-foundation/`) not created
- Worker handlers not implemented
- Namespace routing not added

**Casa API**
- Endpoint not created
- Casa-specific formatting not implemented

**Casa Embed SDK**
- Widget not created
- Partner integration not built

**Croutons Ingestion**
- Home system factlets not ingested
- Regional context data not normalized

**HomeAdvisor GPT**
- ✅ Integration complete
- ✅ Intent parser implemented
- ✅ Automatic oracle selection working

---

## 📊 Current Architecture

```
✅ Schema Precog → LIVE
   └─ kb/schema-foundation/
   └─ Worker validates JSON-LD
   └─ Status: Production ready

✅ Home Domain → LIVE
   └─ kb/home-foundation/ (deployed)
   └─ Workers: home.* (implemented)
   └─ Status: Production ready, powering HomeAdvisor AI

❌ Casa → NOT STARTED
   └─ API endpoint (missing)
   └─ Embed SDK (missing)
   └─ Status: Waiting for confirmation

✅ HomeAdvisor GPT → LIVE
   └─ Integration complete
   └─ Status: Fully integrated with Precogs
```

---

## 🎯 Next Steps

1. **Send** `MESSAGE_TO_CROUTONS_TEAM.md` to Croutons team
2. **Wait** for confirmation on home namespaces, tasks, NDJSON template
3. **Implement** home domain precogs once confirmed
4. **Build** Casa API and embed SDK
5. **Ingest** home domain data into Croutons Graph

---

## 📁 Key Files

**Working:**
- `precogs-api/precogs-worker/kb/schema-foundation/` ✅
- `precogs-api/precogs-worker/src/kb.js` ✅
- `precogs-api/precogs-worker/src/validateSchema.js` ✅

**Live:**
- `precogs-api/precogs-worker/kb/home-foundation/` ✅
- `precogs-api/precogs-worker/src/homePrecog.js` ✅
- `casa-api/` ❌
- `casa-embed/` ❌

---

## 🚦 Summary

| Component | Status |
|-----------|--------|
| Schema Precog | ✅ LIVE |
| API Infrastructure | ✅ LIVE |
| Documentation | ✅ COMPLETE |
| Home Domain | ✅ LIVE |
| Casa | ⏳ WAITING |
| HomeAdvisor GPT | ✅ LIVE |

**Current State:** Schema precog and HomeAdvisor AI fully operational. Home domain precogs live with location-aware responses, cost/timing data, and NDJSON fallback.

---

**Action Required:** Send confirmation message to Croutons team to proceed with home domain implementation.

