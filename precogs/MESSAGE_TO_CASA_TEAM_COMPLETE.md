# Complete Message to Casa Team

## Subject: Updates: Vertical Fix + Data Requirements Response

---

Hi Casa Team,

Two updates:

## ✅ 1. Vertical Parameter Fix - DEPLOYED

The "vertical is not defined" error has been fixed and deployed.

**What was wrong:** The `home.safety` precog's `diagnoseTask` function was accessing `vertical` without extracting it from context first.

**Fix:** Added `const vertical = context?.vertical || "";` at the beginning of `diagnoseTask`.

**Status:** ✅ Committed and deployed to Railway (auto-deployed ~2-3 minutes ago)

**Next steps:** Please retry your integration tests. You should no longer see "vertical is not defined" errors.

**Test:**
```json
POST https://precogs.croutons.ai/v1/run.ndjson
{
  "precog": "home.safety",
  "task": "diagnose",
  "content": "My garage keeps flooding. ZIP: 33908.",
  "region": "33908",
  "domain": "floodbarrierpros.com",
  "vertical": "flood_protection"
}
```

---

## 📋 2. Data Requirements - Our Response

Thank you for the comprehensive specification. We understand the urgency and impact on Casa's production launch.

### ✅ COMMITTED TO:

**Week 1 (Nov 26):** 7 factlets (1 per namespace) → 32% coverage
- `home.safety` → Basement water pooling
- `home.hvac` → HVAC replacement cost
- `home.plumbing` → Low water pressure
- `home.electrical` → Circuit breaker tripping
- `home.roofing` → Roof replacement timing
- `home.foundation` → Foundation wall cracks
- `home.siding` → Warped vinyl siding

**Week 2 (Dec 3):** Remaining 14 factlets → 100% coverage

**Week 3 (Dec 10):** Regional expansion to NY, CA, Chicago

### 🚀 PROGRESS UPDATE:

**Already completed:**
- ✅ Reddit scraper created for flood protection data (8 Reddit threads scraped)
- ✅ All factlets reference `floodbarrierpros.com` as source
- ✅ Graph service updated to handle Triple records properly
- ✅ Ingestion pipeline ready for new factlets

**This week:**
- ⏳ Confirming data source approach (partner NDJSON feeds vs curated factlets)
- ⏳ Setting up ingestion pipeline for all 7 namespaces
- ⏳ Creating Week 1 factlets (7 topics)

### 📋 QUESTIONS FOR YOU:

1. **Data sources:** Do you have partner NDJSON feeds ready for these topics, or should we proceed with curated factlets based on industry standards?

2. **Regional priority:** Should we start with FL ZIPs first (33908, 33901, 34102), or include all priority regions in Week 1?

3. **Cost data:** National averages or regional-specific? (We can start with national and add regional modifiers in Week 3)

4. **Testing:** Can we get access to your probe tool (`scripts/probe-precogs-knowledge.php`) for validation?

### 📊 SUCCESS CRITERIA:

We're targeting:
- ✅ 70%+ coverage (15 of 22 topics) = Can launch
- ✅ 100% coverage (all 22 topics) = Ideal
- ✅ All 7 namespaces have at least 1 topic with data
- ✅ Top 5 user queries all return specific responses
- ✅ 3+ major metro regions covered (FL, NY, CA minimum)

---

## 📞 Next Steps

1. **Immediate:** Retry integration tests with vertical parameter (should work now)
2. **This week:** We'll confirm data source approach and begin Week 1 factlet creation
3. **Daily updates:** We'll provide progress updates as we create factlets

---

## 📎 Resources

- **Full specification response:** See `RESPONSE_TO_OURCASA_DATA_REQUIREMENTS.md`
- **Reddit scraper:** `precogs-api/precogs-worker/scripts/scrape-reddit-flood-data.js`
- **Graph service:** Updated to handle Triple records properly

---

**Let's get Casa production-ready! 🚀**

**Croutons/Precogs Team**  
November 19, 2025

---

## Quick Copy-Paste Version

```
Hi Casa Team,

Two updates:

✅ 1. Vertical Parameter Fix - DEPLOYED
The "vertical is not defined" error is fixed and deployed. Please retry your 
integration tests - should work now.

📋 2. Data Requirements - COMMITTED
We're committed to:
- Week 1 (Nov 26): 7 factlets (1 per namespace) → 32% coverage
- Week 2 (Dec 3): Remaining 14 factlets → 100% coverage
- Week 3 (Dec 10): Regional expansion

Already completed:
- ✅ Reddit scraper for flood protection data
- ✅ Graph service updated for Triple records
- ✅ Ingestion pipeline ready

Questions:
1. Partner NDJSON feeds ready, or proceed with curated factlets?
2. Start with FL ZIPs first, or all regions in Week 1?
3. National averages or regional-specific costs?
4. Can we get access to your probe tool for validation?

We'll provide daily progress updates. Let's get Casa production-ready!

Croutons/Precogs Team
```

