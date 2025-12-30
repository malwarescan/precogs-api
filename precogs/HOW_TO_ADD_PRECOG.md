# How to Add a Precog - Official Guide

**This is the canonical guide. When anyone says "add precog", refer to this document.**

---

## Overview

Adding a new precog is **3 simple steps**:
1. Create corpus files (if needed)
2. Create precog handler
3. Register in worker

**No external services, no complex config, just files → handler → registration.**

---

## Step 1: Create Corpus Files (If Needed)

### Location
```
corpora/<domain>/<subdomain>/<topic>/
```

### Format
**NDJSON** - One JSON object per line

### Example
```
corpora/thailand/bangkok/massage/shops_legit.ndjson
```

### Structure
Each line is a JSON object:
```json
{"@type":"MassageShop","name":"Health Land","district":"Asok","address":"123 Main St",...}
{"@type":"MassageShop","name":"Let's Relax","district":"Nana","address":"456 Road",...}
```

**Note:** If your precog doesn't need corpus data (e.g., schema validation), skip this step.

---

## Step 2: Create Precog Handler

### File Location
```
precogs-api/precogs-worker/src/<name>Precog.js
```

### Template

**Copy from:** `precogs/PRECOG_TEMPLATE.js`

**Or use this structure:**

```javascript
/* jshint node: true, esversion: 11 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, existsSync } from "fs";

/**
 * Process [precog name] precog job
 */
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

    // Emit grounding event
    await emit("grounding.chunk", {
      count: data.length,
      source: "Corpus data",
      namespace: namespace,
      task: task,
    });

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

/**
 * Load corpus data
 */
function loadCorpusData(region = null) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Adjust path to your corpus location
    const corpusPath = join(__dirname, '../../corpora/<your-path>/<file>.ndjson');
    
    if (!existsSync(corpusPath)) {
      console.warn(`[my-precog] Corpus file not found: ${corpusPath}`);
      return [];
    }
    
    const content = readFileSync(corpusPath, 'utf-8');
    const items = content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
      .filter(item => {
        if (!region) return true;
        return item.region && item.region.toLowerCase() === region.toLowerCase();
      });
    
    console.log(`[my-precog] Loaded ${items.length} items from corpus`);
    return items;
  } catch (error) {
    console.warn(`[my-precog] Failed to load corpus: ${error.message}`);
    return [];
  }
}

/**
 * Execute task
 */
async function executeTask(task, { data, content, region }, emit) {
  // Your task logic here
  return {
    items: data,
    count: data.length,
    task: task,
  };
}

/**
 * Emit answer delta events
 */
async function emitAnswer(result, emit) {
  await emit("answer.delta", {
    text: `Found ${result.count} items\n\n`,
  });
  
  // Format and emit results
  result.items.forEach((item, idx) => {
    emit("answer.delta", {
      text: `${idx + 1}. **${item.name}**\n`,
    });
  });
}
```

### Key Points

- **Load corpus directly** - No HTTP calls, no external services
- **Use standard paths** - Relative to handler file
- **Follow naming** - `process<Name>Precog()` function
- **Emit events** - Use `emit()` for thinking, grounding, answer.delta

---

## Step 3: Register in Worker

### 3a. Import Handler

**File:** `precogs-api/precogs-worker/worker.js`

**Add import:**
```javascript
import { processMyPrecog } from "./src/myPrecog.js";
```

### 3b. Add Routing

**In `worker.js`, add routing logic:**

```javascript
else if (precog === "my_precog") {
  const task = context?.task || "default_task";
  const emit = async (type, data) => {
    await insertEvent(jobId, type, data);
  };
  
  await processMyPrecog(jobId, precog, task, context, emit);
  
  await insertEvent(jobId, "answer.complete", { ok: true });
  await updateJobStatus(jobId, "done");
  
  const elapsed = Date.now() - startTime;
  console.log(`[worker] Completed job ${jobId} in ${elapsed}ms`);
  return { success: true, elapsed };
}
```

