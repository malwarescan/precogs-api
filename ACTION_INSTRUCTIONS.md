# Action Instructions for Dev Team

**Date:** $(date)  
**Status:** Critical - Final Push to Production  
**Timeline:** This Week

---

## 🔧 Action Instructions

### 1. Complete the `/v1/chat` Endpoint This Week

**Tasks:**
- [ ] Ensure it handles streaming + function-calling correctly
  - Accumulate function arguments across chunks
  - Trigger and execute `invoke_precog` when function call detected
  - Handle `finish_reason === "function_call"` correctly
- [ ] Validate it returns correct response format:
  - `job_id` - UUID of created job
  - `stream_url` - SSE endpoint URL
  - `cli_url` - CLI viewer URL
  - `ndjson_url` - NDJSON stream URL
- [ ] Run manual tests and fix any issues immediately
- [ ] Test edge cases:
  - Multi-chunk function arguments
  - Parse errors in arguments
  - Function execution failures
  - Client disconnections

**Owner:** Backend Lead  
**Due:** End of week  
**Status:** 🟡 In Progress

**Reference:**
- `src/integrations/openai-chat.js` - Implementation
- `CHAT_ENDPOINT_USAGE.md` - Documentation
- `STREAMING_FUNCTION_CALLING_CHEATSHEET.md` - Patterns

---

### 2. Run Full Integration Test Suite

**Tasks:**
- [ ] Execute `scripts/test-chat-endpoint.js` (or equivalent)
- [ ] Validate flows:

  **Flow 1: ChatGPT Invocation**
  - [ ] Send message to `/v1/chat`
  - [ ] Verify function call detected
  - [ ] Verify job created
  - [ ] Verify streaming results work
  - [ ] Verify model provides follow-up response

  **Flow 2: Direct URL Invocation**
  - [ ] Open `/cli?precog=schema&url=https://example.com&task=Test`
  - [ ] Verify page loads
  - [ ] Verify job created
  - [ ] Verify streaming works
  - [ ] Verify output displayed correctly

  **Flow 3: CLI Viewer Flow**
  - [ ] Navigate to CLI viewer
  - [ ] Verify job creation
  - [ ] Verify real-time output streams
  - [ ] Verify terminal UI updates correctly

- [ ] Document test outcomes
- [ ] Fix blocker bugs immediately
- [ ] Re-test after fixes

**Owner:** Dev Team  
**Due:** Mid-week  
**Status:** ⚠️ Needs Completion

**Reference:**
- `TEST_CHECKLIST.md` - 12 test cases
- `scripts/test-chat-endpoint.js` - Test script

---

### 3. Validate Fallback Defaults / `kb="general"` Behavior

**Tasks:**
- [ ] Test when `kb` parameter is omitted:
  - [ ] Job still created successfully
  - [ ] System doesn't error
  - [ ] Defaults to `"general"` correctly
- [ ] Test invalid `kb` values:
  - [ ] User gets clear error OR fallback path
  - [ ] System doesn't crash
  - [ ] Fallback to `"general"` works
- [ ] Confirm documentation updated to reflect default logic
- [ ] Test Phase 1 can proceed without domain KBs

**Owner:** Backend Lead  
**Due:** End of week  
**Status:** 🟡 In Progress

**Reference:**
- `src/functions/invoke_precog.js` - Default logic
- `ACTIONABLE_INSIGHTS.md` - Insight #4

---

### 4. Integrate Monitoring, Metrics & Error Handling

**Tasks:**
- [ ] Ensure `/metrics` endpoint working and capturing:
  - [ ] Job creation time
  - [ ] First event latency
  - [ ] Job success/failure counts
  - [ ] Inflight jobs count
  - [ ] Redis lag metrics
- [ ] Logging configured for:
  - [ ] Function call start
  - [ ] Job completed
  - [ ] Streaming errors
  - [ ] Client disconnects
  - [ ] Parse errors
  - [ ] Function execution failures
- [ ] Set up alerts/thresholds for:
  - [ ] Error rate breaches (> 5%)
  - [ ] Latency breaches (> 30s)
  - [ ] High failure rates

**Owner:** Backend Lead + Dev Team  
**Due:** End of week  
**Status:** ⚠️ Needs Completion

