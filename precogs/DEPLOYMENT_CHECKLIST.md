# Precogs Deployment Checklist

## Pre-Deployment Verification

### Code Review
- [x] `/v1/invoke` uses `insertJob()` + `enqueueJob()`
- [x] `/v1/jobs/:id/events` polls database and streams SSE
- [x] SSE only sends new events (event ID tracking)
- [x] Worker creates consumer group on boot
- [x] Worker processes jobs and inserts events
- [x] Authentication middleware added (optional via API_KEY)
- [x] CORS restricted in production
- [x] Metrics endpoint implemented
- [x] Error handling in place

### Files Ready
- [x] `precogs-api/server.js` - Main API server
- [x] `precogs-api/src/db.js` - Database helpers
- [x] `precogs-api/src/redis.js` - Redis helpers
- [x] `precogs-api/migrations/001_init_precogs.sql` - Schema
- [x] `precogs-api/scripts/migrate.js` - Migration runner
- [x] `precogs-worker/worker.js` - Worker service
- [x] `precogs-worker/src/db.js` - Database helpers
- [x] `precogs-worker/src/redis.js` - Redis client
- [x] Documentation files created

---

## Step 1: Deploy precogs-api

### Railway Setup
- [ ] Create new Railway project
- [ ] Connect GitHub repository (`precogs-api`)
- [ ] Railway auto-detects Node.js

### Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `GRAPH_BASE=https://graph.croutons.ai`
- [ ] `API_KEY=<generate-random-token>` (optional but recommended)
- [ ] `DATABASE_URL` (auto-set when Postgres added)
- [ ] `REDIS_URL` (auto-set when Redis added)

### Add Databases
- [ ] Add PostgreSQL database
- [ ] Verify `DATABASE_URL` is set
- [ ] Add Redis database
- [ ] Verify `REDIS_URL` is set

### Run Migrations
- [ ] Open Railway shell for precogs-api
- [ ] Run: `npm run migrate`
- [ ] Verify output: "✅ Applied 001_init_precogs.sql"

### Networking
- [ ] Settings → Networking → Target Port = `8080`
- [ ] Public Networking = ON

### Custom Domain
- [ ] Settings → Domains → Add `precogs.croutons.ai`
- [ ] Wait for domain to be active

### Verification
```bash
# Health check
curl https://precogs.croutons.ai/health
# Expected: {"ok":true,"ts":"..."}

# Runtime page
curl -I https://precogs.croutons.ai/runtime
# Expected: HTTP 200

# Redis health
curl https://precogs.croutons.ai/health/redis
# Expected: {"ok":true,"redis":"configured"}

# Metrics
curl https://precogs.croutons.ai/metrics
# Expected: {"processed_total":0,"failed_total":0,"oldest_pending_age_seconds":null}
```

---

## Step 2: Deploy precogs-worker

### Railway Setup
- [ ] Create new Railway service (same project or separate)
- [ ] Connect GitHub repository (`precogs-worker` or same repo)
- [ ] Railway auto-detects Node.js

### Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL=<same-as-precogs-api>`
- [ ] `REDIS_URL=<same-as-precogs-api>`
- [ ] `GRAPH_BASE=https://graph.croutons.ai`

### Verification
- [ ] Check deployment logs
- [ ] Look for: "Created consumer group cg1 on precogs:jobs"
- [ ] Look for: "Starting job consumption..."
- [ ] No errors in logs

### Manual Consumer Group Init (if needed)
If worker fails to create group, run in Railway shell:
```javascript
import { createClient } from 'redis';
const r = createClient({url:process.env.REDIS_URL});
await r.connect();
try {
  await r.xGroupCreate('precogs:jobs','cg1','$',{MKSTREAM:true});
} catch(e){}
await r.quit();
```

---

## Step 3: Configure Cloudflare

### SSL Settings
- [ ] SSL/TLS → Overview → SSL mode = **Full**

### Cache Rules
- [ ] Rules → Cache Rules → Create Rule
- [ ] URL: `precogs.croutons.ai/v1/jobs/*`
- [ ] Cache Status: **Bypass**

### Optional: Rocket Loader
- [ ] Speed → Optimization → Disable Rocket Loader for subdomain

---

## Step 4: End-to-End Test

### Create Job
```bash
export API_KEY="<your-api-key>"

curl -X POST https://precogs.croutons.ai/v1/invoke \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "precog":"schema",
    "prompt":"Generate & validate JSON-LD",
    "context":{
      "url":"https://www.hoosiercladding.com/services/siding-installation",
      "type":"Service"
    },
    "stream":true
  }'
```

