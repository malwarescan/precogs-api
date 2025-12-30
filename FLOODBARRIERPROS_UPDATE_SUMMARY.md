# Flood Barrier Pros NDJSON Update - Implementation Summary

**Date:** December 2024  
**Status:** ✅ Code Updated, Ready for Re-ingestion

---

## ✅ **What Was Done**

### **1. NDJSON Schema Extended**

**File:** `precogs-worker/kb/home-foundation/ndjson_home_factlet.schema.json`

Added new **optional** fields to support cost and timing data:

- `cost_range` (string) - Format: "$X,XXX-$X,XXX"
- `cost_p50` (string) - Format: "$X,XXX" (median)
- `cost_p90` (string) - Format: "$X,XXX" (90th percentile)
- `cost_currency` (string) - Default: "USD"
- `best_season` (string) - Free text timing recommendation
- `typical_duration` (string) - Free text duration estimate

**Note:** All fields are optional - ingestion will not fail if missing.

---

### **2. Precogs `home.safety` Enhanced**

**File:** `precogs-worker/src/homePrecog.js`

**Updated `diagnoseTask` function:**
- Extracts `cost_range` from factlets → maps to `cost_band` in response
- Extracts `best_season` from factlets → maps to `when` in response
- Falls back to `cost_p50` if `cost_range` not available
- Falls back to `typical_duration` if `best_season` not available
- Only applies when `domain === "floodbarrierpros.com"`

**Updated `emitAnswer` function:**
- Handles `cost_band` as both string (new) and object (legacy)
- Emits new `when` field in response

---

## 🚀 **Next Steps**

### **For Croutons Team:**

1. **Re-ingest the feed:**
   ```bash
   cd ~/Desktop/croutons.ai/precogs/precogs-api/precogs-worker
   node scripts/ingest-floodbarrierpros.js
   ```

2. **Verify ingestion:**
   - Check that new fields (`cost_range`, `best_season`, etc.) are in factlets
   - Verify domain/vertical tags are correct
   - Confirm no validation errors

3. **Test graph query:**
   ```bash
   curl "https://graph.croutons.ai/api/triples?domain=floodbarrierpros.com&vertical=flood_protection"
   ```

---

### **For Precogs Team:**

1. **Deploy updated worker:**
   ```bash
   cd ~/Desktop/croutons.ai/precogs/precogs-api/precogs-worker
   npx railway up -s precogs-worker
   ```

2. **Test Precogs response:**
   ```bash
   curl -N "https://precogs.croutons.ai/v1/run.ndjson" \
     -H "Authorization: Bearer 9d2f74d5818e28a6c58d74ec4e807ee37e631be8a366e6b7c2855c06bae80ec0" \
     -H "Content-Type: application/json" \
     -d '{
       "precog": "home.safety",
       "task": "diagnose",
       "content": "My garage keeps flooding. ZIP: 34102",
       "region": "34102",
       "domain": "floodbarrierpros.com",
       "vertical": "flood_protection"
     }'
   ```

3. **Verify response includes:**
   - ✅ `cost_band`: "$1,200-$5,600" (or similar)
   - ✅ `when`: "April-May (before hurricane season)" (or similar)

---

## 📋 **Files Changed**

1. ✅ `precogs-worker/kb/home-foundation/ndjson_home_factlet.schema.json`
   - Added 6 new optional fields for cost/timing data

2. ✅ `precogs-worker/src/homePrecog.js`
   - Updated `diagnoseTask` to extract cost_band and when from factlets
   - Updated `emitAnswer` to handle new fields

3. ✅ `FLOODBARRIERPROS_REINGESTION_RESPONSE.md` (new)
   - Detailed response document for Casa team

---

## 🧪 **Testing Checklist**

After re-ingestion and deployment:

- [ ] NDJSON feed fetched successfully
- [ ] New fields validated (no schema errors)
- [ ] Factlets created in graph with new fields
- [ ] Graph query returns factlets with `cost_range` and `best_season`
- [ ] Precogs `home.safety` response includes `cost_band`
- [ ] Precogs `home.safety` response includes `when`
- [ ] Casa API surfaces new fields correctly

---

## 📧 **Message for Casa Team**

**Subject:** Flood Barrier Pros Re-ingestion Ready ✅

Hey Casa team,

The Precogs system is now ready to handle the new cost and timing fields from Flood Barrier Pros:

✅ **Schema Updated** - New optional fields added  
✅ **Precogs Updated** - `home.safety` extracts `cost_band` and `when` from factlets  
✅ **Response Format** - Both fields appear in responses when `domain: "floodbarrierpros.com"`

**Next Steps:**
1. Re-ingest the feed (see command above)
2. Deploy updated Precogs worker
3. Test Precogs response (see test command above)
4. Verify Casa API surfaces new fields

**ETA:** Ready for re-ingestion now. Should take ~5 minutes to complete.

Let me know once you've re-ingested and we can test together!

---

**That's it!** The code is ready. Just need to:
1. Re-ingest the feed
2. Deploy the worker
3. Test the response

