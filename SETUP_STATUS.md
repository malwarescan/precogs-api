# Precogs Setup Status

**Last Updated:** December 2024  
**Current Phase:** Schema Precog Complete → Home Domain Implementation Pending

---

## ✅ Completed

### 1. Schema Precog (Production Ready)
- ✅ Inline content mode implemented
- ✅ KB training system (`schema-foundation`)
- ✅ POST `/v1/run.ndjson` endpoint
- ✅ Worker validation with KB rules
- ✅ Production deployment verified
- ✅ Metrics and monitoring working

**Status:** ✅ **LIVE** - Fully operational

**Files:**
- `precogs-api/precogs-worker/kb/schema-foundation/` - KB rules
- `precogs-api/precogs-worker/src/kb.js` - KB loader
- `precogs-api/precogs-worker/src/validateSchema.js` - Validator
- `precogs-api/precogs-worker/worker.js` - Schema precog handler

---

### 2. API Infrastructure
- ✅ Function calling endpoint (`/v1/chat`)
- ✅ Streaming endpoint (`/v1/run.ndjson`)
- ✅ Job/event system
- ✅ Redis queue integration
- ✅ PostgreSQL event storage
- ✅ Health and metrics endpoints

**Status:** ✅ **LIVE** - Production ready

---

### 3. Documentation
- ✅ `GPT_INTEGRATION_GUIDE.md` - Complete GPT integration guide
- ✅ `GPT_QUICK_START.md` - Quick reference
- ✅ `UNIFIED_INTEGRATION_BRIEF.md` - Architecture spec
- ✅ `OPS_CARD.md` - Operations reference
- ✅ `OPERATIONAL_SNAPSHOT.md` - Status dashboard
- ✅ `MESSAGE_TO_CROUTONS_TEAM.md` - Team communication

**Status:** ✅ **COMPLETE**

---

## 🚧 In Progress / Pending

### 1. Home Domain Precogs (Not Started)

**Required Namespaces:**
- ❌ `home` (generic)
- ❌ `home.hvac`
- ❌ `home.plumbing`
- ❌ `home.electrical` (low-risk only)
- ❌ `home.safety`
- ❌ `home.safety.mold`

**Required Tasks:**
- ❌ `diagnose`
- ❌ `assess_risk`
- ❌ `recommend_fixes`
- ❌ `local_context` (Casa-specific)
- ❌ `timing` (Casa-specific)
- ❌ `cost_band` (Casa-specific)
- ❌ `risk_projection` (Casa-specific)

**Status:** ❌ **NOT STARTED**

**Next Steps:**
1. Create home domain KB structure (`kb/home-foundation/`)
2. Implement home precog workers
3. Add worker handlers for each namespace
4. Implement task handlers (diagnose, assess_risk, etc.)

---

### 2. Casa API (Not Started)

**Required:**
- ❌ Casa API endpoint (wraps `invoke_precog`)
- ❌ Casa-specific response formatting
- ❌ Location context processing
- ❌ Cost/timing/risk projection logic

**Status:** ❌ **NOT STARTED**

**Location:** New service or extend `precogs-api/server.js`

---

### 3. Casa Embed SDK (Not Started)

**Required:**
- ❌ JavaScript embed snippet
- ❌ Partner ID handling
- ❌ Widget UI components
- ❌ Casa brand styling (calm, warm, local)

**Status:** ❌ **NOT STARTED**

**Location:** New repo `casa-embed/` or `casa/frontend/embed/`

---

### 4. Croutons Ingestion Pipelines (Not Started)

**Required:**
- ❌ Home system factlets (HVAC, plumbing, electrical, etc.)
- ❌ Regional context factlets (ZIP-level climate, risk, costs)
- ❌ Relationship triples (CAUSES, IS_SYMPTOM_OF, etc.)
- ❌ Cost/risk/timing data normalization

**Status:** ❌ **NOT STARTED**

**Location:** `graph-service/` - Add home domain ingestion

---

### 5. HomeAdvisor GPT Integration (Pending Croutons Confirmation)

**Required:**
- ⏳ Wait for Croutons team confirmation
- ⏳ Configure GPT with system prompt
- ⏳ Register `invoke_precog` function
- ⏳ Implement intent parser (user text → precog namespace + task)
- ⏳ Test end-to-end flows

**Status:** ⏳ **WAITING FOR CONFIRMATION**

**Blocked by:** Croutons team response to `MESSAGE_TO_CROUTONS_TEAM.md`

---

## 📊 Current Architecture

