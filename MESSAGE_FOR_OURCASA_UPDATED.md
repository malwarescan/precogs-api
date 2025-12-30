# Message for OurCasa Team - Updated

**Subject:** Flood Barrier Pros Integration - Cost & Timing Fields Now Live ✅

---

Hey OurCasa team,

Great news! The cost and timing fields are now working. Here's what changed:

---

## ✅ **What's Fixed**

1. ✅ **NDJSON Fallback Added** - Precogs now fetches directly from the partner's NDJSON feed when the graph API isn't available
2. ✅ **Region Matching Improved** - Better matching logic to find location-specific data
3. ✅ **Cost & Timing Extraction** - Now correctly extracts `cost_band` and `when` from factlets
4. ✅ **Deployed to Production** - Changes are live on Railway

---

## 🧪 **Test It Now**

```bash
curl -N "https://precogs.croutons.ai/v1/run.ndjson" \
  -H "Authorization: Bearer 9d2f74d5818e28a6c58d74ec4e807ee37e631be8a366e6b7c2855c06bae80ec0" \
  -H "Content-Type: application/json" \
  -d '{
    "precog": "home.safety",
    "task": "diagnose",
    "content": "My garage keeps flooding. ZIP: 34102",
    "region": "Naples, FL",
    "domain": "floodbarrierpros.com",
    "vertical": "flood_protection"
  }'
```

**Expected Response:**
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

## 📊 **What Changed**

**Before:**
- Graph API returned 404
- No factlets available
- No cost/timing data

**After:**
- Graph API still returns 404 (not implemented yet)
- **But:** Precogs now falls back to NDJSON feed
- Fetches 662 factlets directly from `floodbarrierpros.com/sitemaps/sitemap-ai.ndjson`
- Extracts cost and timing data automatically

---

## 🚀 **Status**

- ✅ **Code:** Deployed to production
- ✅ **Feed:** Updated with 662 entries (582 with cost/timing data)
- ✅ **Testing:** Ready for your integration tests

---

## 📋 **Next Steps**

1. **Test the endpoint** with the command above
2. **Verify** `cost_band` and `when` appear in responses
3. **Integrate** into your Casa API calls
4. **Let us know** if you see any issues!

---

## ❓ **Questions?**

- API key issues? Check `OURCASA_API_KEY.md`
- Integration help? See `PRECOGS_INTEGRATION_README.md`
- Need more regions? The feed has 582 location pages with cost data

---

**Ready to go!** 🚀

**Croutons/Precogs Team**




