# Precogs Inline+KB Mode — Operations Card

**Status:** ✅ LIVE in Production  
**Last Verified:** December 2024  
**Mission:** Validate schema you paste (no hardcoded URLs)

---

## 0) What's Confirmed Working

- ✅ POST `/v1/run.ndjson` works (inline mode)
- ✅ KB rules (`schema-foundation`) load and validate
- ✅ Worker consumes jobs; metrics increment
- ✅ Default mission: validate schema you paste (no hardcoded URLs)

---

## 1) Daily Sanity Checks (60 seconds)

```bash
API="https://precogs.croutons.ai"

# Health check
curl -s "$API/health" ; echo
# Expect: {"ok":true,"ts":"..."}

# Metrics check
curl -s "$API/metrics" ; echo
# Expect: processed_total increasing after runs, failed_total = 0
```

---

## 2) Inline Validation (Primary Path)

**Paste raw JSON-LD (string) or HTML (with `<script type="application/ld+json">...`) as `content`.**

```bash
API="https://precogs.croutons.ai"

# Example minimal JSON-LD
SNIPPET='{"@context":"https://schema.org","@type":"Service","name":"Siding Installation"}'

curl -N "$API/v1/run.ndjson" \
  -H "Content-Type: application/json" \
  -d '{
    "precog":"schema",
    "kb":"schema-foundation",
    "task":"validate",
    "type":"Service",
    "content_source":"inline",
    "content": '"$SNIPPET"'
  }'
```

**Expected Stream:**
```
{"type":"ack","job_id":"..."}
{"type":"grounding.chunk","data":{"source":"KB: schema-foundation","rules_loaded":true},...}
{"type":"answer.delta","data":{"text":"📋 Schema Validation Results..."},...}
{"type":"answer.delta","data":{"text":"✅ Schema is valid!"},...}
{"type":"answer.delta","data":{"text":"💡 Recommendations:"},...}
{"type":"complete","status":"done"}
```

---

## 3) Inline Validation (Negative Test to See Recommendations)

```bash
API="https://precogs.croutons.ai"

# Intentionally incomplete schema
BAD_SNIPPET='{"@type":"Service","name":"Gutter Work"}'

curl -N "$API/v1/run.ndjson" \
  -H "Content-Type: application/json" \
  -d '{
    "precog":"schema",
    "kb":"schema-foundation",
    "task":"validate",
    "type":"Service",
    "content_source":"inline",
    "content": '"$BAD_SNIPPET"'
  }'
```

**Expected:** Suggestions like:
- Add `@context`
- Consider adding: `description`
- Consider adding: `provider`
- Consider adding: `areaServed`
- Consider adding: `serviceType`

---

## 4) Legacy URL Mode (Only When You Explicitly Want Fetching)

```bash
API="https://precogs.croutons.ai"

curl -N "$API/v1/run.ndjson" \
  -H "Content-Type: application/json" \
  -d '{
    "precog":"schema",
    "kb":"schema-foundation",
    "task":"generate_and_validate",
    "type":"Service",
    "content_source":"url",
    "url":"https://example.com/services/siding-installation"
  }'
```

**Note:** Only use when you explicitly want to fetch and analyze a web page.

---

## 5) Cursor Quick Use

### Option A: Pipe from Clipboard (Inline Mode)

```bash
API="https://precogs.croutons.ai"

# pbpaste should contain JSON-LD or HTML snippet
SNIP="$(pbpaste)"

curl -N "$API/v1/run.ndjson" \
  -H "Content-Type: application/json" \
  -d "{
    \"precog\":\"schema\",
    \"kb\":\"schema-foundation\",
    \"task\":\"validate\",
    \"type\":\"Service\",
    \"content_source\":\"inline\",
    \"content\": $SNIP
  }"
```

### Option B: npm Scripts (If Available)

```bash
cd ~/Desktop/croutons.ai/precogs/precogs-api

# Reads from stdin (inline mode by default)
pbpaste | npm run schema:validate -- --type Service

# Or from file
cat examples/service.jsonld | npm run schema:validate -- --type Service
```

---

## 6) ChatGPT "Summoning Rule" (System Prompt)

**Drop this in your system/developer prompt:**

```
You are wired to a Precogs oracle.

If the user provides schema or HTML in the chat, call invoke_precog with:
  kb="schema-foundation",
  precog="schema",
  content_source="inline",
  content=<the snippet>,
  type if given,
  task="validate".

If the user only provides a URL, call with:
  content_source="url",
  url=<the url>,
  task="generate_and_validate",
  kb="schema-foundation",
  precog="schema",
  type if given.

Always return the stream/cli link if available.
```

