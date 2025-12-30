# Smoke Test Results

## Test Results

### ✅ Health Check
```bash
curl -sS https://precogs.croutons.ai/health
# Result: {"ok":true,"ts":"2025-11-08T16:31:26.344Z"}
```
**Status:** PASS

### ✅ Redis Health
```bash
curl -sS https://precogs.croutons.ai/health/redis
# Result: {"ok":true,"redis":"configured"}
```
**Status:** PASS

### ❌ Metrics Endpoint
```bash
curl -sS https://precogs.croutons.ai/metrics
# Result: {"ok":false,"error":""}
```
**Status:** FAIL - Database connection issue

### ⚠️ Migrations
```bash
npm run migrate
# Error: ECONNREFUSED - trying to connect to localhost PostgreSQL
```
**Status:** Needs to run on Railway (DATABASE_URL only set there)

---

## Issues Identified

### 1. Metrics Endpoint Failing
**Problem:** Metrics endpoint returns `{"ok":false,"error":""}`

**Likely Causes:**
- `DATABASE_URL` not set in Railway environment variables
- Database not accessible from Railway service
- Database migrations not run yet

**Fix:**
1. Railway → precogs-api → Variables → Verify `DATABASE_URL` is set
2. Run migrations via Railway shell:
   - Railway → precogs-api → Deployments → Latest → Shell
   - Run: `npm run migrate`
3. Verify database connection:
   - Check Railway PostgreSQL service is running
   - Verify `DATABASE_URL` format is correct

### 2. Migrations Need Railway Environment
**Problem:** Can't run migrations locally (no local PostgreSQL)

**Solution:** Run migrations on Railway where `DATABASE_URL` is available

**Steps:**
1. Railway → precogs-api → Deployments → Latest → Shell
2. Run: `npm run migrate`
3. Expected output:
   ```
   [migrate] Running precogs migrations...
   ✅ Applied 001_init_precogs.sql
   Migrations applied: 1
   ```

---

## Next Steps

### Immediate Actions

1. **Verify DATABASE_URL in Railway:**
   - Railway → precogs-api → Variables
   - Confirm `DATABASE_URL` is present and correct
   - Format should be: `postgresql://user:password@host:port/dbname`

2. **Run Migrations on Railway:**
   ```bash
   # Via Railway Shell
   npm run migrate
   ```

3. **Re-test Metrics:**
   ```bash
   curl -sS https://precogs.croutons.ai/metrics
   # Should return: {"processed_total":0,"failed_total":0,...}
   ```

4. **Check Railway Logs:**
   - Railway → precogs-api → Deployments → Latest → Logs
   - Look for database connection errors
   - Check for migration-related messages

### Expected Metrics Response (After Fix)

```json
{
  "processed_total": 0,
  "failed_total": 0,
  "inflight_jobs": 0,
  "oldest_pending_age_seconds": null,
  "redis_lag_ms": null,
  "build_sha": "<git-commit-sha>"
}
```

---

## Troubleshooting

### If DATABASE_URL is Missing
1. Railway → precogs-api → New → Database → PostgreSQL
2. Railway automatically sets `DATABASE_URL`
3. Redeploy service

### If Migrations Fail
1. Check Railway logs for specific error
2. Verify PostgreSQL service is running
3. Test connection manually:
   ```bash
   # In Railway shell
   psql $DATABASE_URL -c "SELECT 1;"
   ```

### If Metrics Still Fails After Migrations
1. Check server logs for database errors
2. Verify schema exists:
   ```bash
   psql $DATABASE_URL -c "\dn precogs"
   ```
3. Verify tables exist:
   ```bash
   psql $DATABASE_URL -c "\dt precogs.*"
   ```

---

**Status:** 2/4 tests passing  
**Blocking Issue:** Database connection for metrics endpoint  
**Action Required:** Run migrations on Railway and verify DATABASE_URL

