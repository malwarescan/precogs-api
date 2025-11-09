# Actionable Insights: Precogs Development

Key insights for the dev team moving forward, based on real-world patterns and best practices.

---

## 1. Define Your Functions Clearly

**Priority:** High  
**Impact:** Prevents incorrect function calls by the model

### What to Do

Make sure each function (tool) you expose to the LLM has:
- **Precise name** - Clear, descriptive function name
- **Accurate description** - What the function does and when to use it
- **Complete parameter schema** - All parameters with types, descriptions, required fields

### Example (Our Implementation)

```javascript
export const invokePrecogFunction = {
  name: "invoke_precog",
  description: "Invoke a Precogs oracle to analyze a URL using domain-specific knowledge. Returns a job_id and stream URL for real-time results.",
  parameters: {
    type: "object",
    properties: {
      kb: { 
        type: "string", 
        description: "Knowledge base identifier (e.g., 'siding-services', 'cladding', 'general'). Defaults to 'general' if not specified.",
        enum: ["general", "siding-services", "cladding"]
      },
      precog: { 
        type: "string", 
        description: "Precog type to invoke" 
      },
      url: { 
        type: "string", 
        description: "Target URL to analyze" 
      },
      // ... more properties
    },
    required: ["precog", "url"],
  },
};
```

### Why It Matters

- Poor definitions → Model calls wrong function or with wrong parameters
- Clear definitions → Model understands when and how to use functions
- **Our Status:** ✅ Function definition is clear and complete (`src/functions/invoke_precog.js`)

---

## 2. Handle Streaming + Function-Calling Correctly

**Priority:** Critical  
**Impact:** Prevents function execution errors and missed function calls

### What to Do

When using `stream=true`, chunks may include a mix of:
- Content (`delta.content`)
- Function call data (`delta.function_call.name`, `delta.function_call.arguments`)

**You must:**
1. Accumulate `function_call.name` and `function_call.arguments` across multiple chunks
2. Only execute when `finish_reason == "function_call"`
3. Handle both content and function calls in the same stream

### Example (Our Implementation)

```javascript
let functionCallName = null;
let functionCallArguments = "";

for await (const chunk of stream) {
  const delta = choice.delta;
  
  // Accumulate function call data
  if (delta.function_call) {
    if (delta.function_call.name) {
      functionCallName = delta.function_call.name;
    }
    // CRITICAL: Accumulate arguments across chunks
    if (delta.function_call.arguments) {
      functionCallArguments += delta.function_call.arguments;
    }
  }
  
  // Handle regular content
  if (delta.content) {
    yield { type: "content", content: delta.content };
  }
  
  // Execute only when complete
  if (choice.finish_reason === "function_call" && functionCallName) {
    const functionArgs = JSON.parse(functionCallArguments);
    // Execute function...
  }
}
```

### Why It Matters

- Arguments arrive in multiple chunks → Must accumulate
- Executing too early → Parse errors, incomplete data
- Missing function calls → Model can't invoke backend functions
- **Our Status:** ✅ Correctly implemented (`src/integrations/openai-chat.js` lines 75-100)

---

## 3. Return Results Immediately & Stream Progress

**Priority:** High  
**Impact:** Reduces perceived latency, keeps users engaged

### What to Do

For best user experience (especially in "one-click URL invocation" model):

1. **Return job metadata immediately** - `job_id`, stream links (`cli_url`, `ndjson_url`, `stream_url`)
2. **Stream updates as work proceeds** - Don't wait for completion
3. **Keep users engaged** - Show progress, not just final result

### Example (Our Implementation)

```javascript
// Create job immediately
const job = await insertJob(precog, task, context);
await enqueueJob(job.id, precog, task, context);

// Return immediately (don't wait for worker)
return {
  job_id: job.id,
  status: "pending",
  stream_url: `${baseUrl}/v1/jobs/${job.id}/events`,
  cli_url: `${baseUrl}/cli?job_id=${job.id}`,
  ndjson_url: `${baseUrl}/v1/run.ndjson?job_id=${job.id}`,
  message: "Job created, streaming results..."
};

// Worker processes asynchronously and streams events
```

### Why It Matters

- Immediate response → User sees progress right away
- Streaming updates → User stays engaged
- Async processing → System can handle long-running jobs
- **Our Status:** ✅ Implemented (`src/functions/invoke_precog.js`)

---

## 4. Ensure Fallback Logic and Defaults

**Priority:** Medium  
**Impact:** Prevents blocking Phase 1 due to missing functionality

### What to Do

For parameters like `kb` (knowledge base):

