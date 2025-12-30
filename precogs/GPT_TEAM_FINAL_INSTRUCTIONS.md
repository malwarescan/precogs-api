# GPT Implementation Team - Final Instructions

**For:** GPT Development Team  
**Date:** 2025-01-05  
**Status:** ✅ Ready for Integration

---

## Quick Summary

**One function for all precogs:** `invoke_precog`

- Schema validation: `invoke_precog(precog="schema")`
- Home issues: `invoke_precog(precog="home.hvac")`
- **Bangkok Massage: `invoke_precog(precog="bkk_massage")`** ← New!

---

## Function Definition

Use the existing `invoke_precog` function. No new function needed.

**Function Name:** `invoke_precog`

**For Bangkok Massage queries, use:**
```json
{
  "precog": "bkk_massage",
  "content_source": "inline",
  "content": "User's question about Bangkok massage",
  "task": "district_aware_ranking",  // or other task
  "region": "Asok"  // District name if mentioned
}
```

---

## System Prompt Addition

Add this section to your GPT system prompt:

```
**Bangkok Massage Intelligence:**

When users ask about massage services in Bangkok, call invoke_precog with:
- precog="bkk_massage"
- content_source="inline"
- content: User's full question about Bangkok massage
- task: Infer from user intent:
  - "district_aware_ranking" - User asks for recommendations (default)
  - "legitimacy_scoring" - User asks if a shop is legitimate/safe
  - "safety_pattern_recognition" - User asks about safety patterns
  - "price_sanity_checking" - User asks about pricing
- region: Extract district from user message if mentioned (Asok, Nana, Phrom Phong, Thonglor, Ekkamai, Silom, Ari, Victory Monument, Ratchada, Old City)

After calling invoke_precog, provide the stream_url or cli_url so the user can watch results in real-time. The response will include merged shop data with ratings, pricing, Line usernames, websites, and safety information.
```

---

## Example Queries

### Query 1: District Recommendation
**User:** "Where can I get a massage in Asok?"

**Function Call:**
```json
{
  "name": "invoke_precog",
  "arguments": {
    "precog": "bkk_massage",
    "content_source": "inline",
    "content": "Where can I get a massage in Asok?",
    "task": "district_aware_ranking",
    "region": "Asok"
  }
}
```

### Query 2: Pricing
**User:** "What are the prices in Nana?"

**Function Call:**
```json
{
  "name": "invoke_precog",
  "arguments": {
    "precog": "bkk_massage",
    "content_source": "inline",
    "content": "What are the prices in Nana?",
    "task": "price_sanity_checking",
    "region": "Nana"
  }
}
```

### Query 3: Safety Check
**User:** "Is this shop safe for solo women?"

**Function Call:**
```json
{
  "name": "invoke_precog",
  "arguments": {
    "precog": "bkk_massage",
    "content_source": "inline",
    "content": "Is this shop safe for solo women?",
    "task": "legitimacy_scoring",
    "region": ""
  }
}
```

---

## Response Format

The function returns:
```json
{
  "job_id": "job_abc123",
  "status": "pending",
  "stream_url": "https://precogs.croutons.ai/v1/jobs/job_abc123/events",
  "ndjson_url": "https://precogs.croutons.ai/v1/run.ndjson",
  "cli_url": "https://precogs.croutons.ai/cli?precog=bkk_massage"
}
```

**Stream the results** from `stream_url` to get:
- Shop recommendations
- Ratings and reviews
- Pricing information
- Line usernames
- Websites
- Safety signals

---

## Task Inference Logic

```javascript
function inferTask(query) {
  const lower = query.toLowerCase();
  
  if (lower.includes("price") || lower.includes("cost")) {
    return "price_sanity_checking";
  }
  if (lower.includes("safe") || lower.includes("legitimate") || lower.includes("verify")) {
    return "legitimacy_scoring";
  }
  if (lower.includes("safety") || lower.includes("risk")) {
    return "safety_pattern_recognition";
  }
  return "district_aware_ranking"; // default
}

function extractDistrict(query) {
  const districts = [
    "Asok", "Nana", "Phrom Phong", "Thonglor", "Ekkamai",
    "Silom", "Ari", "Victory Monument", "Ratchada", "Old City"
  ];
  
  const lower = query.toLowerCase();
  for (const district of districts) {
    if (lower.includes(district.toLowerCase())) {
      return district;
    }
  }
  return null;
}
```

---

## Testing

### Test Query
Ask GPT: **"Find a safe massage in Asok"**

**Expected:**
1. GPT calls `invoke_precog(precog="bkk_massage", content="...", task="district_aware_ranking", region="Asok")`
2. Returns `job_id` and `stream_url`
3. Stream results show shop recommendations with ratings, pricing, etc.

---

## No Changes Needed

✅ **You already have `invoke_precog` function**  
✅ **Just add `"bkk_massage"` to the precog enum** (if you have one)  
✅ **Update system prompt** with Bangkok massage section  
✅ **That's it!**

---

## Support

- **API Endpoint:** `https://precogs.croutons.ai`
- **Documentation:** See `GPT_IMPLEMENTATION_INSTRUCTIONS.md` in corpus directory
- **Questions:** Contact Precogs dev team

---

**Ready to integrate!** Just use `invoke_precog` with `precog="bkk_massage"` ✅

