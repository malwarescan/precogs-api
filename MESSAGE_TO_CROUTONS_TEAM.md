# Message to Croutons.ai Dev Team

**Subject:** Unified Summary + Clarification Request

---

Team,

I've gone through the three documents you provided (GPT_INTEGRATION_GUIDE.md, GPT_QUICK_START.md, and UNIFIED_INTEGRATION_BRIEF.md). Below is my consolidated understanding of how our HomeAdvisor AI GPT and Casa (ourcasa.ai + partner embeds) should integrate into the existing Precogs + Croutons architecture. Please confirm that this interpretation is correct before we proceed to implementation.

---

## 1. Core Understanding

Both HomeAdvisor AI (the GPT) and Casa (web + partner embeds) should use the same Precog function contract, which your integration guide already defines via `invoke_precog`.

**Precogs are the oracle layer, Croutons is the truth layer, GPT/Casa are simply different interface layers.**

**Contract:**
```
invoke_precog(precog, content, task)
```

Everything routes through this, whether it's schema validation, home troubleshooting (HomeAdvisor), or local context interpretation (Casa).

---

## 2. We Adopt Your Official Function Spec

We follow the exact structure you defined in GPT_INTEGRATION_GUIDE.md:

- Same structure
- Same field names
- Same NDJSON stream pattern
- Same job/event pipeline
- Same system prompt requirements
- Same rules for inline vs URL mode
- Same expectation that GPT never infers fields that Precogs should decide

**We are not creating a new function; we are extending the existing one.**

For the home domain, the parameters stay identical — only precog namespaces and task values expand.

---

## 3. HomeAdvisor AI GPT — Required Integration

HomeAdvisor AI will use:

**Precog namespaces:**
- `home`
- `home.hvac`
- `home.plumbing`
- `home.electrical` (low risk)
- `home.safety`
- `home.safety.mold`

**Tasks:**
- `diagnose`
- `assess_risk`
- `recommend_fixes`

**Flow:**
```
GPT → invoke_precog → Precog worker → Croutons → NDJSON → GPT final formatting
```

The GPT logic layer does zero domain reasoning without confirmation from Precogs.

---

## 4. Casa (ourcasa.ai + partner websites) — Required Integration

Casa uses the same function and namespaces, but adds Casa-specific tasks:

**Tasks:**
- `local_context`
- `timing`
- `risk_projection`
- `cost_band`

**Input payload:** Location + home attributes + optional issue

**Example (sent as content):**
```
ZIP=33908, property=single-family, roof_age=18, distance_to_coast=2.4mi
```

**Output expectations:**

Precog worker emits Casa-specific fields from your spec:
- `location_context`
- `timing_recommendation`
- `cost_band`
- `risk_projection`
- `when_to_call_pro[]`

Casa then renders these in the front end using your brand/UX principles.

**Again: Casa never queries Croutons directly. Only Precogs do.**

---

## 5. Data Layer Requirements

From the unified brief, all home-domain intelligence must be expressed as Crouton factlets and triples with the expected schema:

**Systems & components:**
(HVAC, siding, electrical, plumbing, foundation, etc.)

**Environment:**
(ZIP-level humidity, UV, storms, flood, cost bands, labor rates)

**Relationships:**
`CAUSES`, `IS_SYMPTOM_OF`, `REQUIRES_PRO`, `OPTIMAL_WINDOW_FOR`, `TYPICAL_COST_BAND_IN`, etc.

Precogs convert these factlets into structured signals using the NDJSON response template in your spec.

---

## 6. Technical Alignment With Your Documents

The HomeAdvisor/Casa flow perfectly matches your existing architecture:

**From GPT_INTEGRATION_GUIDE.md:**
- We strictly use `invoke_precog`
- We strictly adhere to inline content when data is provided
- We follow your system prompt rules
- We rely fully on the NDJSON job pattern
- We use the worker stream for deterministic results
- We do not invent any new RPC or endpoint

**From GPT_QUICK_START.md:**
- We follow required/default parameters
- We follow the exact example patterns
- We provide stream URLs to the user when appropriate

**From UNIFIED_INTEGRATION_BRIEF.md:**
- Casa + HomeAdvisor = two front-ends over the same oracle layer
- Precogs = home domain oracles
- Croutons = home knowledge substrate
- Partner sites → Casa → Precogs → Croutons (never directly to Croutons)

**Everything fits into your standardized pipeline without modification.**

---

## 7. What We Need Confirmed Before We Proceed

### A. Confirm these new home namespaces are acceptable within the existing Precog registry:
- `home`
- `home.hvac`
- `home.plumbing`
- `home.electrical`
- `home.safety`
- `home.safety.mold`

### B. Confirm these new Precog tasks can be added cleanly:
- `diagnose`
- `assess_risk`
- `recommend_fixes`
- `local_context`
- `timing`
- `cost_band`
- `risk_projection`

### C. Confirm the home-domain NDJSON response template is approved:

**Base fields:**
- `assessment`
- `risk_score`
- `likely_causes[]`
- `recommended_steps[]`
- `dangerous_conditions[]`
- `triage_level`

**Casa extensions:**
- `location_context`
- `timing_recommendation`
- `cost_band`
- `risk_projection`
- `when_to_call_pro[]`

### D. Confirm ingestion requirements:
- Home system factlets
- Regional context factlets
- Cost/risk/timing factlets
- Triples with the relationship types listed above

### E. Confirm that all of this uses the existing job/worker API with no new endpoints.

---

## 8. If All Is Correct, Next Steps on Our Side

- Configure GPT HomeAdvisor model with your system prompt + function spec
- Configure Casa API to wrap `invoke_precog` internally
- Build Casa front-end widgets using the NDJSON outputs
- Begin ingestion pipelines for home intelligence into Croutons Graph
- Begin writing the home Precog workers extending your existing code patterns
- Begin end-to-end tests using the CLI + NDJSON streams

---

**If this interpretation matches your expectations, we can begin implementation immediately.**

Let me know what needs to be adjusted.

---

**Ready to copy-paste into email/Slack/issue tracker**

