# Streamlined Precog Creation - The Right Way

## Problem

Creating a precog was too complicated:
- ❌ Separate merge service
- ❌ Environment variables
- ❌ External HTTP calls
- ❌ Complex path resolution
- ❌ Multiple deployments

## Solution: 3-Step Process

### Step 1: Create Corpus Files (If Needed)

**Location:** `corpora/<domain>/<subdomain>/<topic>/`

**Format:** NDJSON (one JSON per line)

**Example:**
```
corpora/thailand/bangkok/massage/shops_legit.ndjson
```

---

### Step 2: Create Precog Handler

**File:** `precogs-api/precogs-worker/src/<name>Precog.js`

**Template:** See `PRECOG_TEMPLATE.js`

**Key functions:**
- `process<Name>Precog()` - Main handler
- `loadCorpusData()` - Load from files
- `executeTask()` - Task logic
- `emitAnswer()` - Format response

---

### Step 3: Register in Worker

**1. Import handler:**
```javascript
import { processMyPrecog } from "./src/myPrecog.js";
```

**2. Add routing in `worker.js`:**
```javascript
else if (precog === "my_precog") {
  const task = context?.task || "default_task";
  const emit = async (type, data) => {
    await insertEvent(jobId, type, data);
  };
  
  await processMyPrecog(jobId, precog, task, context, emit);
  
  await insertEvent(jobId, "answer.complete", { ok: true });
  await updateJobStatus(jobId, "done");
  
  return { success: true };
}
```

**3. Add to function enum:**
```javascript
// In invoke_precog.js
enum: [..., "my_precog"]
```

---

## That's It! ✅

**No external services, no config, just:**
1. Corpus files
2. Handler file  
3. Registration

---

## Why Bangkok Massage Was Complicated

We made mistakes:
1. Created separate merge service (unnecessary)
2. Required environment variables (not needed)
3. External HTTP calls (should be direct file loading)
4. Complex path resolution (should be standard)

**The right way:** Load files directly, like `homePrecog.js` does.

---

## Standard Pattern

All precogs should follow this pattern:

```
Corpus Files → Handler Loads Directly → Returns Results
```

**No external services, no HTTP calls, just file I/O.**

---

## Future Precogs

Use the template (`PRECOG_TEMPLATE.js`) and follow the 3 steps.

**Simple, clean, maintainable.** ✅

