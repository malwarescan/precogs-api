# Casa x HomeAdvisor AI x Croutons
## Unified Integration Brief for Developers

**Last Updated:** December 2024  
**Status:** Architecture Specification

---

## 0. TL;DR Mental Model

Think in three layers:

1. **Knowledge substrate:** Croutons Graph
2. **Oracles / logic:** Precogs (home, home.*, risk scoring, diagnosis, remediation)
3. **Faces to the world:**
   - HomeAdvisor AI GPT inside OpenAI (chat-based home troubleshooting)
   - Casa (ourcasa.ai + embedded widgets on local service sites)

**Key Principle:** Partner home-service websites never talk to Croutons directly. They talk to Casa. Casa talks to Precogs. Precogs talk to Croutons.

```
Partner Site → Casa → Precogs → Croutons
User Chat → HomeAdvisor AI → Precogs → Croutons
```

---

## 1. Roles of Each System

### Croutons.ai

**Purpose:** Truth substrate and data logistics

**Ingests and normalizes:**
- Local climate, risk, cost, repair trends, materials
- System-level facts (HVAC/plumbing/electrical common failures)
- Regional signals (ZIP-level costs, ideal timing, risk patterns)

**Outputs:**
- Factlets and triples with geospatial enrichment
- Clean, schema-grade, queryable home context

**Role:** Foundation knowledge layer

---

### Precogs (Home Domain)

**Purpose:** Domain oracles that turn Croutons factlets into structured signals

**Namespaces:**
- `home` (generic)
- `home.plumbing`
- `home.hvac`
- `home.electrical` (low-risk tiers only)
- `home.safety`
- `home.safety.mold`

**Tasks:**
- `assess_risk`
- `diagnose`
- `recommend_fixes`
- `local_context`
- `timing`
- `cost_band`
- `risk_projection`

**Role:** Intelligence layer that queries Croutons and returns structured answers

---

### HomeAdvisor AI (GPT)

**Purpose:** Conversational home expert powered by Precogs + Croutons

**Surface:** Consumer GPT inside OpenAI for home advice:
- Troubleshooting, safety checks, step-by-step fixes, when to call a pro

**Behaves as:**
- Frontend conversation layer
- Router into Precogs via a single function: `invoke_precog`
- Does not carry hardcoded system knowledge; always defers domain truth to Precogs

**Role:** Chat interface layer

---

### Casa (ourcasa.ai + partner embeds)

**Purpose:** Warm, local context engine sitting on top of Precogs and Croutons

**Appears as:**
- ourcasa.ai web experience
- Embedded modules on local contractor sites (roofing, HVAC, siding, etc.)

**Primary job:**
- "Understand my home in this area and give me grounded, calm guidance."

**Role:** Localized web interface layer

---

## 2. Shared Core: Precog Invocation Contract

Both HomeAdvisor AI (GPT) and Casa use the same core function to talk to Precogs:

```json
{
  "name": "invoke_precog",
  "description": "Invoke a Precogs oracle to analyze user text or home context using domain-specific knowledge.",
  "parameters": {
    "type": "object",
    "properties": {
      "precog": {
        "type": "string",
        "description": "Precog namespace, e.g., home, home.plumbing, home.hvac, home.safety.mold"
      },
      "content": {
        "type": "string",
        "description": "User message, symptoms, or Casa's structured context summary."
      },
      "task": {
        "type": "string",
        "description": "Task type: assess_risk, diagnose, recommend_fixes, local_context, timing, cost_band, risk_projection"
      }
    },
    "required": ["precog", "content", "task"]
  }
}
```

**This keeps HomeAdvisor and Casa on the same Precog protocol.**

---

## 3. HomeAdvisor AI Flow (ChatGPT-side)

**Pattern:** Input → Intent → Precog → Croutons → Answer

### Example: "My AC is blowing warm air"

**1. User message:**
```
"My AC is blowing warm air."
```

**2. GPT-side routing:**
- Category: HVAC
- Risk: low / non-emergency
- Namespace: `home.hvac`
- Task: `diagnose`