1. **Define defaults** - Use `"general"` until domain-specific KBs are live
2. **Validate gracefully** - Don't fail if KB doesn't exist yet
3. **Document fallbacks** - Make it clear what happens when defaults are used

### Example (Our Implementation)

```javascript
export async function executeInvokePrecog(args, baseUrl) {
  const { kb = "general", precog, url, type, task } = args;
  
  // Validate KB, fallback to "general"
  const validKBs = ["general", "siding-services", "cladding"];
  const selectedKB = validKBs.includes(kb) ? kb : "general";
  
  const context = { kb: selectedKB };
  // ... rest of function
}
```

### Why It Matters

- Missing defaults → System breaks when KB not ready
- Graceful fallbacks → Phase 1 can proceed without blocking
- Clear documentation → Team knows what to expect
- **Our Status:** ✅ Defaults implemented (`src/functions/invoke_precog.js`)

---

## 5. Implement Monitoring and Error Handling

**Priority:** Critical  
**Impact:** Production readiness, debugging, performance optimization

### What to Do

Track key metrics:
- **Time to job creation** - How long to create job
- **Time to first stream event** - Latency to first user feedback
- **Success/failure rate** - Job completion statistics
- **Error types** - Parse errors, function failures, streaming errors

Also capture edge cases:
- Incomplete streams
- Function call failures
- Argument parsing errors
- Client disconnections

Use rate-limiting / auth to prevent abuse.

### Example (Our Implementation)

```javascript
// Logging in /v1/chat endpoint
console.log("[chat] Request received:", { 
  message: userMessage.substring(0, 100),
  hasHistory: conversationHistory.length > 0 
});

const startTime = Date.now();
let firstChunkTime = null;
let functionCalled = false;
let jobCreated = false;

// ... streaming logic ...

console.log("[chat] First chunk:", firstChunkTime - startTime, "ms");
console.log("[chat] Function called:", functionCallName);
console.log("[chat] Job created:", jobId, "in", jobCreationTime, "ms");
console.log("[chat] Completed:", { 
  functionCalled, 
  jobCreated, 
  totalTime: Date.now() - startTime 
});
```

### Metrics Endpoint

```javascript
// /metrics endpoint
{
  "processed_total": 1234,
  "failed_total": 5,
  "inflight_jobs": 3,
  "oldest_pending_age_seconds": 45,
  "redis_lag_ms": 12
}
```

### Why It Matters

- Metrics → Identify bottlenecks and issues
- Error tracking → Debug production problems
- Rate limiting → Prevent abuse
- **Our Status:** ✅ Monitoring implemented (`server.js` `/metrics` endpoint, logging in `/v1/chat`)

---

## 6. Test with End-to-End Flows Including Edge Cases

**Priority:** High  
**Impact:** Ensures system works correctly before rollout

### What to Do

Set up tests for complete flows:

1. **Happy path:** User prompt → function call → job creation → streaming viewer
2. **Invalid parameters:** Missing required params, invalid values
3. **Streaming interruption:** Client disconnect, network errors
4. **Fallback defaults:** KB defaults, missing optional params
5. **Response formats:** SSE, NDJSON, CLI formats
6. **Different invocation methods:** Direct URL vs ChatGPT invocation

### Test Cases Needed

See `TEST_CHECKLIST.md` for detailed test cases.

### Why It Matters

- End-to-end tests → Catch integration issues
- Edge cases → Handle real-world scenarios
- Different methods → Ensure all paths work
- **Our Status:** ⚠️ Test checklist created, needs execution

---

## Summary

| Insight | Priority | Status | Location |
|---------|----------|--------|----------|
| **1. Define Functions Clearly** | High | ✅ Done | `src/functions/invoke_precog.js` |
| **2. Handle Streaming + Function-Calling** | Critical | ✅ Done | `src/integrations/openai-chat.js` |
| **3. Return Results Immediately** | High | ✅ Done | `src/functions/invoke_precog.js` |
| **4. Fallback Logic & Defaults** | Medium | ✅ Done | `src/functions/invoke_precog.js` |
| **5. Monitoring & Error Handling** | Critical | ✅ Done | `server.js` `/metrics`, logging |
| **6. End-to-End Testing** | High | ⚠️ Checklist Ready | `TEST_CHECKLIST.md` |

---

## Next Steps

1. ✅ Review these insights
2. ✅ Verify implementation matches insights
3. ⚠️ Execute test checklist (`TEST_CHECKLIST.md`)
4. ⚠️ Add any missing monitoring/metrics
5. ⚠️ Document edge cases handled

---

**Status:** Insights documented, ready for team review  
**Last Updated:** $(date)

