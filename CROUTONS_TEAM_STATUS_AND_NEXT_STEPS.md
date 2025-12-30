# Croutons Dev Team – Home Domain Precogs Status & Next Steps

**Date:** December 2024  
**Scope:** Home Precogs + NDJSON Ingestion Integration  
**Status:** Precogs foundation complete – Croutons integration pending

---

## 1. What's Already Implemented (Precogs Side)

The home domain foundation on the Precogs side is now in place and wired:

### A. Home-Foundation KB

- Created `kb/home-foundation/` with:
  - KB config
  - Type definitions
  - Risk scoring patterns
- Created `ndjson_home_factlet.schema.json` for partner NDJSON validation

### B. Home Precog Handler

- Implemented all 7 tasks:
  - `diagnose`
  - `assess_risk`
  - `recommend_fixes`
  - `local_context`
  - `timing`
  - `cost_band`
  - `risk_projection`
- Integrated into worker routing
- Supports all home namespaces:
  - `home`
  - `home.hvac`
  - `home.plumbing`
  - `home.electrical`
  - `home.safety`
  - `home.safety.mold`
  - (extensible to `home.flood`)

### C. Query Hooks

- Implemented filters:
  - `byDomain()`
  - `byRegion()`
  - `byVertical()`
- Integrated into home precog processing so the oracles can:
  - Prefer partner-specific data when relevant
  - Scope to region/vertical when needed

### D. NDJSON Ingestion Worker (Module-Level)

- Created `src/ndjsonIngestion.js` with:
  - Fetch
  - Validate (against `ndjson_home_factlet.schema.json`)
  - Normalize to Factlets
  - Upsert hooks
- **This module is ready to be wired into the Croutons ingestion pipeline and scheduler.**

### E. Function Schema

- Updated `invoke_precog` function schema to include:
  - All home namespaces
  - All 7 home tasks
- Ready for GPT function calling (HomeAdvisor AI, Casa, etc.)

### Files Created

- `kb/home-foundation/`
- `src/homePrecog.js`
- `src/ndjsonIngestion.js`
- `ndjson_home_factlet.schema.json`
- `HOME_DOMAIN_IMPLEMENTATION_STATUS.md`

---

## 2. What's Still Needed From Croutons Side

To complete the end-to-end path (Local Site → Croutons → Precogs → Casa/HomeAdvisor), we now need the Croutons graph + admin pieces:

### 1) Admin UI – "AI Sitemap Sources" Module

Build the dashboard module to manage NDJSON sources:

- Create/read/update/delete sources
- Fields: `partner_name`, `domain`, `ndjson_url`, `vertical/system`, `region_hint`, `polling_interval`, `status`, `last_fetch_at`, `last_fetch_status`, `last_error_message`
- Buttons:
  - Pause/Activate
  - "Fetch Now / Test Ingest"
  - "View last 50 factlets" preview

### 2) Background Ingestion Job

Hook `src/ndjsonIngestion.js` into a scheduled worker that:

- Iterates active sources
- Calls the ingestion module
- Records status back to the admin UI
- Polling cadence driven by `polling_interval`

### 3) Graph Schema Extension (Home Domain)

Extend the Croutons graph schema for:

- **Home entities:** HVAC, plumbing, electrical, flood barriers, siding, foundation, local climate factors, regional cost bands
- **Relationships:** `CAUSES`, `IS_SYMPTOM_OF`, `REQUIRES_PRO`, `COMMON_FIX`, `HAZARD_LEVEL`, `OPTIMAL_WINDOW_FOR`, `TYPICAL_COST_BAND_IN`, `MORE_LIKELY_IN_CLIMATE`
- Connect NDJSON-normalized Factlets to these graph types

### 4) Graph Query API for Precogs

Wire the home precog query hooks (`byDomain`, `byRegion`, `byVertical`) to the graph service so that:

- `home.*` Precogs can pull:
  - General home knowledge
  - Region-level patterns
  - Partner-specific factlets for the current domain/vertical

---

## 3. What This Enables (Once Your Part Is Done)

Once the above 4 items are implemented on the Croutons side:

- **Local sites** like floodbarrierpros.com can:
  - Publish NDJSON at `/sitemaps/sitemap-ai.ndjson`
  - Be registered in "AI Sitemap Sources"
  - Have their data ingested into the graph

- **Home Precogs** can:
  - Answer `diagnose`, `assess_risk`, `recommend_fixes`, `local_context`, etc.
  - Use domain/region/vertical-aware data

- **Casa and HomeAdvisor GPT** can:
  - Call `invoke_precog(...)`
  - Get structured, localized, partner-aware answers
  - Never talk directly to NDJSON or the partner sites

---

## 4. Ask

Please:

1. **Confirm** the pending Croutons tasks list above looks correct.

2. **Prioritize:**
   - Admin UI
   - Ingestion job
   - Graph schema extension
   - Graph query wiring

3. **Let me know** if you want additional examples (e.g., a sample FloodBarrierPros NDJSON feed) to test with while you wire ingestion.

---

**The Precogs home foundation is ready; we're now waiting on the Croutons admin + graph integration to complete the loop.**

---

**Ready to send to Croutons dev team**




