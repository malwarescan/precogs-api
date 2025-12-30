# GPT Team - Quick Checklist

## ✅ What's Already Done

1. **Function Definition** - `invoke_precog` already includes `"bkk_massage"` in the enum
2. **API Endpoint** - Public and working at `https://precogs.croutons.ai/v1/run.ndjson`
3. **No Auth Required** - Endpoint is public, no API keys needed
4. **Data Working** - Returns real shop data from corpus

## ✅ What GPT Team Needs to Do

### Option 1: If `invoke_precog` Already Has `bkk_massage` ✅

**Nothing!** It should already work.

Just test:
```
Ask GPT: "Find a safe massage in Asok"
```

If GPT calls `invoke_precog(precog="bkk_massage")` → **Done!**

### Option 2: If `bkk_massage` Not in Enum Yet

**Add to enum:**
```json
{
  "precog": {
    "enum": [..., "bkk_massage"]
  }
}
```

### Option 3: Update System Prompt (Recommended)

**Add this to GPT system prompt:**

```
**Bangkok Massage Intelligence:**

When users ask about massage services in Bangkok, call invoke_precog with:
- precog="bkk_massage"
- content_source="inline"
- content: User's full question
- task: Infer from intent (district_aware_ranking, legitimacy_scoring, price_sanity_checking, safety_pattern_recognition)
- region: Extract district if mentioned (Asok, Nana, Phrom Phong, Thonglor, Ekkamai, Silom, Ari, Victory Monument, Ratchada, Old City)
```

---

## Quick Test

**Test Query:**
```
"Find a safe massage in Asok"
```

**Expected:**
- GPT calls `invoke_precog(precog="bkk_massage", content="...", region="Asok")`
- Returns shop recommendations

---

## Summary

**Minimum:** Verify `bkk_massage` is in the `precog` enum (it should be already)

**Recommended:** Add system prompt section for Bangkok massage queries

**That's it!** The API is working, no configuration needed.

