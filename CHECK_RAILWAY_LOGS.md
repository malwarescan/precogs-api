# How to Check Railway Logs for Graph Service

## Method 1: Railway Dashboard (Easiest)

1. **Go to Railway Dashboard:**
   - Visit: https://railway.app
   - Log in with your GitHub account

2. **Find Graph Service Project:**
   - Look for project named `graph-service` or similar
   - Click on it

3. **View Service Logs:**
   - Click on the service (the deployed app)
   - Go to **"Deployments"** tab at the top
   - Click on the **latest deployment** (most recent one)
   - Click **"Logs"** tab
   - Scroll down to see real-time logs

4. **What to Look For:**
   ```
   [ingest] POST /v1/streams/ingest received
   [ingest] Parsed NDJSON length: ...
   [ingest] Skipping record: factId=true, claim=true, pageId=true
   [ingest]   factId="...", claim="...", pageId="..."
   [ingest] Query returned 0 rowCount for ...
   [ingest] ✅ Inserted crouton 1: ...
   [ingest] Summary: received=662, attempted=662, skipped=0, inserted=0
   ```

## Method 2: Railway CLI (If Installed)

```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# View logs
railway logs
```

## Method 3: Check Deployment Status

1. Railway Dashboard → Your Project → graph-service
2. **Deployments** tab
3. Look for latest deployment status:
   - ✅ **Active** = Deployed successfully
   - ⏳ **Building** = Still deploying
   - ❌ **Failed** = Deployment error

## Method 4: Test if New Code is Deployed

Run this to see if the new logging is active:

```bash
curl -X POST "https://graph.croutons.ai/v1/streams/ingest" \
  -H "Content-Type: application/x-ndjson" \
  -H "Authorization: Bearer devsecret" \
  -H "X-Dataset-Id: test" \
  -H "X-Site: test" \
  -d '{"@type":"Factlet","fact_id":"test-debug-123","@id":"test-debug-123","page_id":"test-page","passage_id":"test-debug-123","claim":"Test claim for debugging","text":"Test claim for debugging"}'
```

Then check Railway logs - you should see:
- `[ingest] ✅ Inserted crouton 1: test-debug-123` (if it works)
- OR `[ingest] Query returned 0 rowCount` (if query isn't working)
- OR `[ingest] Skipping record:` (if validation fails)

## Quick Troubleshooting

**If you can't find the project:**
- Check all projects in Railway dashboard
- Look for repository: `malwarescan/graph-service`
- Check if it's under a different name

**If logs are empty:**
- Make sure you're looking at the **latest deployment**
- Check if service is actually running (green status)
- Try triggering a new deployment

**If you see old logs:**
- The service might not have redeployed yet
- Wait 2-3 minutes after pushing to `main` branch
- Or manually trigger redeploy in Railway dashboard

