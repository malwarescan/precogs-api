# Precogs Pre-Launch Checklist

Final control sheet before production launch.

---

## ✅ Code Status

All enhancements are **already implemented** and ready:

- ✅ SSE keep-alive heartbeat (every 15s)
- ✅ Rate limiter (60 req/min per IP)
- ✅ Enhanced metrics (inflight_jobs, redis_lag_ms, build_sha)
- ✅ Database index optimization
- ✅ Worker robustness (retries, DLQ, graceful shutdown)

**No patch file needed** - everything is in place!

---

## 🚀 Rollout Path

### Step 1: Commit + Redeploy

```bash
cd precogs-api
git add .
git commit -am "precogs: heartbeat + rate-limit + metrics enhancements"
git push origin main

cd ../precogs-worker
git add .
git commit -am "precogs-worker: retries + DLQ + graceful shutdown"
git push origin main
```

**Railway will auto-deploy both services.**

---

### Step 2: Run Final Smoke Test

```bash
# Health check
curl -sS https://precogs.croutons.ai/health
# Expected: {"ok":true,"ts":"..."}

# Run migrations (if not already run)
npm run migrate
# Expected: "✅ Applied 001_init_precogs.sql" or "⏭️ Skipping (already applied)"

# Metrics
curl -sS https://precogs.croutons.ai/metrics
# Expected: JSON with processed_total, failed_total, inflight_jobs, redis_lag_ms, build_sha

# Redis health
curl -sS https://precogs.croutons.ai/health/redis
# Expected: {"ok":true,"redis":"configured"}
```

**All endpoints return 200 → Launch window open!**

---

### Step 3: Activate Cloudflare Rules

**Cache Bypass:**
1. Cloudflare → Rules → Cache Rules → Create Rule
2. URL: `precogs.croutons.ai/v1/jobs/*`
3. Cache Status: **Bypass**
4. Save

**SSL Mode:**
1. Cloudflare → SSL/TLS → Overview
2. SSL mode: **Full** (not Flexible)

**Disable Optimizations:**
1. Cloudflare → Speed → Optimization
2. Rocket Loader: **Off** (for `precogs.croutons.ai`)
3. Auto Minify HTML: **Off** (or exclude `/v1/jobs/*`)

**Purge Cache:**
1. Cloudflare → Caching → Purge Everything
2. Click "Purge Everything"

---

### Step 4: Promote to Production

**Tag Release:**
```bash
cd precogs-api
git tag -a v1.0.0 -m "Precogs production release"
git push origin v1.0.0

cd ../precogs-worker
git tag -a v1.0.0 -m "Precogs worker production release"
git push origin v1.0.0
```

**Optional: Create Production Branch**
```bash
# If using branch-based deployment
git checkout -b prod-release
git push -u origin prod-release
# Then set Railway to deploy from prod-release branch
```

---

### Step 5: Monitoring Start

**Watch Metrics:**
```bash
watch -n 30 'curl -sS https://precogs.croutons.ai/metrics | jq .'
```

**First Few Jobs Verification:**
1. Create a test job:
   ```bash
   export API_KEY="<your-api-key>"
   curl -sS https://precogs.croutons.ai/v1/invoke \
     -H 'content-type: application/json' \
     -H "authorization: Bearer $API_KEY" \
     -d '{"precog":"schema","prompt":"test","stream":true}'
   ```

2. Monitor metrics:
   - `processed_total` should increment after job completes
   - `failed_total` should stay at 0
   - `inflight_jobs` should return to 0 after job completes
   - `redis_lag_ms` should be low (< 1000ms typically)

3. Verify events stream:
   ```bash
   curl -N "https://precogs.croutons.ai/v1/jobs/<JOB_ID>/events"
   ```
   Should see: `grounding.chunk` → `answer.delta` → `answer.complete`
   Plus keepalive comments every 15 seconds

---

## 📊 Success Criteria

- ✅ All smoke test endpoints return 200
- ✅ Migrations applied successfully
- ✅ Cloudflare rules active
- ✅ SSL mode: Full
- ✅ Metrics endpoint shows expected values
- ✅ First job processes successfully
- ✅ Events stream correctly
- ✅ `processed_total` increments
- ✅ `failed_total` = 0
- ✅ `inflight_jobs` returns to 0

---

## 🔍 Post-Launch Monitoring

**First Hour:**
- Monitor metrics every 5 minutes
- Check worker logs for errors
- Verify events are streaming correctly
- Watch for rate limit responses (429)

**First Day:**
- Review metrics trends
- Check DLQ for any failed jobs
- Monitor `redis_lag_ms` for delays
- Verify `build_sha` matches deployed version

**Ongoing:**
- Set up alerts on `failed_total` > threshold
- Monitor `oldest_pending_age_seconds` for stuck jobs
- Review worker logs for retry patterns
- Check DLQ periodically for patterns

---

## 🚨 Rollback Plan

If issues arise:

1. **Stop Worker:**
   - Railway → precogs-worker → Settings → Pause Service
   - Halts processing immediately

2. **Revert API:**
   - Railway → precogs-api → Deployments
   - Find previous working deployment
   - Click "Redeploy"

3. **Verify:**
   ```bash
   curl -sS https://precogs.croutons.ai/health
   curl -sS https://precogs.croutons.ai/metrics | jq .build_sha
   ```

---

## 📝 Quick Reference

**Health Checks:**
```bash
curl -sS https://precogs.croutons.ai/health
curl -sS https://precogs.croutons.ai/health/redis
curl -sS https://precogs.croutons.ai/metrics
```

**Create Job:**
```bash
export API_KEY="<your-key>"
curl -sS https://precogs.croutons.ai/v1/invoke \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $API_KEY" \
  -d '{"precog":"schema","prompt":"test","stream":true}'
```

**Stream Events:**
```bash
curl -N "https://precogs.croutons.ai/v1/jobs/<JOB_ID>/events"
```

**Check Job Events:**
```bash
psql $DATABASE_URL -c "SELECT id,ts,type FROM precogs.events WHERE job_id='<UUID>' ORDER BY id DESC LIMIT 20;"
```

---

**Status:** ✅ Ready for launch  
**Last Updated:** $(date)