**Expected:** `{"ok":true,"job_id":"<uuid>","stream":true}`

### Stream Events
```bash
export JOB_ID="<paste-job-id>"

# Browser: https://precogs.croutons.ai/v1/jobs/$JOB_ID/events
# Or curl:
curl -N https://precogs.croutons.ai/v1/jobs/$JOB_ID/events
```

**Expected events:**
```
event: grounding.chunk
data: {"count":1,"source":"..."}

event: answer.delta
data: {"text":"..."}

event: answer.complete
data: {"ok":true}
```

### Verify Worker Processing
- [ ] Check precogs-worker logs
- [ ] Should see: "Processing job <uuid>: precog=schema"
- [ ] Should see: "Completed job <uuid>"
- [ ] Should see: "Acknowledged message <id>"

### Check Metrics
```bash
curl https://precogs.croutons.ai/metrics | jq .
```

After processing:
- [ ] `processed_total` > 0
- [ ] `failed_total` = 0 (unless errors occurred)
- [ ] `oldest_pending_age_seconds` = null (if no pending jobs)

---

## Step 5: Troubleshooting (if needed)

### No Events Streaming
- [ ] Check worker logs for `XREADGROUP` activity
- [ ] Verify worker is calling `insertEvent()` and `updateJobStatus()`
- [ ] Check database: `SELECT * FROM precogs.events WHERE job_id = '<job_id>';`
- [ ] Verify `DATABASE_URL` and `REDIS_URL` match between services

### 401 Unauthorized
- [ ] Add `Authorization: Bearer $API_KEY` header
- [ ] Or temporarily remove `API_KEY` env var (not recommended)

### SSE Stalls
- [ ] Verify Cloudflare cache bypass for `/v1/jobs/*`
- [ ] Test via Railway domain directly
- [ ] Check server logs for polling activity

### Worker Not Picking Up Jobs
- [ ] Verify consumer group exists: `XINFO GROUPS precogs:jobs`
- [ ] Check Redis connection in worker logs
- [ ] Verify `REDIS_URL` matches between API and worker
- [ ] Check stream has messages: `XINFO STREAM precogs:jobs`

---

## Step 6: Production Hardening

### Security
- [x] CORS restricted to `precogs.croutons.ai` (via `NODE_ENV=production`)
- [x] Bearer authentication on `/v1/invoke` (via `API_KEY`)
- [ ] Consider per-team API tokens (future enhancement)
- [ ] Review and implement rate limiting (future enhancement)

### Monitoring
- [x] Metrics endpoint at `/metrics`
- [ ] Set up alerts on `failed_total` > threshold
- [ ] Set up alerts on `oldest_pending_age_seconds` > threshold
- [ ] Configure log aggregation (Railway → Logs → Export)

### Operational
- [ ] Document API usage for team
- [ ] Set up health check monitoring
- [ ] Create runbook for common issues
- [ ] Review and optimize worker processing logic

---

## Post-Deployment

### Next Steps
- [ ] Implement actual precog processing logic in worker
- [ ] Replace placeholder events with real grounding/answer data
- [ ] Add support for different precog types
- [ ] Test with real-world scenarios
- [ ] Monitor metrics and adjust as needed

### Documentation
- [ ] Update API documentation with real examples
- [ ] Document precog types and their processing
- [ ] Create integration guide for clients

---

## Quick Reference

### Environment Variables

**precogs-api:**
- `NODE_ENV=production`
- `DATABASE_URL` (auto-set)
- `REDIS_URL` (auto-set)
- `GRAPH_BASE=https://graph.croutons.ai`
- `API_KEY` (optional)
- `CORS_ORIGIN` (optional, defaults to precogs.croutons.ai)

**precogs-worker:**
- `NODE_ENV=production`
- `DATABASE_URL` (same as API)
- `REDIS_URL` (same as API)
- `GRAPH_BASE=https://graph.croutons.ai`

### Useful Commands

```bash
# Health checks
curl https://precogs.croutons.ai/health
curl https://precogs.croutons.ai/health/redis
curl https://precogs.croutons.ai/metrics

# Create job
curl -X POST https://precogs.croutons.ai/v1/invoke \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"precog":"schema","prompt":"test","stream":true}'

# Stream events
curl -N https://precogs.croutons.ai/v1/jobs/<JOB_ID>/events

# Run migrations
npm run migrate

# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM precogs.jobs;"
```

---

**Status:** ✅ Ready for deployment
**Last Updated:** $(date)

