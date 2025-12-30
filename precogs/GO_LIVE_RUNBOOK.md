# Precogs Go-Live Runbook

Complete step-by-step runbook for deploying and verifying the Precogs API and worker services.

---

## 0) Sanity: API Up Through Custom Domain

Verify the API is accessible via custom domain:

```bash
curl -sS https://precogs.croutons.ai/health
# Expected: {"ok":true,"ts":"..."}

curl -I https://precogs.croutons.ai/runtime
# Expected: HTTP 200
```

**If these fail:**
- Check Railway custom domain is attached and active
- Verify DNS CNAME points to Railway
- Check Railway deployment is running

---

## 1) Ensure Railway Service Config (precogs-api)

### Railway Dashboard → precogs-api → Settings

**Networking:**
- [ ] Public Networking: **ON**
- [ ] Target Port: **8080** (must match app's listen port)

**Deploy:**
- [ ] Start Command: `npm start` (Railway auto-detects)

**Variables:**
- [ ] `NODE_ENV=production`
- [ ] `GRAPH_BASE=https://graph.croutons.ai`
- [ ] `DATABASE_URL=<railway-postgres-url>` (auto-set when Postgres added)
- [ ] `REDIS_URL=redis://default:<pw>@<host>:6379` (auto-set when Redis added)
- [ ] `API_KEY=<strong-token>` (optional but recommended)

**Generate API_KEY:**
```bash
# Option 1: openssl
openssl rand -hex 32

# Option 2: node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2) Run DB Migrations

Creates `precogs.jobs`, `precogs.events` tables and indexes.

**Via Railway Shell (Recommended):**
1. Railway → precogs-api → Deployments → Latest → Shell
2. Run:
```bash
npm run migrate
```

**Expected output:**
```
[migrate] Running precogs migrations...
✅ Applied 001_init_precogs.sql
Migrations applied: 1
```

**Via Local Machine:**
```bash
export DATABASE_URL="postgresql://..."
npm run migrate
```

**Verify tables exist:**
```bash
# In Railway PostgreSQL shell
psql $DATABASE_URL -c "\dt precogs.*"
# Should show: jobs, events, schema_migrations
```

---

## 3) Confirm Metrics and Redis Health

```bash
# Metrics endpoint
curl -sS https://precogs.croutons.ai/metrics
# Expected: {"processed_total":0,"failed_total":0,"oldest_pending_age_seconds":null}

# Redis health
curl -sS https://precogs.croutons.ai/health/redis
# Expected: {"ok":true,"redis":"configured"}
```

**If Redis health fails:**
- Verify `REDIS_URL` is set in Railway variables
- Check Redis service is running in Railway
- Test connection manually if needed

---

## 4) Deploy Worker as Separate Railway Service (precogs-worker)

### Create Service
1. Railway → New → Deploy from GitHub
2. Select `precogs-worker` repository (or same repo, different service)
3. Railway auto-detects Node.js

### Set Variables
Same as precogs-api:
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL=<same-as-precogs-api>`
- [ ] `REDIS_URL=<same-as-precogs-api>`
- [ ] `GRAPH_BASE=https://graph.croutons.ai`

### Verify Consumer Group Initialization

**Check logs:**
Railway → precogs-worker → Deployments → Latest → Logs

**Expected:**
```
[worker] Starting precogs-worker...
[worker] GRAPH_BASE=https://graph.croutons.ai
[redis] Connected
[worker] Created consumer group cg1 on precogs:jobs
[worker] Starting job consumption...
```

**If consumer group creation fails, initialize manually:**

Via Railway Shell:
```bash
node -e "import('redis').then(async m=>{
  const r=m.createClient({url:process.env.REDIS_URL});
  await r.connect();
  try{
    await r.xGroupCreate('precogs:jobs','cg1','$',{MKSTREAM:true});
    console.log('Consumer group created');
  }catch(e){
    console.log('Group exists or error:', e.message);
  }
  await r.quit();
})"
```

**Verify worker is listening:**
- Logs should show continuous `XREADGROUP` activity (or waiting for messages)
- No errors in logs

---

## 5) Cloudflare Tweaks for SSE

### Cache Bypass for SSE Endpoints

**Option A: Cache Rules (Recommended)**
1. Cloudflare → Rules → Cache Rules → Create Rule
2. Rule Name: `Bypass SSE endpoints`
3. URL: `precogs.croutons.ai/v1/jobs/*`
4. Cache Status: **Bypass**
5. Save

**Option B: Page Rules (Legacy)**
1. Cloudflare → Rules → Page Rules → Create Page Rule
2. URL: `precogs.croutons.ai/v1/jobs/*`
3. Settings:
   - Cache Level: **Bypass**
4. Save

### SSL Mode
1. Cloudflare → SSL/TLS → Overview
2. SSL mode: **Full** (not Flexible)

### Disable Rocket Loader & Auto Minify
**Important:** These can interfere with SSE streams.

1. Cloudflare → Speed → Optimization
2. Rocket Loader: **Off** (for `precogs.croutons.ai` subdomain)
3. Auto Minify HTML: **Off** (or create rule to exclude `/v1/jobs/*`)

### Metrics Cache
Optional: Set short TTL or no-cache on `/metrics`:
- Cache Rule: `precogs.croutons.ai/metrics` → Cache Status: **Bypass**

---

## 6) Enqueue a Real Job

**Set variables:**
```bash
export API="https://precogs.croutons.ai"
export API_KEY="<your-api-key-from-railway>"
export AUTH="-H authorization: Bearer $API_KEY"
```

**Create job:**
```bash
RESP=$(curl -sS $API/v1/invoke \
  -H 'content-type: application/json' $AUTH \
  -d '{
    "precog":"schema",
    "prompt":"Generate & validate JSON-LD",
    "context":{
      "url":"https://www.hoosiercladding.com/services/siding-installation",
      "type":"Service"
    },
    "stream":true
  }')

echo "$RESP"
# Expected: {"ok":true,"job_id":"<uuid>","stream":true}
```

**Extract job ID:**
```bash
JOB_ID=$(node -e "console.log(JSON.parse(process.argv[1]).job_id)" "$RESP")
echo "Job ID: $JOB_ID"
```

**Or manually:**
```bash
JOB_ID="<paste-uuid-from-response>"
```

---

## 7) Watch Streamed Events

### Browser (Recommended)
Open in browser:
```
https://precogs.croutons.ai/v1/jobs/$JOB_ID/events
```

You should see events stream in real-time:
```
event: grounding.chunk
data: {"count":1,"source":"https://graph.croutons.ai/api/triples"}

event: answer.delta
data: {"text":"Processing precog \"schema\"..."}

event: answer.complete
data: {"ok":true}
```

### Terminal Check
```bash
curl -N "$API/v1/jobs/$JOB_ID/events"
```

**Expected sequence:**
1. `grounding.chunk` events
2. `answer.delta` events (may be multiple)
3. `answer.complete` event
4. Stream closes

**If no events appear:**
- Check worker logs for processing activity
- Verify worker is calling `insertEvent()` and `updateJobStatus()`
- Check database: `SELECT * FROM precogs.events WHERE job_id = '$JOB_ID';`

---

## 8) Optional: Local Router DX Smoke Test

If you have a router script locally:

```bash
export PRECOGS_API_BASE="https://precogs.croutons.ai"
export PRECOGS_API_TOKEN="$API_KEY"

./router.js '/crtns:precog:@schema: --url https://www.hoosiercladding.com/services/siding-installation --type Service -- Generate & validate JSON-LD'
```

**Expected:** Streaming events similar to step 7.

---

## 9) Hardening Once Green

### Security
- [x] CORS restricted to `https://precogs.croutons.ai` (via `NODE_ENV=production`)
- [x] Bearer auth required on `/v1/invoke` (via `API_KEY`)
- [ ] Consider per-team API tokens (future enhancement)
- [ ] Review and implement rate limiting (future enhancement)

### Monitoring
- [x] Monitor `/metrics` endpoint:
  - `processed_total` - Should increase as jobs complete
  - `failed_total` - Should stay low (investigate if > 0)
  - `oldest_pending_age_seconds` - Should be null or low (investigate if > 60s)

**Set up alerts:**
```bash
# Example: Check metrics every minute
watch -n 60 'curl -sS https://precogs.croutons.ai/metrics | jq .'
```

### Worker Improvements
- [ ] Add retry logic with exponential backoff
- [ ] Add dead letter queue for failed jobs after N retries
- [ ] Add job timeout handling
- [ ] Implement graceful shutdown

### Operational
- [ ] Confirm Railway Networking still targets port 8080 after redeploy
- [ ] Document API usage patterns
- [ ] Set up log aggregation
- [ ] Create runbook for common issues

---

## 10) Quick Triage if Something Stalls

### Issue: Job Created But No Events

**Symptoms:**
- `/v1/invoke` returns `job_id` successfully
- `/v1/jobs/:id/events` stream is empty or stalls

**Diagnosis:**
1. Check worker logs (Railway → precogs-worker → Logs):
   - Is `XREADGROUP` consuming messages?
   - Is `XACK` being called after job completion?
   - Is `insertEvent()` being called?
   - Any errors in logs?

2. Check database:
   ```bash
   # In Railway PostgreSQL shell
   psql $DATABASE_URL -c "SELECT * FROM precogs.events WHERE job_id = '<job_id>' ORDER BY ts;"
   ```

3. Check Redis stream:
   ```bash
   # In Railway Redis shell
   redis-cli -u $REDIS_URL XINFO STREAM precogs:jobs
   redis-cli -u $REDIS_URL XRANGE precogs:jobs - + COUNT 10
   ```

**Fixes:**
- Ensure worker is running and connected
- Verify `DATABASE_URL` and `REDIS_URL` match between API and worker
- Check worker is processing jobs (look for "Processing job" logs)
- Verify consumer group exists: `XINFO GROUPS precogs:jobs`

---

### Issue: SSE Silent Only Via Subdomain

**Symptoms:**
- SSE works via Railway domain: `https://precogs-api-production.up.railway.app/v1/jobs/$JOB_ID/events`
- SSE fails via custom domain: `https://precogs.croutons.ai/v1/jobs/$JOB_ID/events`

**Diagnosis:**
- Cloudflare caching SSE endpoints
- Rocket Loader interfering

**Fixes:**
1. Verify cache bypass rule for `/v1/jobs/*` is active
2. Test directly via Railway domain to confirm API works
3. Disable Rocket Loader for subdomain
4. Purge Cloudflare cache: Cloudflare → Caching → Purge Everything

---

### Issue: 404 with x-railway-fallback Header

**Symptoms:**
- Requests return 404
- Response includes `x-railway-fallback: true` header

**Diagnosis:**
- Custom domain not attached to correct service
- Domain attached but not active yet

**Fixes:**
1. Railway → precogs-api → Settings → Domains
2. Verify `precogs.croutons.ai` is listed and status is "Active"
3. If missing, add domain and wait for activation
4. Check DNS: `dig precogs.croutons.ai` should resolve to Railway IP

---

### Issue: "Failed to Respond" or Connection Refused

**Symptoms:**
- Health endpoint fails
- Connection refused errors

**Diagnosis:**
- Port mismatch between Railway target port and app listen port
- App not binding to `0.0.0.0`
- App crashed on startup

**Fixes:**
1. Railway → precogs-api → Settings → Networking:
   - Target Port must be `8080`
   - Public Networking must be ON

2. Verify app code binds correctly:
   ```javascript
   app.listen(process.env.PORT || 8080, "0.0.0.0", ...)
   ```

3. Check deployment logs for errors:
   - Railway → precogs-api → Deployments → Latest → Logs
   - Look for "listening on" message
   - Check for startup errors

4. Verify `PORT` env var is not overriding (Railway sets this automatically)

---

### Issue: Worker Not Picking Up Jobs

**Symptoms:**
- Jobs created successfully
- Worker logs show no activity
- Jobs stuck in `pending` status

**Diagnosis:**
1. Check consumer group exists:
   ```bash
   redis-cli -u $REDIS_URL XINFO GROUPS precogs:jobs
   ```

2. Check stream has messages:
   ```bash
   redis-cli -u $REDIS_URL XINFO STREAM precogs:jobs
   redis-cli -u $REDIS_URL XRANGE precogs:jobs - + COUNT 10
   ```

3. Check worker logs for connection errors

**Fixes:**
- Verify `REDIS_URL` matches between API and worker
- Recreate consumer group if needed (see step 4)
- Restart worker service
- Check Redis connection in worker logs

---

## Quick Reference Commands

### Health & Metrics
```bash
# Health checks
curl -sS https://precogs.croutons.ai/health
curl -sS https://precogs.croutons.ai/health/redis
curl -sS https://precogs.croutons.ai/metrics
```

### Create Job & Stream Events
```bash
export API_KEY="<your-key>"

# Create job (with auth if API_KEY set)
curl -sS https://precogs.croutons.ai/v1/invoke \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $API_KEY" \
  -d '{"precog":"schema","prompt":"Generate & validate JSON-LD","context":{"url":"https://www.hoosiercladding.com/services/siding-installation","type":"Service"},"stream":true}'

# Stream events
curl -N "https://precogs.croutons.ai/v1/jobs/<JOB_ID>/events"
```

### Database Queries
```bash
# Check job counts
psql $DATABASE_URL -c "SELECT COUNT(*) FROM precogs.jobs;"
psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM precogs.jobs GROUP BY status;"

# Get last 20 events for a job (on-call triage)
psql $DATABASE_URL -c "SELECT id,ts,type FROM precogs.events WHERE job_id='<UUID>' ORDER BY id DESC LIMIT 20;"

# Get all events for a job
psql $DATABASE_URL -c "SELECT * FROM precogs.events WHERE job_id = '<job_id>' ORDER BY ts;"
```

### Redis Commands
```bash
# Check stream info
redis-cli -u $REDIS_URL XINFO STREAM precogs:jobs
redis-cli -u $REDIS_URL XINFO GROUPS precogs:jobs

# Check dead letter queue
redis-cli -u $REDIS_URL XINFO STREAM precogs:jobs:dlq
redis-cli -u $REDIS_URL XRANGE precogs:jobs:dlq - + COUNT 10
```

---

## Rollback Procedures

### Rollback API Service

**Option 1: Revert Deployment (Railway)**
1. Railway → precogs-api → Deployments
2. Find previous working deployment
3. Click "Redeploy" on that deployment
4. Wait for deployment to complete

**Option 2: Stop Worker (Halts Processing)**
1. Railway → precogs-worker → Settings → Pause Service
2. This stops processing new jobs
3. Jobs remain in Redis Stream for later processing

**Option 3: Revert Code**
1. Revert problematic commit in GitHub
2. Railway will auto-deploy the revert
3. Or manually trigger deployment

**Note:** Migrations are forward-compatible. Rolling back code won't break the database schema.

### Rollback Worker Service

1. Railway → precogs-worker → Deployments
2. Find previous working deployment
3. Click "Redeploy"
4. Verify logs show consumer group initialization

### Verify Rollback

```bash
# Check metrics show expected values
curl -sS https://precogs.croutons.ai/metrics | jq .

# Check build SHA matches expected version
curl -sS https://precogs.croutons.ai/metrics | jq .build_sha

# Test job creation
curl -sS https://precogs.croutons.ai/v1/invoke \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"precog":"schema","prompt":"test","stream":true}'
```

---

## On-Call Triage Commands

### Quick Job Status Check
```bash
# Get last 20 events for a job (one-liner)
JOB_ID="<uuid>"
psql $DATABASE_URL -c "SELECT id,ts,type FROM precogs.events WHERE job_id='$JOB_ID' ORDER BY id DESC LIMIT 20;"
```

### Check Job Status
```bash
# Get job details
psql $DATABASE_URL -c "SELECT id,status,created_at,started_at,completed_at,error FROM precogs.jobs WHERE id='<uuid>';"
```

### Check Worker Activity
```bash
# Check Redis consumer group info
redis-cli -u $REDIS_URL XINFO GROUPS precogs:jobs

# Check pending messages (not yet processed)
redis-cli -u $REDIS_URL XPENDING precogs:jobs cg1
```

### Check Metrics
```bash
# Full metrics dump
curl -sS https://precogs.croutons.ai/metrics | jq .

# Watch metrics in real-time
watch -n 5 'curl -sS https://precogs.croutons.ai/metrics | jq .'
```

### Check Dead Letter Queue
```bash
# View failed jobs
redis-cli -u $REDIS_URL XRANGE precogs:jobs:dlq - + COUNT 20
```

---

## Final Smoke Test (Copy/Paste Ready)

```bash
# Health + metrics
curl -sS https://precogs.croutons.ai/health
curl -sS https://precogs.croutons.ai/metrics

# Create job (with auth if set)
export API_KEY="<your-api-key>"
RESP=$(curl -sS https://precogs.croutons.ai/v1/invoke \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $API_KEY" \
  -d '{"precog":"schema","prompt":"Generate & validate JSON-LD","context":{"url":"https://www.hoosiercladding.com/services/siding-installation","type":"Service"},"stream":true}')

echo "$RESP"
JOB_ID=$(node -e "console.log(JSON.parse(process.argv[1]).job_id)" "$RESP")
echo "Job ID: $JOB_ID"

# Stream events
echo "Open in browser: https://precogs.croutons.ai/v1/jobs/$JOB_ID/events"
curl -N "https://precogs.croutons.ai/v1/jobs/$JOB_ID/events"
```

---

## Success Criteria

✅ API responds via custom domain  
✅ Migrations run successfully  
✅ Metrics endpoint returns data  
✅ Redis health check passes  
✅ Worker creates consumer group and starts listening  
✅ Cloudflare cache bypass configured  
✅ Job creation returns `job_id`  
✅ Events stream successfully  
✅ Worker processes jobs and inserts events  
✅ Metrics show `processed_total` increasing  

---

**Last Updated:** $(date)  
**Status:** Ready for go-live

