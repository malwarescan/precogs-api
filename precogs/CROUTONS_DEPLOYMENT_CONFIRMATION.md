# Croutons Deployment Environment - Confirmed

**Date:** 2025-01-05  
**Status:** ✅ CONFIRMED

---

## Deployment Environment: Cloud-Based (Node.js/Express)

**Platform:** Railway (similar to AWS/GCP cloud deployment)

**Evidence from Codebase:**
- ✅ Precogs API deployed on Railway (`precogs.croutons.ai`)
- ✅ Graph Service deployed on Railway (`graph.croutons.ai`)
- ✅ Express.js servers (Node.js runtime)
- ✅ PostgreSQL databases (Railway managed)
- ✅ Redis databases (Railway managed)
- ✅ Full filesystem access
- ✅ Port 8080 binding
- ✅ Environment variables for DATABASE_URL, REDIS_URL

---

## Infrastructure Stack

### Current Setup
- **Platform:** Railway (cloud PaaS)
- **Runtime:** Node.js (>=20.0.0)
- **Framework:** Express.js
- **Database:** PostgreSQL (Railway managed)
- **Cache/Queue:** Redis (Railway managed)
- **Filesystem:** Full access (can use SQLite, JSON files)

### For Bangkok Massage Intelligence

**Recommended Stack:**
- ✅ **Redis** - Primary cache (already available via Railway)
- ✅ **SQLite** - Persistent backup (filesystem available)
- ✅ **JSON files** - Corpus files (filesystem available)
- ✅ **Express.js API** - Merge service endpoint
- ✅ **PostgreSQL** - Optional for complex queries (already available)

---

## Integration Architecture

```
Google Maps → Precog Worker → Croutons Merge Service → Redis + SQLite → Precog Response → GPT
                ↓
         Corpus Files (JSON/NDJSON on filesystem)
```

**Deployment Target:** ✅ **Cloud-Based (Node.js/Express) on Railway**

---

## Next Steps

Generate complete Croutons Dev Team Instructions for:
- ✅ Cloud-based deployment (Railway/AWS/GCP compatible)
- ✅ Redis + SQLite hybrid caching
- ✅ Express.js API endpoints
- ✅ Filesystem access for corpus files
- ✅ PostgreSQL integration (optional)

---

**Confirmed: Cloud-based (Node.js/Express) deployment** ✅

