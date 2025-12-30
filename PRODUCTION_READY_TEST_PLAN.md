# Production Ready Test Plan - Live Vertical Slice

**Date:** December 2024  
**Goal:** Get to a working end-to-end test with real NDJSON and real Precog answers  
**Status:** Ready for Implementation

---

## 1. What "Production Ready" Means

**"Production ready" means:** Can I actually hit this thing, with a real URL, and see a real Precog answer come back.

You're at the point where you want a **live vertical slice**, not more docs.

---

## 2. What a "Live" Test Should Look Like

### Bare Minimum End-to-End Test

1. **floodbarrierpros.com exposes NDJSON at:**
   ```
   https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson
   ```
   (you already have this)

2. **Croutons:**
   - Has AI Sitemap Sources admin where you register that URL
   - Has an ingestion worker that:
     - Fetches that NDJSON
     - Validates it
     - Normalizes and stores factlets in the graph

3. **Precogs:**
   - `home` / `home.safety` (or `home.flood`) namespace is live
   - `invoke_precog` can be called via `/v1/run.ndjson` or `/v1/chat` with function calling

4. **You:**
   - Run a real request like:
     ```
     "My garage keeps flooding in heavy rain in ZIP 33908, what should I do?"
     ```
   - Watch the NDJSON stream from Precogs
   - See that:
     - It references flood-protection / barriers
     - It is shaped in the home NDJSON format (`assessment`, `risk_score`, `recommended_steps`, etc.)

**That's your "it's actually alive" moment.**

---

## 3. Concrete Steps to Get to That First Live Test

You already have:
- ✅ Home KB
- ✅ Home Precog handler
- ✅ Query hooks
- ✅ `ndjsonIngestion` module
- ✅ `invoke_precog` updated

So here's exactly what you tell the devs to do now, framed as **"let's get to a live test"**:

---

### Step 1 – Wire `ndjsonIngestion.js` into a Real Job

**Ask devs:**

Take `src/ndjsonIngestion.js` and wire it into a scheduled worker / cron in the existing ingestion service:

- Run it at least every 5 minutes for now (or manual trigger)
- Point the first source at:
  - `domain`: `floodbarrierpros.com`
  - `ndjson_url`: `https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson`
  - `vertical`: `flood_protection`
  - `region_hint`: whatever region matches FloodBarrierPros

**They don't need the full admin UI finished to test** – they can seed this source directly in the DB or via a config file for now.

---

### Step 2 – Quick & Dirty "AI Sitemap Sources" UI (or None at All)

For the very first test, minimum viable:

**Option A:**
They implement the admin UI, even bare-bones:
- Simple table pulled from `ai_sitemap_sources` table
- One form, one "Fetch Now" button

**Option B (faster):**
They skip the UI for the first live and:
- Insert one row manually in the DB for `floodbarrierpros.com`
- Run a CLI script or direct call to the ingestion worker

**Tell them:**

> "Don't block the first live test on a pretty admin UI. Hard-code/seed one NDJSON source and run the ingest job."

---

### Step 3 – Verify Ingestion

They should give you proof that ingestion works:

- Run ingestion (cron, CLI, or "Fetch Now")
- Check logs:
  - NDJSON fetched from `sitemap-ai.ndjson`
  - `ndjson_home_factlet.schema.json` validation passed
  - X factlets normalized and upserted

**You can ask them for:**

- A JSON snippet of 3–5 ingested factlets for `floodbarrierpros.com`
- Confirmation that `byDomain("floodbarrierpros.com")` returns rows when called from the home Precog handler

---

### Step 4 – Live Precog Call (Your First Real Test)

Once ingestion is confirmed, you test this via `curl` (or Postman).

**Ask them for:**

- The Precogs API base URL (e.g., `https://precogs.croutons.ai`)
- A test API key
- Confirmation that `invoke_precog` is registered with home namespaces

**Then you run something like:**

```bash
curl -N https://precogs.croutons.ai/v1/run.ndjson \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "precog": "home.safety",
    "task": "diagnose",
    "content": "I live near a canal in Fort Myers (33908). My garage floods when it rains. What should I be looking at for protection?"
  }'
```

**What you should see stream back:**

A series of NDJSON lines, ending in an object with fields similar to:

