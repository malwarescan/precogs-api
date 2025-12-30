# Where is the Merge API URL?

## Location in Code

### Precogs Worker (Where it's actually used)

**File:** `precogs-api/precogs-worker/src/bkkMassagePrecog.js`

**Line 81:**
```javascript
const mergeApiUrl = process.env.BKK_MERGE_API_URL || "https://croutons-merge-service.up.railway.app/v1/merge/bkk_massage";
```

This is where the worker calls the merge service.

---

## Where to Set It

### In Railway (Precogs Worker Service)

1. Go to **Railway Dashboard**
2. Open your **Precogs Worker** service (not the API service)
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Add:
   - **Key:** `BKK_MERGE_API_URL`
   - **Value:** `https://<your-merge-service>.up.railway.app/v1/merge/bkk_massage`

**Example:**
```
BKK_MERGE_API_URL=https://croutons-merge-production.up.railway.app/v1/merge/bkk_massage
```

---

## How to Get Your Merge Service URL

1. Deploy `croutons-merge-service` on Railway (if not done)
2. Go to Railway → Your Merge Service → **Settings** → **Networking**
3. Copy the **Public Domain** (format: `xxxxx.up.railway.app`)
4. Add `/v1/merge/bkk_massage` to the end

**Full URL format:**
```
https://<service-name>.up.railway.app/v1/merge/bkk_massage
```

---

## Note About the Handler File

The file you're looking at (`croutons-merge-service/src/handlers/invokeBkkMerge.js`) is **not used anymore** since we unified the architecture. 

We removed the separate `invoke_bkk_merge` function - now everything uses `invoke_precog` and the worker calls the merge service internally.

---

## Summary

**Set this in Railway (Precogs Worker):**
```
BKK_MERGE_API_URL=https://<your-merge-service>.up.railway.app/v1/merge/bkk_massage
```

**Where it's used:**
- `precogs-api/precogs-worker/src/bkkMassagePrecog.js` (line 81)

**Default fallback:**
- If not set, uses: `https://croutons-merge-service.up.railway.app/v1/merge/bkk_massage`

