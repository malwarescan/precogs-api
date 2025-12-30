# Implementation Checklist: Seamless Invocation

Based on expert team memo requirements.

---

## ✅ Already Complete

- [x] Invocation endpoint (`/v1/invoke`, `/v1/run.ndjson`)
- [x] Function definition (`invokePrecogFunction`)
- [x] Function execution handler (`executeInvokePrecog`)
- [x] Streaming interfaces (SSE, NDJSON, CLI)
- [x] Job creation and enqueueing
- [x] Worker skeleton
- [x] UI viewers (CLI, auto, NDJSON)
- [x] Authentication and rate limiting
- [x] Returns job_id + stream URLs

---

## ⏳ Immediate Actions (This Week)

### Day 1: Add `/v1/chat` Endpoint

- [ ] Install OpenAI SDK: `npm install openai`
- [ ] Add `/v1/chat` endpoint to `server.js`
- [ ] Import `callWithFunctionCalling` from examples
- [ ] Add authentication middleware (if needed)
- [ ] Test endpoint responds

**Code Location:** `server.js` (add after `/cli` route)

### Day 2: Integrate Function Calling

- [ ] Wire up OpenAI API calls
- [ ] Handle function call chunks
- [ ] Execute `invoke_precog` when called
- [ ] Return structured results
- [ ] Test with simple prompts

**Code Location:** Use `src/integrations/openai-example.js` as reference

### Day 3: System Prompt & Optimization

- [ ] Create optimal system prompt
- [ ] Test function call accuracy
- [ ] Optimize function descriptions
- [ ] Handle edge cases
- [ ] Add error handling

**File:** Create `src/prompts/system.js`

### Day 4: Testing

- [ ] Test with OpenAI API (if available)
- [ ] Test function call detection
- [ ] Test function execution
- [ ] Test result formatting
- [ ] Test streaming responses

### Day 5: Documentation

- [ ] Update API docs
- [ ] Create ChatGPT integration guide
- [ ] Add usage examples
- [ ] Document system prompt

---

## Week 2: KB Parameter Support

### KB Parameter Implementation

- [ ] Accept `kb` in all endpoints
- [ ] Validate `kb` parameter
- [ ] Store `kb` in job context
- [ ] Update function definition with KB enum
- [ ] Add KB validation logic

**Files:**
- `server.js` - Update endpoints
- `src/functions/invoke_precog.js` - Update enum
- `src/db.js` - Store in context

### UI Improvements

- [ ] Better error messages for invalid KB
- [ ] Loading states in CLI viewer
- [ ] Progress indicators
- [ ] KB selection UI (future)

---

## Weeks 3-4: Knowledge Base Integration

### KB Storage

- [ ] Choose vector database (per decision)
- [ ] Set up vector database
- [ ] Create KB schema
- [ ] Implement KB ingestion API

### KB Retrieval

- [ ] Implement KB query in worker
- [ ] Add embeddings generation
- [ ] Implement semantic search
- [ ] Cache frequently accessed docs

### Worker Updates

- [ ] Update worker to query KB
- [ ] Add KB context to precog processing
- [ ] Stream KB docs as `grounding.chunk`
- [ ] Test end-to-end flow

---

## Testing Checklist

### Function Calling Tests

- [ ] ChatGPT calls function correctly
- [ ] Function arguments parsed correctly
- [ ] Job created successfully
- [ ] Returns correct URLs
- [ ] Streaming works

### Integration Tests

- [ ] End-to-end: User → ChatGPT → Function → Job → Stream
- [ ] Direct URL: User → CLI → Job → Stream
- [ ] Cursor integration: Editor → Function → Stream

### Error Handling Tests

- [ ] Invalid parameters
- [ ] Missing required params
- [ ] Invalid KB
- [ ] Network errors
- [ ] Worker failures

---

## Success Criteria

### Phase 1 (This Week)

- ✅ `/v1/chat` endpoint responds
- ✅ Function calls execute
- ✅ Returns job_id + URLs
- ✅ ChatGPT can invoke successfully

### Phase 2 (Week 2)

- ✅ KB parameter accepted
- ✅ KB validation works
- ✅ Stored in job context

### Phase 3 (Weeks 3-4)

- ✅ KB queries work
- ✅ Domain-specific results
- ✅ Improved accuracy

---

## Code Locations

### New Files Needed

- `server.js` - Add `/v1/chat` endpoint
- `src/prompts/system.js` - System prompt
- `package.json` - Add `openai` dependency

### Existing Files to Update

- `src/functions/invoke_precog.js` - Already complete
- `src/integrations/openai-example.js` - Already complete
- `src/db.js` - May need KB context storage
- `precogs-worker/worker.js` - Add KB query logic

---

## Dependencies

### Required

- `openai` - OpenAI SDK (npm install openai)
- `OPENAI_API_KEY` - Environment variable

### Optional (Phase 3)

- Vector database SDK (TBD)
- Embedding model API/SDK (TBD)

---

## Timeline Summary

**This Week:**
- Day 1-2: `/v1/chat` endpoint
- Day 3: System prompt & optimization
- Day 4: Testing
- Day 5: Documentation

**Next Week:**
- KB parameter support
- UI improvements

**Weeks 3-4:**
- Full KB integration
- Worker KB queries

---

**Status:** Ready to implement  
**Confidence:** High - code examples ready  
**Last Updated:** $(date)

