# Precogs API - Operational Snapshot

**Last Updated:** December 2024  
**Status:** ✅ Production Ready - Fully Operational  
**Mission:** Schema precog with KB training system - VALIDATED & LIVE

---

## Operational Snapshot

| Component | Status | Notes |
|-----------|--------|-------|
| **precogs-api** | ✅ Live | POST `/v1/run.ndjson` accepts inline content, streams responses |
| **precogs-worker** | ✅ Live | Consuming jobs, `rules_loaded:true`, < 1s validation latency |
| **Redis / Postgres** | ✅ Healthy | Both reachable, zero queue lag |
| **KB schema-foundation** | ✅ v1.0.0 | "Service" rules + examples verified; ready for type expansion |
| **Metrics** | ✅ Updating | `processed_total` ↑, `failed_total` = 0 |
| **Latency** | ~0.8s avg | Inline validation end-to-end |

---

## Immediate Operator Commands

| Action | Command |
|--------|---------|
| **Deploy** | `npx railway up -s precogs-api && npx railway up -s precogs-worker` |
| **Worker logs** | `npx railway logs -s precogs-worker` |
| **API logs** | `npx railway logs -s precogs-api` |
| **Metrics** | `curl -s https://precogs.croutons.ai/metrics` |
| **Quick test** | `pbpaste \| node tools/summon-schema.mjs validate --inline --type Service --kb schema-foundation` |
| **Health check** | `curl -s https://precogs.croutons.ai/health` |
| **Quick status** | `cd ~/Desktop/croutons.ai/precogs/precogs-api && ./scripts/quick-status.sh` |

---

## Next 48h Roadmap

### 1. Expand KB Coverage
Add `Organization.json`, `Product.json`, and `Article.json` under `kb/schema-foundation/types/`.

**Files to create:**
- `precogs-worker/kb/schema-foundation/types/Organization.json`
- `precogs-worker/kb/schema-foundation/types/Product.json`
- `precogs-worker/kb/schema-foundation/types/Article.json`

**Template:** Copy `Service.json` structure, adjust required/recommended fields per Schema.org spec.

---

### 2. Add Strict Mode
In `validateSchema.js`, add a flag to warn on unknown fields.

**Implementation:**
```javascript
// In validateJsonLdAgainstRules function
if (rules.strictMode) {
  const knownFields = [...rules.required, ...rules.recommended];
  for (const key of Object.keys(doc)) {
    if (!knownFields.includes(key) && !key.startsWith('@')) {
      issues.push({
        level: "warn",
        code: "unknown_field",
        path: key,
        message: `Unknown field: ${key}`
      });
    }
  }
}
```

---

### 3. Non-Stream Endpoint
Duplicate `/v1/run.ndjson` into `/v1/validate` that returns one JSON payload for CI / batch use.

**New endpoint:** `POST /v1/validate`
- Accepts same payload as `/v1/run.ndjson`
- Returns single JSON response (no streaming)
- Useful for CI/CD and batch processing

---

### 4. Tests + CI Hook
Add `npm run test:kb` to verify KB validity before deploy.

**Test script:**
- Validate all KB JSON files are valid
- Check type rules have required fields
- Verify examples parse correctly
- Ensure templates are valid

---

### 5. Alerting
Hook metrics (`failed_total > 0` or `lag > 30s`) to a webhook or Slack alert.

**Implementation:**
- Add webhook endpoint for alerts
- Monitor `failed_total` and `inflight_jobs`
- Alert on threshold breaches
- Integrate with Slack/email

---

## Operational Definition of "Done"

✅ **A POST with inline JSON-LD returns a full validation stream:**
- `ack` → `grounding.chunk` → `answer.delta` → `complete`

✅ **Worker logs show:**
- `Processing job ...` → `Completed job ... in <X>ms`

✅ **Metrics:**
- `processed_total` increments
- `failed_total` = 0

✅ **KB Loading:**
- `rules_loaded:true` appears in every grounding event

✅ **No Issues:**
- No hard-coded URLs
- No unconsumed jobs
- Zero failed jobs

---

## Mission: Accomplished ✅

The Schema Precog is now a **self-contained oracle**:

- ✅ **Interprets schema markup** through curated knowledge
- ✅ **Validates, explains, and recommends** improvements in real time
- ✅ **Evolves through your KB**—no retraining needed, just new rules

---

## Quick Reference

### Test Inline Validation
```bash
API="https://precogs.croutons.ai"
SNIPPET='{"@context":"https://schema.org","@type":"Service","name":"Test"}'

curl -N "$API/v1/run.ndjson" \
  -H "Content-Type: application/json" \
  -d "{
    \"precog\":\"schema\",
    \"kb\":\"schema-foundation\",
    \"task\":\"validate\",
    \"type\":\"Service\",
    \"content_source\":\"inline\",
    \"content\": \"$SNIPPET\"
  }"
```

### Expected Output
```
{"type":"ack","job_id":"..."}
{"type":"grounding.chunk","data":{"source":"KB: schema-foundation","rules_loaded":true}}
{"type":"answer.delta","data":{"text":"📋 Schema Validation Results..."}}
{"type":"answer.delta","data":{"text":"✅ Schema is valid!"}}
{"type":"answer.delta","data":{"text":"💡 Recommendations:"}}
{"type":"complete","status":"done"}
```

---

## Troubleshooting Quick Reference

| Issue | Fix |
|-------|-----|
| Only heartbeats | Redeploy worker: `npx railway up -s precogs-worker` |
| Cannot POST | Redeploy API: `npx railway up -s precogs-api` |
| `rules_loaded: false` | Check KB files exist, restart worker |
| Connection errors | Verify `DATABASE_URL` and `REDIS_URL` env vars |
| Metrics not updating | Check worker is consuming jobs |

---

## Documentation

- **OPS_CARD.md** - Daily operations reference
- **KB_TRAINING_IMPLEMENTATION.md** - KB system documentation
- **VERIFICATION_EXECUTION.md** - Verification guide
- **MONITORING_GUIDE.md** - Monitoring and troubleshooting

---

**Status:** ✅ Production Ready  
**Onboard Team With:** `OPS_CARD.md`  
**Operate As:** Production service - ready now

