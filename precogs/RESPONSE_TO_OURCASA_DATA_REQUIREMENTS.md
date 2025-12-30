# Response to OurCasa Team: Data Requirements

**Date:** November 19, 2025  
**From:** Croutons/Precogs Team  
**To:** OurCasa Team  
**Subject:** RE: URGENT - Casa Data Requirements: 95% of Queries Failing

---

## ✅ Acknowledgment

Thank you for the comprehensive specification. We understand the urgency and the impact on Casa's production launch.

**Current Status:** Acknowledged and prioritized.

**Action Plan:** We will populate the Croutons graph with factlets for all 21 required topics across 7 namespaces.

---

## 📋 Understanding

**What We Received:**
- ✅ Complete specification with JSON examples for all 21 topics
- ✅ Required fields clearly defined (causes, actions, costs, timing, regions)
- ✅ Priority regions identified (FL, NY, CA metros)
- ✅ Success criteria (70%+ coverage for launch)
- ✅ Testing instructions via probe tool

**What We Need to Deliver:**
- 21 factlets across 7 namespaces:
  - `home.safety` (3): Basement water, Bathroom mold, Foundation cracks
  - `home.hvac` (3): HVAC cost, AC not cooling, Furnace noises
  - `home.plumbing` (3): Low pressure, Running toilet, Pipe leak
  - `home.electrical` (3): Breaker tripping, Flickering lights, Panel upgrade
  - `home.roofing` (3): Replacement timing, Missing shingles, Gutter overflow
  - `home.foundation` (3): Wall cracks, Uneven settling, Basement moisture
  - `home.siding` (3): Warped vinyl, Peeling paint, Fiber cement cost

---

## 🎯 Proposed Timeline

### Week 1: Foundation (7 factlets - 1 per namespace)
**Target: November 26, 2025**

**Priority Topics:**
1. `home.safety` → Basement water pooling
2. `home.hvac` → HVAC replacement cost
3. `home.plumbing` → Low water pressure
4. `home.electrical` → Circuit breaker tripping
5. `home.roofing` → Roof replacement timing
6. `home.foundation` → Foundation wall cracks
7. `home.siding` → Warped vinyl siding

**Result:** 32% coverage → Can demo all verticals

### Week 2: Complete Coverage (14 remaining factlets)
**Target: December 3, 2025**

**Remaining Topics:**
- `home.safety` (2): Bathroom mold, Foundation cracks
- `home.hvac` (2): AC not cooling, Furnace noises
- `home.plumbing` (2): Running toilet, Pipe leak
- `home.electrical` (2): Flickering lights, Panel upgrade
- `home.roofing` (2): Missing shingles, Gutter overflow
- `home.foundation` (2): Uneven settling, Basement moisture
- `home.siding` (2): Peeling paint, Fiber cement cost

**Result:** 100% coverage → Production ready

### Week 3: Regional Expansion
**Target: December 10, 2025**

- Expand to additional metros (NY, CA, Chicago)
- Add regional variations
- Validate coverage across all priority ZIPs

---

## 🔧 Implementation Plan

### Data Sources

**Option 1: Partner Data (Preferred)**
- If you have partner sites (like Flood Barrier Pros) that can provide verified data for these topics, we can ingest their NDJSON feeds
- Format: Same as `floodbarrierpros.com/sitemaps/sitemap-ai.ndjson`

**Option 2: Curated Factlets**
- We'll create factlets based on industry standards, verified contractor data, and regional expertise
- Sources: HomeAdvisor cost data, contractor associations, regional building codes

**Question:** Do you have partner sites ready to provide NDJSON feeds for these topics, or should we proceed with curated factlets?

### Ingestion Method

We'll use the existing ingestion pipeline:

```bash
# Ingestion script location
precogs-api/precogs-worker/scripts/ingest-home-sources.js

# Or create new namespace-specific ingestion scripts
# Each namespace can have its own NDJSON source
```

**Format:** Factlets will follow the exact structure you specified:
- `@type: "HomeIssue"` or `"HomeCost"`
- All required fields (symptom, causes, actions, costs, timing, regions)
- Proper `risk_regions` array with ZIP codes
- `triage_level` and `risk_score` for safety prioritization

### Testing

**After each batch:**
1. Ingest factlets to graph service
2. Run your probe tool: `OURCASA_PRECOGS_API_KEY=xxx php scripts/probe-precogs-knowledge.php`
3. Verify responses are specific (not generic)
4. Check coverage percentage