**Key Rule:** The assistant must auto-choose inline mode when a snippet is provided. It only uses URL mode when the user provides a URL and asks to fetch.

---

## 7) What "Useful" Looks Like (Mission Fit)

**Inline snippet in → KB checks it → stream returns:**

- ✅ **Issues found** (missing props, wrong @type, bad nesting)
- ✅ **Recommendations** (fields to add with brief rationale)
- ✅ **Cleaned/validated JSON-LD block**

**This makes the precog an actual "schema fountain":** you paste, it validates and upgrades.

---

## 8) Quick Troubleshooting

### A) Only Heartbeats in Stream

**Symptoms:** Receive `{"type":"heartbeat"}` but no `answer.delta` events

**Fix:**
```bash
# Worker not consuming. Redeploy worker:
cd ~/Desktop/croutons.ai/precogs/precogs-api/precogs-worker
npx railway up -s precogs-worker

# Tail logs to verify:
npx railway logs -s precogs-worker
```

**Expected Logs:**
```
[worker] Processing job <uuid>: precog=schema, kb=schema-foundation, source=inline, retry=0
[worker] Completed job <uuid> in <X>ms
```

---

### B) "Cannot POST /v1/run.ndjson"

**Symptoms:** POST request returns 404 or "Cannot POST" error

**Fix:**
```bash
# API didn't deploy latest server.js. Redeploy API:
cd ~/Desktop/croutons.ai/precogs/precogs-api
npx railway up -s precogs-api

# Check OPTIONS to verify route exists:
curl -i -X OPTIONS "https://precogs.croutons.ai/v1/run.ndjson"
# Should return 204 with CORS headers
```

---

### C) getaddrinfo / DB / Redis Errors

**Symptoms:** Worker logs show connection errors

**Fix:**
```bash
# Verify env on BOTH services:
npx railway variables -s precogs-api
npx railway variables -s precogs-worker

# Ensure DATABASE_URL and REDIS_URL are present and valid
# If missing, set via Railway dashboard, then redeploy both services:
cd ~/Desktop/croutons.ai/precogs/precogs-api
npx railway up -s precogs-api

cd ~/Desktop/croutons.ai/precogs/precogs-api/precogs-worker
npx railway up -s precogs-worker
```

---

### D) Content Parsing Errors

**Symptoms:** Worker says "No JSON-LD found" or parsing errors

**Fix:**
- Make sure `"content"` is a valid JSON string value
- If pasting raw JSON-LD, avoid extra quoting
- If shell expands variables, wrap carefully
- For HTML, include `<script type="application/ld+json">` blocks
- For raw JSON-LD, send as escaped string

**Example Correct Format:**
```json
{
  "content": "{\"@context\":\"https://schema.org\",\"@type\":\"Service\",\"name\":\"Test\"}"
}
```

---

## 9) Confirm Metrics Moved

```bash
API="https://precogs.croutons.ai"
curl -s "$API/metrics" ; echo
```

**Expected:**
- `processed_total` should increase after each run
- `failed_total` should remain 0
- `inflight_jobs` should return to 0 after completion

---

## 10) What to Tell the Team (One Line)

> **"Inline + KB validation is live. Paste JSON-LD/HTML into the POST /v1/run.ndjson call with kb=schema-foundation, task=validate. Worker streams issues, fixes, and a cleaned JSON-LD block."**

---

## Quick Reference

### Endpoint
```
POST https://precogs.croutons.ai/v1/run.ndjson
Content-Type: application/json
```

### Required Fields (Inline Mode)
- `precog`: `"schema"`
- `kb`: `"schema-foundation"`
- `content_source`: `"inline"`
- `content`: JSON-LD string or HTML with JSON-LD script tags

### Optional Fields
- `task`: `"validate"` (default)
- `type`: `"Service"` (or other schema.org type)

### Response Format
- NDJSON stream (one JSON object per line)
- Event types: `ack`, `grounding.chunk`, `answer.delta`, `answer.complete`, `complete`

---

## Success Indicators

✅ **Working:**
- Stream shows: ack → grounding.chunk (KB loaded) → answer.delta (validation) → complete
- Worker logs show job processing and completion
- Metrics increment (`processed_total` increases)
- No errors in logs

❌ **Not Working:**
- Only heartbeats (worker not consuming)
- "Cannot POST" error (endpoint not deployed)
- Connection errors (env vars missing)
- No validation output (KB rules not loading)

---

**Last Updated:** December 2024  
**Status:** Production Ready ✅

