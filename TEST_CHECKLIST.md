# Test Checklist: Precogs Validation

~10 key test cases to validate the build before full rollout.

---

## Test Environment Setup

**Prerequisites:**
- API running (local or staging)
- Database connected
- Redis connected
- Worker running
- OpenAI API key configured

**Test Base URL:**
- Local: `http://localhost:8080`
- Staging: `https://precogs.croutons.ai`

---

## Test Cases

### ✅ Test 1: Happy Path - Direct URL Invocation

**Goal:** Verify complete flow from URL to streaming results

**Steps:**
1. Open browser to: `https://precogs.croutons.ai/cli?precog=schema&url=https://example.com&task=Generate%20JSON-LD`
2. Verify page loads and shows terminal UI
3. Verify job is created (check for `job_id` in output)
4. Verify events stream: `grounding.chunk` → `answer.delta` → `answer.complete`
5. Verify final output is displayed

**Expected Results:**
- ✅ Page loads within 2 seconds
- ✅ Job created within 1 second
- ✅ First event arrives within 5 seconds
- ✅ Complete output displayed
- ✅ No errors in console

**Status:** ⬜ Not Tested

---

### ✅ Test 2: Happy Path - ChatGPT Function Calling

**Goal:** Verify ChatGPT can invoke function and return links

**Steps:**
1. Send message to `/v1/chat`: "Run schema audit on https://example.com"
2. Verify function call is detected (`type: "function_call"`)
3. Verify function executes (`type: "function_result"`)
4. Verify job_id and URLs are returned
5. Verify model provides follow-up response with links

**Expected Results:**
- ✅ Function call detected within 2 seconds
- ✅ Function executes successfully
- ✅ Job_id and URLs returned
- ✅ Model provides helpful follow-up
- ✅ No errors in stream

**Status:** ⬜ Not Tested

---

### ✅ Test 3: Function Argument Accumulation

**Goal:** Verify multi-chunk function arguments are handled correctly

**Steps:**
1. Monitor `/v1/chat` endpoint logs
2. Send message that triggers function call
3. Verify arguments accumulate across chunks (check logs)
4. Verify function executes only when `finish_reason === "function_call"`
5. Verify arguments are complete and valid JSON

**Expected Results:**
- ✅ Arguments accumulate correctly
- ✅ No premature execution
- ✅ Complete JSON arguments
- ✅ Function executes successfully

**Status:** ⬜ Not Tested

---

### ✅ Test 4: Invalid Parameters Handling

**Goal:** Verify system handles invalid/missing parameters gracefully

**Test Cases:**

**4a. Missing Required Parameter**
- Request: `{"precog": "schema"}` (missing `url`)
- Expected: Error message, no job created

**4b. Invalid KB Parameter**
- Request: `{"precog": "schema", "url": "https://example.com", "kb": "invalid-kb"}`
- Expected: Falls back to `"general"`, job created

**4c. Invalid URL Format**
- Request: `{"precog": "schema", "url": "not-a-url"}`
- Expected: Error or validation message

**Expected Results:**
- ✅ Clear error messages
- ✅ No crashes or 500 errors
- ✅ Graceful fallbacks where appropriate

**Status:** ⬜ Not Tested

---

### ✅ Test 5: Streaming Interruption

**Goal:** Verify system handles client disconnections gracefully

**Steps:**
1. Start streaming job via `/v1/jobs/:id/events`
2. Disconnect client (close browser tab, cancel curl)
3. Verify server handles disconnect without errors
4. Verify job continues processing in worker
5. Verify reconnection works (connect again to same job_id)

**Expected Results:**
- ✅ No server errors on disconnect
- ✅ Job continues processing
- ✅ Reconnection shows all events
- ✅ No memory leaks

**Status:** ⬜ Not Tested

---

### ✅ Test 6: SSE Format Validation

**Goal:** Verify SSE events are properly formatted

**Steps:**
1. Connect to `/v1/jobs/:id/events` via `curl -N`
2. Verify headers: `Content-Type: text/event-stream`
3. Verify format: `data: {json}\n\n`
4. Verify keep-alive heartbeats every 15 seconds
5. Verify events are valid JSON

**Expected Results:**
- ✅ Correct headers
- ✅ Correct SSE format
- ✅ Keep-alive heartbeats
- ✅ Valid JSON in all events

**Status:** ⬜ Not Tested

---

### ✅ Test 7: NDJSON Format Validation

**Goal:** Verify NDJSON endpoint works correctly

**Steps:**
1. Request: `GET /v1/run.ndjson?precog=schema&url=https://example.com&task=Test`
2. Verify response headers: `Content-Type: application/x-ndjson`
3. Verify format: One JSON object per line
4. Verify events stream correctly
5. Verify `complete` event at end

**Expected Results:**
- ✅ Correct headers
- ✅ Valid NDJSON format
- ✅ Events stream correctly
- ✅ Complete event received

**Status:** ⬜ Not Tested

---

### ✅ Test 8: Rate Limiting

**Goal:** Verify rate limiting prevents abuse

**Steps:**
1. Send 60 requests to `/v1/invoke` within 1 minute (from same IP)
2. Verify first 60 succeed
3. Verify 61st request returns `429 Too Many Requests`
4. Verify `retryAfter` header is present
5. Wait for window to reset, verify requests succeed again

