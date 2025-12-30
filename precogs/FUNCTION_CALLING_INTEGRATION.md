# Function Calling Integration Guide

Complete guide for integrating OpenAI function calling with Precogs streaming workflow.

---

## Overview

This document shows how to integrate OpenAI's function calling feature with Precogs, enabling:

- Natural language interface ("Run schema audit on this URL")
- Context-aware invocation (LLM decides when to use precogs)
- Streaming results (progressive updates)
- VS Code/Cursor integration

---

## Architecture

### Flow Diagram

```
User Input
    ↓
ChatGPT/LLM (with function definition)
    ↓
Function Call Decision
    ↓
Precogs Backend (executeInvokePrecog)
    ↓
Job Creation + Enqueue
    ↓
Return job_id + stream URLs
    ↓
LLM Summarizes / Client Streams
```

---

## Implementation

### Step 1: Define Function

**File:** `src/functions/invoke_precog.js`

```javascript
export const invokePrecogFunction = {
  name: "invoke_precog",
  description: "Invoke a Precogs oracle...",
  parameters: { ... }
};
```

### Step 2: Execute Function

**File:** `src/functions/invoke_precog.js`

```javascript
export async function executeInvokePrecog(args) {
  // Create job
  // Enqueue to Redis
  // Return job_id + URLs
}
```

### Step 3: Integrate with OpenAI

**File:** `src/integrations/openai-example.js`

```javascript
export async function* callWithFunctionCalling(userMessage) {
  // Call OpenAI with function definition
  // Handle function call chunks
  // Execute function when called
  // Stream results
}
```

---

## Usage Examples

### Example 1: Simple Function Call

```javascript
import { callWithFunctionCallingSync } from "./src/integrations/openai-example.js";

const result = await callWithFunctionCallingSync(
  "Run schema audit on https://example.com/service"
);

if (result.functionCalled) {
  console.log("Job created:", result.functionResult.job_id);
  console.log("Stream URL:", result.functionResult.stream_url);
  console.log("Model response:", result.modelResponse);
}
```

### Example 2: Streaming Function Call

```javascript
import { callWithFunctionCalling } from "./src/integrations/openai-example.js";

for await (const chunk of callWithFunctionCalling(
  "Run schema audit on https://example.com/service"
)) {
  if (chunk.type === "content") {
    process.stdout.write(chunk.content);
  } else if (chunk.type === "function_call") {
    console.log("\n[Function called]", chunk.name);
  } else if (chunk.type === "function_result") {
    console.log("\n[Job created]", chunk.result.job_id);
  }
}
```

### Example 3: HTTP Endpoint

```javascript
// POST /v1/chat
app.post("/v1/chat", async (req, res) => {
  const { message } = req.body;
  
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  for await (const chunk of callWithFunctionCalling(message)) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }
  
  res.end();
});
```

---

## Streaming Behavior

### Function Call Chunks

When model decides to call function:

```json
{
  "choices": [{
    "delta": {
      "function_call": {
        "name": "invoke_precog",
        "arguments": "{\"precog\":\"schema\",\"url\":\"...\"}"
      }
    }
  }]
}
```

### Handling Function Calls

1. **Detect function call:** Check `delta.function_call`
2. **Accumulate arguments:** Collect `arguments` chunks
3. **Parse when complete:** JSON.parse accumulated arguments
4. **Execute function:** Call `executeInvokePrecog(args)`
5. **Return result:** Add function result to conversation
6. **Continue streaming:** Model can generate follow-up response

---

## Integration Points

### VS Code Extension

```javascript
// User selects URL in editor
const url = editor.selection.text;

// Call OpenAI with function
const result = await callWithFunctionCallingSync(
  `Run schema audit on ${url}`
);

// Show job_id and stream URL
vscode.window.showInformationMessage(
  `Job created: ${result.functionResult.job_id}`
);

// Open stream in browser
vscode.env.openExternal(
  vscode.Uri.parse(result.functionResult.cli_url)
);
```

### Cursor Integration

Similar to VS Code, but can integrate directly into chat interface.

---

## Error Handling

### Function Execution Errors

```javascript
try {
  const result = await executeInvokePrecog(args);
  return result;
} catch (error) {
  return {
    error: error.message,
    job_id: null,
  };
}
```

### Streaming Errors

```javascript
try {
  for await (const chunk of callWithFunctionCalling(message)) {
    yield chunk;
  }
} catch (error) {
  yield {
    type: "error",
    error: error.message,
  };
}
```

---

## Performance Considerations

### Latency

- **Function call detection:** ~100-500ms
- **Job creation:** ~50-100ms
- **Function result return:** Immediate
- **Model follow-up:** ~1-3s

### Optimization

- Cache function definitions
- Batch function calls when possible
- Use streaming for long responses
- Return job_id immediately, stream separately

---

## Testing

### Unit Tests

```javascript
describe("executeInvokePrecog", () => {
  it("creates job and returns job_id", async () => {
    const result = await executeInvokePrecog({
      precog: "schema",
      url: "https://example.com",
    });
    
    expect(result.job_id).toBeDefined();
    expect(result.stream_url).toContain("/v1/jobs/");
  });
});
```

### Integration Tests

```javascript
describe("OpenAI function calling", () => {
  it("calls function when user requests precog", async () => {
    const chunks = [];
    for await (const chunk of callWithFunctionCalling(
      "Run schema audit on https://example.com"
    )) {
      chunks.push(chunk);
    }
    
    expect(chunks.some(c => c.type === "function_call")).toBe(true);
  });
});
```

---

## Next Steps

1. **Install OpenAI SDK:** `npm install openai`
2. **Set API key:** `OPENAI_API_KEY` environment variable
3. **Test function definition:** Verify function is recognized
4. **Test execution:** Verify job creation works
5. **Add streaming:** Implement streaming responses
6. **Build extension:** Create VS Code/Cursor extension

---

## References

- OpenAI Function Calling Docs: https://platform.openai.com/docs/guides/function-calling
- Streaming with Functions: See GitHub gist references
- FastAPI Example: See article reference

---

**Status:** Implementation guide  
**Phase:** Phase 3 (Dev Tooling)  
**Last Updated:** $(date)