**3. GPT calls:**
```json
{
  "precog": "home.hvac",
  "content": "My AC is blowing warm air.",
  "task": "diagnose"
}
```

**4. Precog worker:**
- Queries Croutons for HVAC issues in general and, if available, region patterns
- Emits NDJSON:

```json
{
  "assessment": "Low refrigerant or clogged coil likely",
  "risk_score": 0.18,
  "likely_causes": [
    "Dirty condenser coils",
    "Low refrigerant",
    "Blocked airflow"
  ],
  "recommended_steps": [
    "Check air filter",
    "Inspect outdoor unit for debris",
    "Ensure thermostat is set correctly"
  ],
  "dangerous_conditions": [],
  "triage_level": "safe"
}
```

**5. GPT constructs the final answer using a deterministic frame:**
1. Diagnosis summary
2. Safety check
3. Immediate steps
4. When to call a pro
5. Prevention tips

**The same pattern is reused across plumbing, electrical (low-risk), mold, etc.**

---

## 4. Casa Flow (Web + Partner Sites)

Casa adds location and property context on top of the same oracles.

### 4.1 Core Casa Data Flow

**User on ourcasa.ai or a partner site:**

**1. User → Casa module:**
- **Inputs:**
  - ZIP / address / approximate location
  - Property type, age, some optional answers ("single-story", "tile roof", etc.)
  - Optional issue description:
    - "Thinking about replacing siding" or "AC unit is 15 years old."

**2. Casa API calls Precogs using `invoke_precog` with local context:**
```json
{
  "precog": "home",
  "content": "ZIP=33908, property=single-family, roof=shingle, distance_to_coast=2.4mi, issue=considering siding replacement",
  "task": "local_context"
}
```

**3. Precog worker queries Croutons for:**
- Weather patterns, storm risk
- UV index norms
- Local siding failure patterns
- Cost bands in this ZIP
- Best timing windows (months) for work

**4. Worker emits structured Casa signals:**
```json
{
  "location_context": {
    "zip": "33908",
    "risk_profile": "high-humidity, high-salt, UV-intense"
  },
  "timing_recommendation": "Best window for siding replacement here is November–February.",
  "cost_band": {
    "currency": "USD",
    "low": 18000,
    "high": 32000,
    "confidence": 0.73
  },
  "risk_projection": {
    "five_year": "Elevated risk of moisture intrusion if siding is original and unsealed.",
    "ten_year": "High probability of visible deterioration without replacement."
  },
  "when_to_call_pro": [
    "Visible swelling or soft spots on siding",
    "Persistent interior wall dampness"
  ]
}
```

**5. Casa UI renders:**
- Calm text, soft visuals, no dashboards
- Clear, local recommendations
- Option to connect with the Casa-enabled contractor on that site

---

### 4.2 Partner Website Embeds

**For a contractor (e.g., siding company, HVAC company):**

**Front-end:**
- A Casa widget embedded via:
  - Simple script tag: `<script src="https://ourcasa.ai/embed.js" data-partner-id="...">`
  - or iframe with a known messaging API

**Back-end:**
- Partner site never talks to Croutons directly
- Partner site → Casa Embed → Casa API → Precogs → Croutons → Casa → Widget UI

**The contractor experiences:**
- Higher-quality leads
- Pre-educated homeowners
- Localized, Casa-branded context that makes them look smarter by default

---

## 5. How HomeAdvisor AI and Casa Intersect

They reuse the same Precog and Croutons backbone, with different surfaces:

**HomeAdvisor AI:**
- Chat-first, symptom/problem-driven
- Always goes: "What's wrong?" → diagnose + safety → steps

**Casa:**
- Context-first, location-driven
- "Where is this home and what is its environment?" → timing + cost + risk

**Intersections:**
- Casa can optionally call the same diagnostic Precogs used by HomeAdvisor AI when a homeowner describes an active problem inside the Casa module
- HomeAdvisor can optionally incorporate Casa-style local context where location is known (future cross-link)

