# OpenAI Function Calling Integration for Precogs

How to integrate OpenAI's function calling feature with streaming responses into the Precogs "summonable oracle" workflow.

---

## Overview

OpenAI's function calling allows LLMs to invoke external tools/functions during a conversation. Combined with streaming, this enables:

- **Progressive results:** Stream partial answers as they're generated
- **Tool invocation:** Model can call precog functions when needed
- **Real-time feedback:** Users see progress immediately

---

## Key Resources

1. **GitHub Gist:** Streaming responses with function calls
2. **StackOverflow:** Edge cases and streaming behavior
3. **FastAPI Tutorial:** "Streaming OpenAI Assistant API Asynchronously with Function Calling"
4. **OpenAI Docs:** Official function calling documentation

---

## How This Maps to Precogs

### Current Flow

```
User → URL → Precogs API → Job Created → Worker Processes → Events Streamed
```

### With Function Calling

```
User → ChatGPT/LLM → Function Call → Precogs API → Job Created → Stream Progress → LLM Summarizes
```

### Benefits

- **Natural language interface:** "Run schema audit on this URL" instead of constructing URLs
- **Context-aware:** LLM can decide when to invoke precogs
- **Progressive results:** Stream events as they happen
- **Integration:** Works with ChatGPT, Cursor, VS Code extensions

---

## Architecture Integration

### Function Definition

Define `invoke_precog` function with parameters matching Precogs API:

```json
{
  "name": "invoke_precog",
  "description": "Invoke a Precogs oracle to analyze a URL using domain-specific knowledge",
  "parameters": {
    "type": "object",
    "properties": {
      "kb": {
        "type": "string",
        "description": "Knowledge base identifier (e.g., 'siding-services', 'cladding', 'general')"
      },
      "precog": {
        "type": "string",
        "description": "Precog type (e.g., 'schema', 'faq', 'pricing')",
        "enum": ["schema", "faq", "pricing"]
      },
      "url": {
        "type": "string",
        "description": "Target URL to analyze"
      },
      "type": {
        "type": "string",
        "description": "Context type (e.g., 'Service', 'Product')"
      },
      "task": {
        "type": "string",
        "description": "Task description or prompt"
      }
    },
    "required": ["precog", "url"]
  }
}
```

### Streaming Flow

1. **User Input:** "Run schema audit on https://example.com/service"
2. **LLM Decision:** Model decides to call `invoke_precog` function
3. **Function Call:** Backend receives function arguments
4. **Job Creation:** Create job via `/v1/invoke` or direct DB insert
5. **Stream Progress:** Stream events (`grounding.chunk`, `reasoning.delta`, `answer.delta`)
6. **Result Return:** Return `job_id` + stream URL to LLM
7. **LLM Summary:** LLM can summarize results or stream them to user

---

## Implementation Approaches

### Approach 1: Direct Function Execution

**Backend receives function call → Executes immediately → Returns result**

- **Pros:** Simple, synchronous
- **Cons:** Blocks until job completes (slow for long jobs)

### Approach 2: Job Creation + Stream URL

**Backend receives function call → Creates job → Returns job_id + stream URL → Client streams separately**

- **Pros:** Non-blocking, matches current architecture
- **Cons:** Requires client to handle streaming separately

### Approach 3: Hybrid Streaming

**Backend receives function call → Creates job → Streams events back to LLM → LLM streams to user**

- **Pros:** Best UX, progressive results
- **Cons:** More complex, requires streaming function results

---

## Streaming Considerations

### Function Call Response Handling

When using `stream=true` with function calling:

1. **Function Call Chunk:** Model indicates it wants to call a function
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

2. **Execute Function:** Backend executes precog job
3. **Return Result:** Send function result back to model
4. **Continue Streaming:** Model can continue generating response

### Partial Results

For long-running jobs, you can:

- Stream `grounding.chunk` events as they arrive
- Stream `reasoning.delta` for step-by-step progress
- Stream `answer.delta` for final answer chunks
- Return `job_id` for client to stream separately

---

## Integration Points

### Phase 3: Dev Tooling Integration

**VS Code / Cursor Extension:**
- User selects text/URL
- Extension calls OpenAI with function definition
- Model decides to invoke precog
- Extension shows streaming results

**Function-Call API Endpoint:**
- `/v1/function/invoke_precog` - Direct function execution
- Returns structured result for LLM consumption
- Can stream partial results

---

## Code Structure Needed

### 1. Function Definition Module

```javascript
// src/functions/invoke_precog.js
export const invokePrecogFunction = {
  name: "invoke_precog",
  description: "...",
  parameters: { ... }
};
```

### 2. Function Execution Handler

```javascript
// src/handlers/functionHandler.js
export async function executeInvokePrecog(args) {
  // Create job
  // Return job_id + stream URL
  // Or stream events directly
}
```

### 3. OpenAI Integration

```javascript
// src/integrations/openai.js
export async function callWithFunctionCalling(messages, functions, stream) {
  // Call OpenAI API with function definitions
  // Handle function call responses
  // Stream results
}
```

---

## Next Steps

1. **Research:** Review OpenAI function calling streaming examples
2. **Prototype:** Build simple function calling integration
3. **Test:** Verify streaming works with function calls
4. **Integrate:** Add to Phase 3 roadmap

---

## Questions for Team

1. **Which approach?** Direct execution, job creation, or hybrid?
2. **Streaming strategy?** Stream to LLM or return job_id?
3. **Function result format?** Structured JSON or text summary?
4. **Error handling?** How to handle function call failures?

---

**Status:** Research phase  
**Phase:** Phase 3 (Dev Tooling)  
**Last Updated:** $(date)

