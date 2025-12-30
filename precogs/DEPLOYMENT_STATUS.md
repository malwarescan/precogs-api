# Deployment Status - Bangkok Massage Intelligence

## Current Status: ✅ Code Ready, Needs Deployment

### What's Done ✅

1. **Architecture Unified**
   - ✅ All precogs use `invoke_precog` (consistent pattern)
   - ✅ Removed separate `invoke_bkk_merge` function
   - ✅ Worker calls merge service internally (like homePrecog calls graph service)

2. **Code Committed**
   - ✅ Precogs API updated
   - ✅ Worker updated to call merge service
   - ✅ OpenAI integration updated
   - ✅ All pushed to GitHub

3. **Merge Service Created**
   - ✅ Code in `croutons-merge-service` repo
   - ✅ Pushed to GitHub: `malwarescan/croutons-merge-service`

### What's Needed for It to Work ⏳

#### 1. Deploy Merge Service on Railway

**Steps:**
1. Go to https://railway.app/new
2. Deploy from GitHub: `malwarescan/croutons-merge-service`
3. Add Redis add-on (optional but recommended)
4. Get Railway URL (e.g., `https://croutons-merge-production.up.railway.app`)

**Test:**
```bash
curl https://<your-merge-service>.up.railway.app/v1/merge/health
```

#### 2. Set Environment Variable in Precogs Worker

**In Railway (Precogs Worker service):**
1. Go to Precogs Worker service
2. Variables tab
3. Add: `BKK_MERGE_API_URL=https://<your-merge-service>.up.railway.app/v1/merge/bkk_massage`

**Example:**
```
BKK_MERGE_API_URL=https://croutons-merge-production.up.railway.app/v1/merge/bkk_massage
```

#### 3. Verify Corpus Files

**In Merge Service:**
- Corpus files should be in `/corpus` directory:
  - `shops_verified.ndjson`
  - `district_profiles.json`
  - `pricing_reference.json`

These are already in the repo, so they'll be deployed automatically.

#### 4. Test End-to-End

**Test via Precogs API:**
```bash
curl -X POST https://precogs.croutons.ai/v1/run.ndjson \
  -H "Content-Type: application/json" \
  -d '{
    "precog": "bkk_massage",
    "content": "Find a safe massage in Asok",
    "task": "district_aware_ranking",
    "region": "Asok"
  }'
```

**Test via GPT Chat:**
```
Ask GPT: "Find a safe massage in Asok"
```

GPT should call `invoke_precog(precog="bkk_massage")` and return results.

---

## Deployment Checklist

- [ ] Merge service deployed on Railway
- [ ] Merge service health check passes
- [ ] `BKK_MERGE_API_URL` set in Precogs Worker
- [ ] Precogs Worker redeployed (to pick up env var)
- [ ] Test via `/v1/run.ndjson` endpoint
- [ ] Test via GPT chat endpoint

---

## Current State

**Code:** ✅ Ready  
**Deployment:** ⏳ Needs merge service deployment + env var  
**Testing:** ⏳ Waiting for deployment

---

**Once merge service is deployed and env var is set, it will work!** ✅

