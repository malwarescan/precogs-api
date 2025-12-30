# Flood Barrier Pros Re-ingestion - Response

**Date:** December 2024  
**Status:** ✅ Ready for Re-ingestion

---

## ✅ **Updates Completed**

### **1. NDJSON Schema Updated**

Updated `ndjson_home_factlet.schema.json` to include new optional fields:

- ✅ `cost_range` (string) - Format: "$X,XXX-$X,XXX"
- ✅ `cost_p50` (string) - Format: "$X,XXX"
- ✅ `cost_p90` (string) - Format: "$X,XXX"
- ✅ `cost_currency` (string) - Default: "USD"
- ✅ `best_season` (string) - Free text
- ✅ `typical_duration` (string) - Free text

**Note:** All fields are **optional** - will not block ingestion if missing.

---

### **2. Precogs `home.safety` Updated**

Updated `diagnoseTask` in `homePrecog.js` to:

- ✅ Extract `cost_range` from factlets → map to `cost_band` in response
- ✅ Extract `best_season` from factlets → map to `when` in response
- ✅ Fallback to `cost_p50` if `cost_range` not available
- ✅ Fallback to `typical_duration` if `best_season` not available
- ✅ Only applies when `domain === "floodbarrierpros.com"`

**Code Location:** `precogs-worker/src/homePrecog.js` (lines 167-243)

---

### **3. Response Format Updated**

Updated `emitAnswer` function to handle:

- ✅ `cost_band` as string (new format from factlets)
- ✅ `cost_band` as object (legacy format)
- ✅ New `when` field in response

**Code Location:** `precogs-worker/src/homePrecog.js` (lines 411-425)

---

## 🚀 **Re-ingestion Instructions**

### **Option 1: Run Ingestion Script (Recommended)**

```bash
cd ~/Desktop/croutons.ai/precogs/precogs-api/precogs-worker
node scripts/ingest-floodbarrierpros.js
```

**Expected Output:**
```
=== Ingesting FloodBarrierPros NDJSON ===
URL: https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson

✅ Ingestion successful!
   Partner: FloodBarrierPros
   Total factlets: [count]
   Successful: [count]
   Failed: 0
```

---

### **Option 2: Via Croutons Admin UI (When Available)**

1. Navigate to Croutons Admin → AI Sitemap Sources
2. Find `floodbarrierpros.com` source
3. Click "Re-ingest Now" or "Force Refresh"
4. Monitor ingestion status

---

### **Option 3: Manual API Call (If Endpoint Exists)**

```bash
curl -X POST https://graph.croutons.ai/api/sources/floodbarrierpros.com/ingest \
  -H "Authorization: Bearer [API_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

---

## 🧪 **Validation Steps**

### **1. Verify Ingestion**

```bash
# Check if new fields are in graph
curl "https://graph.croutons.ai/api/triples?domain=floodbarrierpros.com&vertical=flood_protection" \
  | jq '.[] | select(.cost_range or .best_season)'
```

**Expected:** Factlets with `cost_range`, `cost_p50`, `best_season`, `typical_duration` fields

---

### **2. Test Precogs Response**

```bash
curl -N "https://precogs.croutons.ai/v1/run.ndjson" \
  -H "Authorization: Bearer 9d2f74d5818e28a6c58d74ec4e807ee37e631be8a366e6b7c2855c06bae80ec0" \
  -H "Content-Type: application/json" \
  -d '{
    "precog": "home.safety",
    "task": "diagnose",
    "content": "My garage keeps flooding when it rains. ZIP: 34102",
    "region": "34102",
    "domain": "floodbarrierpros.com",
    "vertical": "flood_protection"
  }'
```

**Expected Response Fields:**
```json
{
  "assessment": "...",
  "risk_score": 0.75,
  "likely_causes": [...],
  "recommended_steps": [...],
  "cost_band": "$1,200-$5,600",  // ✅ NEW
  "when": "April-May (before hurricane season)"  // ✅ NEW
}
```

---

### **3. Test Casa API Integration**

```bash
curl -X POST https://ourcasa.ai/api/home-advice \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Need flood protection for my garage",
    "zip": "34102",
    "domain": "floodbarrierpros.com",
    "vertical": "flood_protection"
  }'
```

**Expected:**
- ✅ `cost_band` populated with `"$1,200-$5,600"`
- ✅ `when` populated with `"April-May (before hurricane season)"`

---

## 📊 **Field Mapping**

| NDJSON Field | Croutons Graph | Precogs Response Field |
|--------------|---------------|----------------------|
| `cost_range` | `cost_range` | `cost_band` (string) |
| `cost_p50` | `cost_p50` | `cost_band` (fallback) |
| `cost_p90` | `cost_p90` | (internal use) |
| `best_season` | `best_season` | `when` (string) |
| `typical_duration` | `typical_duration` | `when` (fallback) |

---

## ✅ **Validation Checklist**

After re-ingestion, verify:

- [ ] Feed fetched successfully from `https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson`
- [ ] New fields (`cost_range`, `cost_p50`, `best_season`, `typical_duration`) validated against schema
- [ ] Factlets created/updated in graph with new fields
- [ ] Tagged correctly: `domain=floodbarrierpros.com`, `vertical=flood_protection`
- [ ] Cost/timing fields queryable via graph API
- [ ] Precogs `home.safety` can access new fields
- [ ] Test query returns `cost_band` and `when` in response
- [ ] Casa API surfaces new fields correctly

---

## 🚨 **Potential Issues & Fixes**

### **Issue: Schema validation fails**

**Cause:** New fields not recognized  
**Fix:** Schema already updated - should pass validation

---

### **Issue: Precogs doesn't surface cost_band/when**

**Cause:** Factlets not matching region or domain filter  
**Fix:** 
1. Verify factlets have `domain: "floodbarrierpros.com"` tag
2. Check if region matching logic needs adjustment
3. Verify graph query returns factlets with new fields

---

### **Issue: cost_band format mismatch**

**Cause:** Precogs expects object but receives string  
**Fix:** Already handled - `emitAnswer` supports both formats

---

## 📝 **Next Steps**

1. **Run re-ingestion** using script above
2. **Validate** new fields are in graph
3. **Test** Precogs response includes `cost_band` and `when`
4. **Notify** Casa team when ready for testing
5. **Monitor** for any errors in ingestion logs

---

## 📧 **Status Update for Casa Team**

**Subject:** Flood Barrier Pros Re-ingestion Ready ✅

Hey Casa team,

The Precogs system is now ready to handle the new cost and timing fields from Flood Barrier Pros:

✅ **Schema Updated** - New optional fields added (`cost_range`, `cost_p50`, `best_season`, `typical_duration`)  
✅ **Precogs Updated** - `home.safety` now extracts `cost_band` and `when` from factlets  
✅ **Response Format** - Both fields will appear in Precogs responses when `domain: "floodbarrierpros.com"`

**Next Steps:**
1. Re-ingest the feed (run `node scripts/ingest-floodbarrierpros.js`)
2. Test Precogs response (see test command above)
3. Verify Casa API surfaces new fields

**ETA:** Ready for re-ingestion now. Should take ~5 minutes to complete.

Let me know once you've re-ingested and we can test together!

---

**Files Changed:**
- `precogs-worker/kb/home-foundation/ndjson_home_factlet.schema.json` (added new optional fields)
- `precogs-worker/src/homePrecog.js` (updated `diagnoseTask` and `emitAnswer`)

**Deployment:** Changes are in codebase, ready to deploy worker after re-ingestion.

