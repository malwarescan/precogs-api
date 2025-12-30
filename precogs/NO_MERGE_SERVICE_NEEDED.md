# Fixed: No External Merge Service Needed!

## Problem

We were requiring `BKK_MERGE_API_URL` to be set, which was confusing and unnecessary.

## Solution

**Removed external merge service dependency!**

The worker now loads corpus data **directly** from the corpus files, just like other precogs do.

## What Changed

1. **Worker loads corpus directly** - No HTTP call to merge service
2. **No BKK_MERGE_API_URL needed** - Removed that requirement
3. **Works like other precogs** - Same pattern as home/schema precogs

## How It Works Now

```
GPT → invoke_precog(precog="bkk_massage")
     → Precogs API
     → Worker (bkkMassagePrecog.js)
     → Loads corpus files directly (no external service!)
     → Returns results
```

## Corpus Files Location

Worker looks for corpus files at:
- `corpora/thailand/bangkok/massage/shops_legit.ndjson`
- Relative to worker file or project root

## No Configuration Needed!

- ✅ No `BKK_MERGE_API_URL` environment variable
- ✅ No separate merge service deployment
- ✅ Works out of the box

---

**Much simpler!** The worker is self-contained now, just like the other precogs.

