# GPT Team - Authentication Instructions

## Issue Fixed ✅

The `/v1/run.ndjson` endpoint now allows **public access** for GPT function calling. Authentication is optional.

## For GPT Configuration

### Option 1: No Authentication (Recommended for GPT)

**Just use the endpoint directly:**
```
https://precogs.croutons.ai/v1/run.ndjson
```

**No Authorization header needed** - the endpoint now allows public access.

### Option 2: With Authentication (If You Have API Key)

If you want to use authentication (optional):

**Header:**
```
Authorization: Bearer YOUR_API_KEY
```

**Get API Key:**
- Railway → Precogs API → Variables → `API_KEY`

---

## Updated Tool Manifest

**No changes needed** - endpoint works without auth now.

**Endpoint:** `https://precogs.croutons.ai/v1/run.ndjson`  
**Method:** `POST`  
**Auth:** Optional (not required)

---

## Test Command (No Auth Needed)

```bash
curl -X POST "https://precogs.croutons.ai/v1/run.ndjson" \
  -H "Content-Type: application/json" \
  -d '{
    "precog": "bkk_massage",
    "content_source": "inline",
    "content": "Check average massage prices in Silom",
    "task": "price_sanity_checking",
    "region": "Silom"
  }'
```

**Should work now!** ✅

---

## What Changed

- `/v1/run.ndjson` endpoint now allows public access
- Auth is optional (if provided, it's validated, but not required)
- GPT can call it directly without API keys

---

**Ready to test!** The endpoint is now public for GPT function calling.