**Expected Results:**
- ✅ Rate limit enforced (60 req/min)
- ✅ 429 status code on limit
- ✅ `retryAfter` header present
- ✅ Reset works correctly

**Status:** ⬜ Not Tested

---

### ✅ Test 9: Authentication

**Goal:** Verify authentication works correctly

**Test Cases:**

**9a. Valid Token**
- Request: `POST /v1/invoke` with `Authorization: Bearer $API_KEY`
- Expected: Request succeeds

**9b. Invalid Token**
- Request: `POST /v1/invoke` with `Authorization: Bearer invalid-token`
- Expected: `401 Unauthorized`

**9c. Missing Token (if required)**
- Request: `POST /v1/invoke` without auth header
- Expected: `401 Unauthorized` or succeeds if optional

**9d. Token in Query (SSE)**
- Request: `GET /v1/jobs/:id/events?token=$API_KEY`
- Expected: Request succeeds

**Expected Results:**
- ✅ Valid tokens work
- ✅ Invalid tokens rejected
- ✅ Query token works for SSE
- ✅ Clear error messages

**Status:** ⬜ Not Tested

---

### ✅ Test 10: Error Handling - Function Execution Failure

**Goal:** Verify system handles function execution errors gracefully

**Steps:**
1. Trigger function call that will fail (e.g., invalid URL, network error)
2. Verify error is caught and logged
3. Verify error event is streamed: `{"type": "error", ...}`
4. Verify job status is updated to `error`
5. Verify error message is user-friendly

**Expected Results:**
- ✅ Errors caught and logged
- ✅ Error events streamed
- ✅ Job status updated
- ✅ User-friendly error messages
- ✅ No crashes

**Status:** ⬜ Not Tested

---

### ✅ Test 11: Fallback Defaults

**Goal:** Verify KB defaults work correctly

**Steps:**
1. Request without `kb` parameter: `{"precog": "schema", "url": "https://example.com"}`
2. Verify `kb` defaults to `"general"`
3. Verify job context includes `kb: "general"`
4. Verify worker receives correct KB value
5. Verify system works without domain-specific KBs

**Expected Results:**
- ✅ Defaults to `"general"`
- ✅ Job context correct
- ✅ Worker receives correct value
- ✅ System works without domain KBs

**Status:** ⬜ Not Tested

---

### ✅ Test 12: Metrics Endpoint

**Goal:** Verify metrics are tracked correctly

**Steps:**
1. Create several jobs (some succeed, some fail)
2. Request: `GET /metrics`
3. Verify metrics returned:
   - `processed_total` increments
   - `failed_total` increments on failures
   - `inflight_jobs` shows current count
   - `oldest_pending_age_seconds` shows age
4. Verify metrics are accurate

**Expected Results:**
- ✅ Metrics endpoint returns data
- ✅ Counts are accurate
- ✅ No errors in metrics calculation

**Status:** ⬜ Not Tested

---

## Test Execution Log

**Date:** ________  
**Tester:** ________  
**Environment:** ________

| Test # | Status | Notes |
|--------|--------|-------|
| 1 | ⬜ | |
| 2 | ⬜ | |
| 3 | ⬜ | |
| 4 | ⬜ | |
| 5 | ⬜ | |
| 6 | ⬜ | |
| 7 | ⬜ | |
| 8 | ⬜ | |
| 9 | ⬜ | |
| 10 | ⬜ | |
| 11 | ⬜ | |
| 12 | ⬜ | |

---

## Quick Test Script

```bash
#!/bin/bash
# Quick smoke test script

API_BASE="https://precogs.croutons.ai"
API_KEY="${PRECOGS_API_TOKEN:-}"

echo "Testing Precogs API..."

# Test 1: Health check
echo "1. Health check..."
curl -sS "$API_BASE/health" | jq .

# Test 2: Metrics
echo "2. Metrics..."
curl -sS "$API_BASE/metrics" | jq .

# Test 3: Create job
echo "3. Create job..."
RESP=$(curl -sS "$API_BASE/v1/invoke" \
  -H "Content-Type: application/json" \
  ${API_KEY:+-H "Authorization: Bearer $API_KEY"} \
  -d '{"precog":"schema","url":"https://example.com","task":"Test"}')
echo "$RESP" | jq .

JOB_ID=$(echo "$RESP" | jq -r '.job_id // empty')
if [ -z "$JOB_ID" ]; then
  echo "ERROR: No job_id returned"
  exit 1
fi

# Test 4: Stream events (first 5 seconds)
echo "4. Stream events..."
timeout 5 curl -N "$API_BASE/v1/jobs/$JOB_ID/events" || true

echo "Tests complete!"
```

---

## Success Criteria

**All tests must pass before rollout:**

- ✅ All happy path tests pass
- ✅ Error handling works correctly
- ✅ Rate limiting enforced
- ✅ Authentication works (if enabled)
- ✅ Metrics accurate
- ✅ No crashes or 500 errors
- ✅ Streaming works reliably
- ✅ Defaults work correctly

---

**Status:** Test checklist ready for execution  
**Last Updated:** $(date)