**Key point:** Same namespaces, same `invoke_precog` contract, same NDJSON pattern.

---

## 6. Graph Requirements (Unified Home Domain)

To support both Casa and HomeAdvisor AI, Croutons should maintain home-domain factlets with:

### Entities

**Systems:**
- HVAC, plumbing, electrical, roofing, siding, foundation, pest, landscaping

**Components:**
- Breakers, outlets, condensers, air handlers, drain lines, shingles, panels

**Environment:**
- Climate zones, humidity profiles, wind risk, UV intensity, flood risk

**Economics:**
- Local cost bands, labor rates, material multipliers per region

**Home attributes:**
- Property type, age bands, build materials, distance-to-coast, elevation

### Relationship Types

- `CAUSES`
- `PREVENTS`
- `IS_SYMPTOM_OF`
- `IS_RISK_FOR`
- `REQUIRES_PRO`
- `COMMON_FIX`
- `HAZARD_LEVEL`
- `OPTIMAL_WINDOW_FOR`
- `TYPICAL_COST_BAND_IN`
- `MORE_LIKELY_IN_CLIMATE`

### Factlet Examples

**Troubleshooting-oriented (HomeAdvisor AI):**
```json
{
  "@type": "Factlet",
  "system": "HVAC",
  "symptom": "warm air",
  "cause": "dirty condenser coils",
  "risk_level": "low",
  "recommended_action": "clean outdoor unit coils",
  "professional_required": false
}
```

**Casa-oriented (local context):**
```json
{
  "@type": "Factlet",
  "region": "33908",
  "system": "siding",
  "climate_profile": "high-humidity, coastal, UV-intense",
  "optimal_replacement_window": ["November", "December", "January", "February"],
  "average_replacement_cost_low": 18000,
  "average_replacement_cost_high": 32000,
  "currency": "USD"
}
```

**Precogs convert these into structured signals consumed by both surfaces.**

---

## 7. UX / Brand Philosophy Requirements (Casa)

For anything that bears the Casa identity (ourcasa.ai or embeds):

### Visual
- No harsh banded section breaks
- Background colors and glows should blend across sections
- Predictable vertical spacing; no hero jammed into the nav or floating in space

### Feel
- Calm, warm, quiet intelligence
- Nothing "dashboardy" or "enterprise SaaS"

### Tone
- Direct, plain language
- Local: refer to "in your area," "on your block," "in this ZIP," with actual data
- No vague fluff, no robotic phrasing

**Croutons and Precogs must stay invisible; only Casa and the partner brand are visible.**

---

## 8. Invocation Syntax and Testing

For internal testing, both at CLI and runtime:

### HomeAdvisor-style:
```
/precog@home --task diagnose
My AC is blowing warm air.
```

**Runtime resolves to:**
```json
{
  "precog": "home.hvac",
  "content": "My AC is blowing warm air.",
  "task": "diagnose"
}
```

### Casa-style:
```
/precog@home --task local_context
ZIP=33908, property=single-family, roof_age=18, distance_to_coast=2.4mi
```

**Runtime resolves to:**
```json
{
  "precog": "home",
  "content": "ZIP=33908, property=single-family, roof_age=18, distance_to_coast=2.4mi",
  "task": "local_context"
}
```

**Same `invoke_precog` function. Different prompts and tasks.**

---

## 9. Concrete Dev To-Dos

### 1. Precog Namespaces

**Implement and register:**
- `home`
- `home.plumbing`
- `home.hvac`
- `home.electrical` (low-risk scope only)
- `home.safety`
- `home.safety.mold`

**Location:** `precogs-api/precogs-worker/` - Add namespace routing in worker

---

### 2. Worker Templates

**Shared NDJSON schema across all home workers:**

**Base fields:**
- `assessment`
- `risk_score`
- `likely_causes[]`
- `recommended_steps[]`
- `dangerous_conditions[]`
- `triage_level`

