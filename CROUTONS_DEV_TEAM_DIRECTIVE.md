# Croutons Dev Team – Immediate Action Items
## NDJSON + Home Precogs + Casa Integration

**Date:** December 2024  
**Status:** Ready for Implementation  
**Priority:** High

---

Team,

Here are the concrete tasks we need implemented to enable local NDJSON ingestion, home-domain Precogs, and Casa/HomeAdvisor integration.

---

## 1. Build the NDJSON Source Registry (Admin UI)

Create a new admin module in the Croutons dashboard called:

**"AI Sitemap Sources"**

### Data Model

Each source entry must store:
- `id` (internal)
- `partner_name` (e.g., "FloodBarrierPros")
- `domain` (e.g., floodbarrierpros.com)
- `ndjson_url` (e.g., https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson)
- `vertical` / `system` (e.g., flood_protection, hvac, siding)
- `region_hint` (optional: ZIP(s), city, state)
- `polling_interval` (e.g., 15m, 1h, 1d)
- `status` (active/paused)
- `last_fetch_at`
- `last_fetch_status` (success/error)
- `last_error_message`

### Admin UI Requirements

- Add new NDJSON source
- Edit NDJSON source
- Delete NDJSON source
- Pause/activate toggle
- "Fetch Now / Test Ingest" button
- Preview last 50 factlets ingested

**UI can be minimal — table + CRUD forms.**

---

## 2. Implement the NDJSON Ingestion Job

Create a background worker that:

1. Iterates over active sources
2. Fetches the NDJSON file
3. Validates line-by-line NDJSON
4. Normalizes each line into a Croutons Factlet
5. Attaches metadata (domain, vertical, region tags)
6. Upserts factlets into Croutons graph
7. Logs ingestion status back to the admin module

### Notes

- Generate deterministic IDs if the NDJSON does not provide them
- Ingest frequency = `polling_interval`
- Handle errors gracefully and store them in admin

---

## 3. Extend the Croutons Graph for Home-Domain Factlets

Add support for home-service factlets in the graph:

### Required Entity Types

- HVAC system
- Plumbing system
- Electrical components
- Flood barrier systems
- Roofing, siding, foundation
- Local climate/environmental factors
- Regional cost bands

### Required Relationship Types

- `CAUSES`
- `IS_SYMPTOM_OF`
- `REQUIRES_PRO`
- `COMMON_FIX`
- `HAZARD_LEVEL`
- `OPTIMAL_WINDOW_FOR`
- `TYPICAL_COST_BAND_IN`
- `MORE_LIKELY_IN_CLIMATE`

**This is the backbone for Casa + HomeAdvisor.**

---

## 4. Implement Home-Domain Precog Namespaces

Create the following Precog namespaces:

- `home`
- `home.hvac`
- `home.plumbing`
- `home.electrical` (low-risk)
- `home.safety`
- `home.safety.mold`
- (optional) `home.flood`

Each namespace should load the above factlets & triples.

---

## 5. Implement Home-Domain Precog Tasks

Each of the above namespaces must support:

- `diagnose`
- `assess_risk`
- `recommend_fixes`
- `local_context`
- `timing`
- `cost_band`
- `risk_projection`

These tasks produce NDJSON output for Casa and HomeAdvisor GPT.

---

## 6. Add Precog Query Hooks

Inside the Precog worker, add helpers to filter/boost data by:

- `domain`
- `vertical`
- `region` (ZIP / city / county / state)

### Examples

- `query.byDomain("floodbarrierpros.com")`
- `query.byRegion("33908")`
- `query.byVertical("flood_protection")`

These are required for partner-aware recommendations.

---

## 7. Implement NDJSON Output Format for Home Precogs

All home-related Precog outputs must emit the unified NDJSON format:

### Base Fields

- `assessment`
- `risk_score`
- `likely_causes[]`
- `recommended_steps[]`
- `dangerous_conditions[]`
- `triage_level`

### Casa Extensions

- `location_context`
- `timing_recommendation`
- `cost_band` (low, high, currency, confidence)
- `risk_projection`
- `when_to_call_pro[]`

---

## 8. Create the Home KB Folder

Add folder:

```
precogs-worker/kb/home-foundation/
```

This should include:

- Rules for home systems
- Regional mapping rules
- Risk scoring thresholds
- Mapping for vertical → system type

**This KB acts like `schema-foundation` but for home intelligence.**

---

## 9. Provide a Validation Schema for NDJSON Partners

Create a lightweight JSON Schema file called:

```
ndjson_home_factlet.schema.json
```

This defines allowed fields so partner sites can validate NDJSON before publishing.

---

## 10. Deliverables Required for Next Milestone

- ✅ Admin UI for NDJSON sources
- ✅ Ingestion worker with normalization
- ✅ Home-domain KB folder created
- ✅ Precog namespaces registered
- ✅ Query hooks implemented
- ✅ First ingestion test using FloodBarrierPros NDJSON
- ✅ First end-to-end test: Casa → `invoke_precog(home.local_context)` → NDJSON

---

## 11. After This Is Done

I will begin onboarding local service partners (FloodBarrierPros first) and generate their NDJSON feeds so Croutons can ingest them immediately.

---

## This is the full implementation spec.

Please begin work on these items and confirm if any dependency or sequencing concerns exist.

---

**Ready to copy-paste to Croutons dev team**




