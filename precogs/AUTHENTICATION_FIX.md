# Authentication Fix - Precogs API

## Problem

The API returns `{"ok":false,"error":"unauthorized"}` because `API_KEY` is set in Railway and requires authentication.

## Solution

### Option 1: Add Authorization Header (Recommended)

**Get API Key from Railway:**
1. Go to Railway → Precogs API service
2. Variables tab
3. Find `API_KEY` value
4. Copy it

**Use in curl:**
```bash
curl -X POST "https://precogs.croutons.ai/v1/run.ndjson" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "precog": "bkk_massage",
    "content_source": "inline",
    "content": "Check average massage prices in Silom",
    "task": "price_sanity_checking",
    "region": "Silom"
  }'
```

### Option 2: Remove API_KEY (For Testing)

If you want to test without auth:
1. Railway → Precogs API → Variables
2. Remove or unset `API_KEY`
3. Redeploy

**Note:** Not recommended for production.

---

## For GPT Team

### Update Tool Manifest

Add authentication to the tool configuration:

**For OpenAI Actions:**
```yaml
servers:
  - url: https://precogs.croutons.ai
    description: Precogs API
    variables:
      api_key:
        default: "YOUR_API_KEY"
```

**For Custom GPT:**
- Add authentication section
- Type: Bearer Token
- Token: Get from Railway `API_KEY` variable

### Or: Make API_KEY Optional for Public Endpoints

We can modify the server to allow public access to `/v1/run.ndjson` while keeping auth for other endpoints.

---

## Quick Test (With Auth)

```bash
# Replace YOUR_API_KEY with actual key from Railway
export PRECOGS_API_KEY="your-key-from-railway"

curl -X POST "https://precogs.croutons.ai/v1/run.ndjson" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PRECOGS_API_KEY" \
  -d '{
    "precog": "bkk_massage",
    "content_source": "inline",
    "content": "Check average massage prices in Silom",
    "task": "price_sanity_checking",
    "region": "Silom"
  }'
```

---

**Next Step:** Get API_KEY from Railway and add to requests, or make endpoint public for testing.