**Casa-specific extensions:**
- `location_context`
- `timing_recommendation`
- `cost_band`
- `risk_projection`
- `when_to_call_pro[]`

**Location:** `precogs-api/precogs-worker/src/` - Create shared response formatter

---

### 3. Croutons Ingestion

**Build ingestion pipelines for:**
- Climate and risk datasets
- Regional cost and contractor data
- System-level repair and failure-mode datasets

**Normalize to Factlet and triple structure described above.**

**Location:** `graph-service/` - Add home domain ingestion

---

### 4. Casa API

**Expose a clean HTTP API that:**
- Accepts home + location context payload
- Calls `invoke_precog` internally
- Returns Casa-shaped JSON to the front-end

**Location:** New service or extend `precogs-api/server.js` with Casa routes

---

### 5. Embed SDK

**Lightweight JS snippet or iframe integration for partner sites:**
- Handles partner ID
- Sends location + simple context to Casa API
- Renders Casa UI consistent with brand philosophy

**Location:** New repo `casa-embed/` or `casa/frontend/embed/`

---

### 6. HomeAdvisor GPT Wiring

**Confirm `invoke_precog` tool is registered in the GPT config.**

**Implement intent parser for mapping user text to:**
- `precog` namespace
- `task` (assess_risk, diagnose, recommend_fixes)

**Ensure GPT uses the NDJSON stream from Precogs to build deterministic, structured answers.**

**Location:** `precogs-api/src/integrations/openai-chat.js` - Update system prompt and function schema

---

### 7. End-to-End Tests

**Test cases for:**

**HomeAdvisor:**
- HVAC warm air issue
- Constantly running toilet

**Casa:**
- "Should I replace my roof?" in a coastal ZIP
- "Best month for siding replacement in [ZIP]" from a partner siding site (Casa embed)

**Verify:**
- Precog namespaces invoked correctly
- NDJSON structure consistent
- Casa UI rendering is calm, blended, and local-feeling

**Location:** `precogs-api/tests/` - Add integration tests

---

## 10. Single-Sentence Summary

**Croutons holds the local and system truth, Precogs turn that truth into structured home intelligence, and then HomeAdvisor AI (chat) and Casa (web + embeds) are just two different faces on top of the same oracle stack.**

---

## Architecture Diagram

```
┌─────────────────┐
│  Partner Site   │
│  (Contractor)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│   Casa Embed    │─────▶│   Casa API   │
│   (Widget)      │      │              │
└─────────────────┘      └──────┬───────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │   Precogs     │
                          │  (home.*)     │
                          └──────┬───────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │   Croutons    │
                          │     Graph     │
                          └──────────────┘
                                 ▲
                                 │
                          ┌──────┴───────┐
                          │   Precogs     │
                          │  (home.*)     │
                          └──────┬───────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │ HomeAdvisor  │
                          │  AI (GPT)     │
                          └──────────────┘
                                 ▲
                                 │
                          ┌──────┴───────┐
                          │     User      │
                          │    (Chat)     │
                          └──────────────┘
```

---

## Key Integration Points

1. **Single Function Contract:** Both Casa and HomeAdvisor AI use `invoke_precog`
2. **Shared Namespaces:** All home domain precogs use `home.*` pattern
3. **Consistent NDJSON:** All workers emit the same base structure
4. **Croutons as Source of Truth:** All domain knowledge flows from Croutons Graph
5. **Casa Brand Philosophy:** Warm, local, calm - no dashboards
6. **HomeAdvisor Chat Pattern:** Symptom → Diagnose → Steps → Safety

---

## Next Steps

1. ✅ Implement Precog namespaces (`home.*`)
2. ✅ Create shared NDJSON response templates
3. ✅ Build Casa API endpoint
4. ✅ Create embed SDK
5. ✅ Wire HomeAdvisor GPT function calling
6. ✅ Build Croutons ingestion pipelines
7. ✅ Write end-to-end tests

---

**Status:** Architecture Specification - Ready for Implementation  
**Last Updated:** December 2024

