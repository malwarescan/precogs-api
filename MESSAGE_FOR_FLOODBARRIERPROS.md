# Message for Flood Barrier Pros (Partner)

**Subject:** NDJSON Feed Update Needed - Cost and Timing Fields

---

Hey Flood Barrier Pros team,

We've updated our ingestion system to support the new cost and timing fields you mentioned. However, when we checked your NDJSON feed, we don't see the new fields yet.

---

## 📋 **What We Need**

Please verify your NDJSON feed at:
```
https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson
```

**Expected fields for location pages:**
```json
{
  "@id": "https://floodbarrierpros.com/home-flood-barriers/naples",
  "@type": "WebPage",
  "location": "Naples, FL",
  
  // NEW FIELDS NEEDED:
  "cost_range": "$1,200-$5,600",
  "cost_p50": "$3,400",
  "cost_p90": "$5,160",
  "cost_currency": "USD",
  "best_season": "April-May (before hurricane season)",
  "typical_duration": "1-2 days installation"
}
```

---

## ✅ **What We've Done**

1. ✅ Updated our schema to accept these new fields
2. ✅ Updated Precogs to extract and surface `cost_band` and `when` in responses
3. ✅ Successfully ingested 80 factlets from your current feed
4. ✅ Deployed updated system to production

---

## 🚀 **Next Steps**

1. **You:** Update your NDJSON feed with the new cost/timing fields
2. **Us:** Re-run ingestion to pick up the new fields
3. **Us:** Test that responses include cost_band and when
4. **You:** Test via Casa API to verify integration works

---

## 🧪 **How to Verify Your Feed**

You can test your feed with:
```bash
curl -s "https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson" | \
  jq '.[] | select(."@id" | contains("naples")) | {id: ."@id", cost_range, best_season}'
```

**Expected:** Should show `cost_range` and `best_season` fields.

---

## 📧 **Once Updated**

Just let us know when the feed is updated, and we'll:
1. Re-run ingestion immediately
2. Test the response
3. Confirm everything is working

**ETA:** Once feed is updated, we can have it live within 5-10 minutes.

---

## ❓ **Questions?**

- Field format questions? See schema: `ndjson_home_factlet.schema.json`
- Need example? Check our documentation
- Technical issues? Let us know!

---

Thanks! Looking forward to getting this live. 🚀

**Croutons/Precogs Team**