```json
{
  "assessment": "Home in a high flood-risk zone with ground-level garage",
  "risk_score": 0.82,
  "likely_causes": [
    "Insufficient drainage near garage entrance",
    "Backflow from street drains during heavy rain"
  ],
  "recommended_steps": [
    "Install removable flood barrier at garage entrance",
    "Add trench drain and ensure gutters discharge away from driveway"
  ],
  "dangerous_conditions": [
    "Repeated water intrusion near electrical outlets"
  ],
  "triage_level": "caution",
  "location_context": {
    "zip": "33908",
    "risk_profile": "coastal, heavy rain, storm surge prone"
  },
  "timing_recommendation": "Install flood barriers before peak storm season (June–November).",
  "cost_band": {
    "low": 2000,
    "high": 8000,
    "currency": "USD",
    "confidence": 0.7
  },
  "risk_projection": "Without mitigation, repeated garage flooding and potential structural issues over 5–10 years.",
  "when_to_call_pro": [
    "If water reaches electrical outlets",
    "If flooding persists after basic drainage improvements"
  ]
}
```

**You don't need it to be 100% perfect** – you need to see:

- ✅ Correct shape (fields present)
- ✅ Non-garbage content that clearly uses:
  - Location context
  - Flood/home knowledge
  - Recommended steps

**That's your sign it's "production ready enough to iterate."**

---

## 4. How to Phrase This to the Dev Team Right Now

**You can send:**

---

> I want to run a **live end-to-end test this week**.
>
> For that, I don't need the full admin UX finished – I need exactly this:
>
> 1. **One NDJSON source wired:** `floodbarrierpros.com` → `https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson`
>
> 2. **The ingestion worker actually fetching + normalizing** those factlets into the graph
>
> 3. **`home.safety` (or `home`/`home.flood`) Precog callable** via `/v1/run.ndjson`
>
> 4. **A sample curl request** that you confirm works and returns the home NDJSON response shape
>
> After that vertical slice is live, we can iterate on:
> - the full AI Sitemap Sources admin module,
> - better graph modeling,
> - and Casa/HomeAdvisor UI wiring.
>
> But right now, I just want to **hit a real endpoint with a flood question and see a real structured Precog answer** that's backed by FloodBarrierPros NDJSON + graph.

---

## 5. Minimum Viable Implementation Checklist

### For Croutons Team

- [ ] **Database:** Create `ai_sitemap_sources` table (or use existing config)
- [ ] **Seed Data:** Insert one row for `floodbarrierpros.com`:
  ```sql
  INSERT INTO ai_sitemap_sources (
    partner_name, domain, ndjson_url, vertical, region_hint, status, polling_interval
  ) VALUES (
    'FloodBarrierPros',
    'floodbarrierpros.com',
    'https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson',
    'flood_protection',
    '33908,FL',
    'active',
    '15m'
  );
  ```
- [ ] **Ingestion Worker:** Wire `src/ndjsonIngestion.js` into a cron/worker
- [ ] **Test Ingestion:** Run ingestion once and verify factlets in graph
- [ ] **Graph Query:** Ensure `byDomain("floodbarrierpros.com")` returns factlets

### For Precogs Team

- [ ] **Verify Worker:** Confirm `home.safety` precog routes correctly
- [ ] **Test Endpoint:** Confirm `/v1/run.ndjson` accepts home precog calls
- [ ] **Graph Connection:** Wire `queryCroutonsGraph()` to actual graph API
- [ ] **Test Call:** Run test curl and verify NDJSON response shape

---

## 6. Success Criteria

**You know it's working when:**

1. ✅ Ingestion logs show factlets from `floodbarrierpros.com` NDJSON
2. ✅ Graph query returns factlets when filtering by domain
3. ✅ Precog call returns structured NDJSON with:
   - `assessment` field
   - `risk_score` field
   - `recommended_steps` array
   - Location-aware content (mentions ZIP 33908 or Fort Myers)
   - Flood-protection specific recommendations

**You don't need:**
- ❌ Perfect admin UI
- ❌ All home namespaces working
- ❌ All 7 tasks implemented perfectly
- ❌ Casa/HomeAdvisor integration

**You just need:**
- ✅ One working end-to-end flow
- ✅ Real NDJSON → Graph → Precog → Answer

---

## 7. Next Steps After First Live Test

Once you have the vertical slice working:

1. **Iterate on quality** – improve factlet normalization, better graph queries
2. **Add more sources** – onboard more partner sites
3. **Build admin UI** – full CRUD interface for managing sources
4. **Expand namespaces** – add `home.hvac`, `home.plumbing`, etc.
5. **Wire Casa/HomeAdvisor** – connect to the working Precog endpoints

---

**Status:** Ready to implement - Focus on getting ONE working example first.