**Reference:**
- `server.js` - `/metrics` endpoint
- `MONITORING.md` - Monitoring strategies

---

### 5. Finalize Documentation

**Tasks:**
- [ ] Ensure all endpoints documented:
  - [ ] `/v1/chat` - Function calling endpoint
  - [ ] `/v1/invoke` - Job creation endpoint
  - [ ] `/v1/jobs/:id/events` - SSE streaming endpoint
  - [ ] `/v1/run.ndjson` - NDJSON streaming endpoint
  - [ ] `/cli` - CLI viewer
  - [ ] `/metrics` - Metrics endpoint
- [ ] Document all parameters:
  - [ ] `kb` - Knowledge base (defaults to "general")
  - [ ] `precog` - Precog type (required)
  - [ ] `url` - Target URL (required)
  - [ ] `type` - Context type (optional)
  - [ ] `task` - Task description (optional)
- [ ] Document response formats:
  - [ ] Event types: `content`, `function_call`, `function_result`, `complete`, `error`
  - [ ] Job response format
  - [ ] Error response format
- [ ] Update example curl commands
- [ ] Update editor/ChatGPT usage examples
- [ ] Distribute key documents:
  - [ ] `ALIGNMENT_SUMMARY.md`
  - [ ] `STATUS.md`
  - [ ] `STREAMING_FUNCTION_CALLING_CHEATSHEET.md`

**Owner:** Product Owner + Dev Team  
**Due:** End of week  
**Status:** ✅ Mostly Done (needs final review)

**Reference:**
- `CHAT_ENDPOINT_USAGE.md` - Endpoint docs
- `STREAMING_FUNCTION_CALLING_CHEATSHEET.md` - Quick reference

---

### 6. Communicate Status and Blockers

**Tasks:**
- [ ] At end of day, share status update:
  - [ ] ✅ Done - What was completed
  - [ ] 🟡 In Progress - What's being worked on
  - [ ] ⚠️ Blocked - What's blocked and why
- [ ] If blocker prevents next step:
  - [ ] Describe issue clearly
  - [ ] Identify owner
  - [ ] Provide expected resolution time
  - [ ] Escalate if needed

**Owner:** All Team Members  
**Due:** Daily  
**Status:** Ongoing

---

## 🕒 Immediate Priority Timeline

### Today
- [ ] Confirm `/v1/chat` endpoint work is on track
- [ ] Allocate resources if needed
- [ ] Identify any immediate blockers

### By Mid-Week
- [ ] Run integration tests
- [ ] Fix major flow issues
- [ ] Validate fallback defaults working

### By Week End
- [ ] Ensure fallback defaults complete
- [ ] Monitoring/metrics integrated
- [ ] Documentation finalized
- [ ] No critical blockers remain

---

## Success Criteria

Before we can say we're "finished":

- [ ] `/v1/chat` endpoint works reliably
- [ ] All three invocation flows tested and working
- [ ] Fallback defaults validated
- [ ] Monitoring/metrics tracking correctly
- [ ] Error handling covers edge cases
- [ ] Documentation complete and accurate
- [ ] Integration tests pass
- [ ] No critical blockers

---

## Team Response Required

**Please respond with one of the following:**

- ✅ **"I'm aligned"** - Ready to proceed, understand requirements
- ❓ **"I have questions"** - Please list specific questions
- ⚠️ **"I see a blocker"** - Please describe the blocker in detail

---

## Quick Reference

### Key Files to Review
- `src/integrations/openai-chat.js` - Function calling implementation
- `src/functions/invoke_precog.js` - Function definition and execution
- `server.js` - API endpoints
- `scripts/test-chat-endpoint.js` - Integration test script

### Key Documents
- `FINISH_LINE_CHECKLIST.md` - What "finish" means
- `STATUS.md` - Detailed component status
- `ALIGNMENT_SUMMARY.md` - Quick alignment reference
- `TEST_CHECKLIST.md` - 12 test cases
- `ACTIONABLE_INSIGHTS.md` - Key development insights

---

## Daily Stand-up Format

**Use this format for daily updates:**

```
✅ Done:
- [List completed items]

🟡 In Progress:
- [List items being worked on]

⚠️ Blocked:
- [List blockers with details]

Questions:
- [List any questions]
```

---

**Status:** Action instructions ready for team  
**Last Updated:** $(date)

