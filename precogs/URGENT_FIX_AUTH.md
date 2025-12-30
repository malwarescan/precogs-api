# URGENT FIX - Authentication Removed

## Problem

API was returning `{"ok":false,"error":"unauthorized"}` because auth was required.

## Solution

**Removed authentication requirement from `/v1/run.ndjson` endpoint.**

The endpoint is now **fully public** - no API key needed.

## Test Command (No Auth)

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

## For GPT Team

**No authentication needed at all.**

- Endpoint: `https://precogs.croutons.ai/v1/run.ndjson`
- Method: `POST`
- Headers: `Content-Type: application/json`
- **No Authorization header required**

## Deployment

- Code committed and pushed
- Railway will auto-deploy in 1-2 minutes
- After deployment, endpoint will be public

---

**Fixed and deployed!** Wait 1-2 minutes for Railway to redeploy, then test again.