**Validation Criteria:**
- ✅ Factlets appear in graph query results
- ✅ Precogs return specific causes/actions (not generic)
- ✅ Cost data present
- ✅ Regional filtering works
- ✅ Probe tool shows ✅ (not ⚠️)

---

## ❓ Questions & Clarifications

### 1. Data Source Priority
**Q:** Should we prioritize partner NDJSON feeds, or proceed with curated factlets?
- If partners: Which domains/URLs should we expect?
- If curated: Any specific data sources you want us to reference?

### 2. Regional Coverage
**Q:** For Week 1, should we focus on FL ZIPs first (33908, 33901, 34102), or include all priority regions?
- **Proposal:** Start with FL (where Flood Barrier Pros data exists), expand in Week 3

### 3. Cost Data Accuracy
**Q:** Cost ranges (`cost_range`, `cost_p50`, `cost_p90`) - should these be:
- National averages?
- Regional-specific (FL vs NY vs CA)?
- **Proposal:** Start with national averages, add regional modifiers in Week 3

### 4. Vertical Tagging
**Q:** Should factlets be tagged with specific verticals (e.g., `vertical: "hvac"`, `vertical: "plumbing"`)?
- **Current:** Factlets use `domain` and `corpus_id`
- **Proposal:** Add `vertical` field to factlets for better filtering

### 5. Testing Access
**Q:** Can you provide:
- Access to your probe tool for validation?
- Or should we test via Precogs API directly?

---

## 🚀 Next Steps

### Immediate (This Week)
1. ✅ **Acknowledge requirements** ← We are here
2. ⏳ **Confirm data source approach** (partner feeds vs curated)
3. ⏳ **Set up ingestion pipeline** for new factlets
4. ⏳ **Create Week 1 factlets** (7 topics, 1 per namespace)

### Week 1 Deliverables
- [ ] 7 factlets ingested and validated
- [ ] Probe tool shows 32%+ coverage
- [ ] All 7 namespaces have at least 1 working topic
- [ ] Documentation updated

### Week 2 Deliverables
- [ ] Remaining 14 factlets ingested
- [ ] Probe tool shows 100% coverage
- [ ] All 22 topics return specific responses
- [ ] Production ready confirmation

---

## 📞 Communication

**Status Updates:**
- Daily progress updates via email/Slack
- Weekly summary with coverage metrics
- Immediate notification when Week 1 batch is ready for testing

**Blockers:**
- If we encounter any blockers (data source issues, format questions), we'll escalate immediately

**Testing:**
- We'll coordinate testing schedule with you
- Can test incrementally (as each factlet is ingested) or wait for full batches

---

## ✅ Commitment

**We commit to:**
- ✅ Week 1 delivery (7 factlets) by November 26, 2025
- ✅ Week 2 delivery (remaining 14) by December 3, 2025
- ✅ 100% coverage for all 22 topics
- ✅ All priority regions covered
- ✅ Production-ready quality (specific responses, not generic)

**Success Metric:**
- Your probe tool shows ✅ for all 22 topics
- Coverage: 100% (22/22)
- Casa can launch as general home advisor

---

## 📎 Attachments

- [ ] Week 1 factlet drafts (for review before ingestion)
- [ ] Ingestion validation logs
- [ ] Probe tool test results

---

**Let's get Casa production-ready! 🚀**

**Croutons/Precogs Team**  
November 19, 2025

---

## Quick Response (Copy-Paste Ready)

```
Hi OurCasa Team,

Thank you for the comprehensive specification. We understand the urgency 
and impact on Casa's production launch.

✅ COMMITTED TO:
- Week 1 (Nov 26): 7 factlets (1 per namespace) → 32% coverage
- Week 2 (Dec 3): Remaining 14 factlets → 100% coverage
- Week 3 (Dec 10): Regional expansion to NY, CA, Chicago

📋 QUESTIONS:
1. Data sources: Do you have partner NDJSON feeds ready, or should we 
   proceed with curated factlets?
2. Regional priority: Start with FL ZIPs first, or include all regions 
   in Week 1?
3. Cost data: National averages or regional-specific?
4. Testing: Can we get access to your probe tool for validation?

🚀 NEXT STEPS:
- This week: Confirm data source approach, set up ingestion pipeline
- Week 1: Deliver 7 factlets (basement water, HVAC cost, low pressure, 
  breaker tripping, roof timing, foundation cracks, warped siding)
- Week 2: Complete remaining 14 topics

We'll provide daily progress updates and coordinate testing schedule.

Let's get Casa production-ready!

Croutons/Precogs Team
```