### 3c. Add to Function Enum

**File:** `precogs-api/src/functions/invoke_precog.js`

**Add to enum:**
```javascript
enum: ["schema", "faq", "pricing", "home", ..., "my_precog"]
```

**Update description** (optional):
```javascript
description: "... For [your domain] queries, use precog='my_precog' to get [description]."
```

---

## Testing

### Test Locally

```bash
cd precogs-api/precogs-worker
node -e "
import('./src/myPrecog.js').then(m => {
  const emit = (type, data) => console.log(type, data);
  m.processMyPrecog('test-123', 'my_precog', 'default_task', {content: 'test'}, emit);
});
"
```

### Test via API

```bash
curl -X POST "https://precogs.croutons.ai/v1/run.ndjson" \
  -H "Content-Type: application/json" \
  -d '{
    "precog": "my_precog",
    "content_source": "inline",
    "content": "Test query",
    "task": "default_task"
  }'
```

---

## Checklist

- [ ] Corpus files created (if needed)
- [ ] Handler file created (`src/<name>Precog.js`)
- [ ] Handler imports corpus correctly
- [ ] Handler implements `process<Name>Precog()`
- [ ] Handler emits events (thinking, grounding, answer.delta)
- [ ] Import added to `worker.js`
- [ ] Routing added to `worker.js`
- [ ] Enum updated in `invoke_precog.js`
- [ ] Tested locally
- [ ] Tested via API

---

## Common Patterns

### Pattern 1: Corpus-Based Precog (Like Bangkok Massage)

```javascript
// Load corpus → Filter by region → Return results
const data = loadCorpusData(region);
const filtered = filterByRegion(data, region);
return formatResults(filtered);
```

### Pattern 2: Schema Validation Precog (Like Schema)

```javascript
// Load KB rules → Validate content → Return issues
const kb = loadKB("schema-foundation");
const issues = validateAgainstRules(content, kb);
return formatIssues(issues);
```

### Pattern 3: Graph Query Precog (Like Home)

```javascript
// Query graph → Filter factlets → Process → Return
const factlets = await queryGraph({ region, vertical });
const filtered = filterRelevant(factlets, content);
return processTask(filtered);
```

---

## What NOT to Do ❌

- ❌ **Don't create external services** - Load files directly
- ❌ **Don't require environment variables** - Use standard paths
- ❌ **Don't make HTTP calls** - Use file I/O
- ❌ **Don't create separate deployments** - Everything in worker
- ❌ **Don't overcomplicate** - Keep it simple

---

## Examples

### Example 1: Bangkok Massage (Corpus-Based)

- **Corpus:** `corpora/thailand/bangkok/massage/shops_legit.ndjson`
- **Handler:** `src/bkkMassagePrecog.js`
- **Registration:** Added to worker.js, enum includes "bkk_massage"

### Example 2: Home Precog (Graph-Based)

- **Corpus:** N/A (queries graph)
- **Handler:** `src/homePrecog.js`
- **Registration:** Added to worker.js, enum includes "home.*"

### Example 3: Schema Precog (KB-Based)

- **Corpus:** N/A (uses KB rules)
- **Handler:** Uses KB validation in worker.js
- **Registration:** Enum includes "schema"

---

## Quick Reference

**When someone says "add precog":**

1. **Corpus?** → Create in `corpora/<path>/`
2. **Handler?** → Create `src/<name>Precog.js` (use template)
3. **Register?** → Add to `worker.js` and `invoke_precog.js`

**That's it!** ✅

---

## Questions?

- **Where do corpus files go?** → `corpora/<domain>/<topic>/`
- **Where does handler go?** → `precogs-api/precogs-worker/src/<name>Precog.js`
- **How do I register?** → Import + routing in `worker.js` + enum in `invoke_precog.js`
- **Do I need external services?** → **NO!** Load files directly.
- **Do I need environment variables?** → **NO!** Use standard paths.

---

**This is the official guide. Follow it for all new precogs.** ✅

