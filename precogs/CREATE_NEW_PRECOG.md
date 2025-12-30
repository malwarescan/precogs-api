# Streamlined Precog Creation Guide

## The Simple Way ✅

Creating a new precog should be **3 steps**:

1. **Create corpus files** (if needed)
2. **Create precog handler** 
3. **Register in worker**

That's it. No external services, no complex config.

---

## Step-by-Step

### 1. Create Corpus Files (Optional)

If your precog needs data, put it in:
```
corpora/<domain>/<subdomain>/<topic>/
```

Example:
```
corpora/thailand/bangkok/massage/shops_legit.ndjson
```

**Format:** NDJSON (one JSON object per line)

---

### 2. Create Precog Handler

Create file: `precogs-api/precogs-worker/src/<name>Precog.js`

**Template:**
```javascript
export async function processMyPrecog(jobId, namespace, task, context, emit) {
  const content = context?.content || "";
  const region = context?.region;

  console.log(`[my-precog] Processing ${namespace}.${task} for job ${jobId}`);

  try {
    await emit("thinking", {
      message: "Processing your request...",
      status: "analyzing",
    });

    // Load corpus data (if needed)
    const data = loadCorpusData(region);

    // Process task
    const result = await executeTask(task, { data, content, region }, emit);

    // Emit answer
    await emitAnswer(result, emit);

    return { success: true, result };
  } catch (error) {
    console.error(`[my-precog] Error:`, error);
    await emit("answer.delta", {
      text: `⚠️ Error: ${error.message}\n`,
    });
    throw error;
  }
}

// Helper: Load corpus data
function loadCorpusData(region = null) {
  // Load from corpus files
  // Filter by region if needed
  return [];
}

// Helper: Execute task
async function executeTask(task, { data, content, region }, emit) {
  // Task-specific logic
  return { shops: data, count: data.length };
}

// Helper: Emit answer
async function emitAnswer(result, emit) {
  await emit("answer.delta", {
    text: `Results: ${result.count} items found\n`,
  });
}
```

---

### 3. Register in Worker

Edit: `precogs-api/precogs-worker/worker.js`

**Add import:**
```javascript
import { processMyPrecog } from "./src/myPrecog.js";
```

**Add routing:**
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

**Add to function enum:**
Edit: `precogs-api/src/functions/invoke_precog.js`
```javascript
enum: [..., "my_precog"]
```

---

## That's It! ✅

**No:**
- ❌ External services
- ❌ Environment variables
- ❌ Complex configuration
- ❌ Separate deployments

**Just:**
- ✅ Corpus files (if needed)
- ✅ Handler file
- ✅ Worker registration

---

## Example: Bangkok Massage (What We Did)

1. **Corpus:** `corpora/thailand/bangkok/massage/shops_legit.ndjson`
2. **Handler:** `precogs-api/precogs-worker/src/bkkMassagePrecog.js`
3. **Registration:** Added to `worker.js` and `invoke_precog.js`

**That's it!** No merge service, no external dependencies.

---

## Why It Was Convoluted Before

We overcomplicated it by:
- Creating a separate merge service (unnecessary)
- Requiring environment variables (not needed)
- Multiple path resolutions (should be standard)
- External HTTP calls (should be direct file loading)

**The streamlined way:** Just load files directly, like other precogs do.

---

## Future Precogs

Follow this 3-step process:
1. Corpus files → Standard location
2. Handler file → Standard template
3. Register → Worker + function enum

**Done!** 🎉