```
✅ Schema Precog
   └─ kb/schema-foundation/
   └─ Worker: validates JSON-LD
   └─ Status: LIVE

❌ Home Domain Precogs
   └─ kb/home-foundation/ (not created)
   └─ Workers: home.* namespaces (not implemented)
   └─ Status: NOT STARTED

❌ Casa API
   └─ Endpoint: /v1/casa (not created)
   └─ Status: NOT STARTED

❌ Casa Embed
   └─ SDK: embed.js (not created)
   └─ Status: NOT STARTED

⏳ HomeAdvisor GPT
   └─ Integration: pending confirmation
   └─ Status: WAITING
```

---

## 🎯 Immediate Next Steps

### Priority 1: Get Croutons Team Confirmation
1. ✅ Send `MESSAGE_TO_CROUTONS_TEAM.md` to team
2. ⏳ Wait for confirmation on:
   - Home namespaces (`home.*`)
   - Home tasks (`diagnose`, `assess_risk`, etc.)
   - NDJSON response template
   - Ingestion requirements

### Priority 2: Once Confirmed, Implement Home Domain
1. Create `kb/home-foundation/` structure
2. Implement `home` precog worker
3. Add namespace routing in worker
4. Implement task handlers
5. Test with sample queries

### Priority 3: Casa Implementation
1. Build Casa API endpoint
2. Create embed SDK
3. Implement Casa UI components
4. Test partner site integration

### Priority 4: Croutons Ingestion
1. Design factlet schema
2. Build ingestion pipelines
3. Normalize home system data
4. Create relationship triples

---

## 📁 File Structure Status

### ✅ Existing (Schema Precog)
```
precogs-api/
├── precogs-worker/
│   ├── kb/
│   │   └── schema-foundation/     ✅ Created
│   ├── src/
│   │   ├── kb.js                   ✅ Created
│   │   └── validateSchema.js       ✅ Created
│   └── worker.js                   ✅ Updated
├── src/
│   ├── functions/
│   │   └── invoke_precog.js       ✅ Schema precog ready
│   └── integrations/
│       └── openai-chat.js          ✅ Function calling ready
└── server.js                       ✅ POST endpoint ready
```

### ❌ Missing (Home Domain)
```
precogs-api/
├── precogs-worker/
│   ├── kb/
│   │   └── home-foundation/        ❌ Not created
│   └── src/
│       └── homePrecog.js          ❌ Not created
└── src/
    └── functions/
        └── invoke_precog.js        ⚠️ Needs home namespace support

casa-api/                            ❌ Not created
casa-embed/                          ❌ Not created
```

---

## 🔄 Current Workflow

### What Works Now:
1. ✅ Schema validation via inline content
2. ✅ KB-based validation with recommendations
3. ✅ GPT function calling for schema precog
4. ✅ Streaming NDJSON responses
5. ✅ Job/event tracking

### What Doesn't Work Yet:
1. ❌ Home troubleshooting (HVAC, plumbing, etc.)
2. ❌ Casa local context queries
3. ❌ Home domain risk assessment
4. ❌ Casa embed widgets
5. ❌ HomeAdvisor GPT integration (pending confirmation)

---

## 🚦 Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **Schema Precog** | ✅ LIVE | Production ready, fully operational |
| **API Infrastructure** | ✅ LIVE | All endpoints working |
| **Documentation** | ✅ COMPLETE | All guides written |
| **Home Domain Precogs** | ❌ NOT STARTED | Waiting for confirmation |
| **Casa API** | ❌ NOT STARTED | Waiting for confirmation |
| **Casa Embed** | ❌ NOT STARTED | Waiting for confirmation |
| **Croutons Ingestion** | ❌ NOT STARTED | Waiting for confirmation |
| **HomeAdvisor GPT** | ⏳ PENDING | Waiting for confirmation |

---

## 🎯 Where We Are

**Current State:**
- ✅ Schema precog is fully implemented and live
- ✅ All infrastructure is in place
- ✅ Documentation is complete
- ⏳ **Waiting for Croutons team confirmation** before proceeding with home domain

**Next Action:**
1. Send `MESSAGE_TO_CROUTONS_TEAM.md` to Croutons team
2. Wait for their confirmation on:
   - Home namespaces
   - Home tasks
   - NDJSON template
   - Ingestion requirements
3. Once confirmed, begin home domain implementation

---

**Status:** ✅ **Schema Precog Complete** → ⏳ **Waiting for Confirmation** → 🚧 **Home Domain Next**

