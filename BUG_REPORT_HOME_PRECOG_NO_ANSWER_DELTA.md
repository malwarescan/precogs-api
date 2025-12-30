# Bug Report – home.safety Precog Returns No answer.delta

**Date:** December 2024  
**Environment:** https://precogs.croutons.ai  
**Endpoint:** POST /v1/run.ndjson  
**Status:** Job runs, graph queried, but no human-readable answer streamed

---

## Repro Steps

**Command run:**

```bash
curl -N "https://precogs.croutons.ai/v1/run.ndjson" \
  -H "Content-Type: application/json" \
  -d '{
    "precog": "home.safety",
    "task": "diagnose",
    "content": "I live near a canal in Fort Myers (33908). My garage floods when it rains. What should I be looking at for protection?"
  }'
```

**Actual response:**

```json
{"type":"ack","job_id":"d57894ac-6cdd-4a13-8547-d5d9761555ff"}
{"type":"grounding.chunk","data":{"count":1,"source":"https://graph.croutons.ai/api/triples"},"ts":"2025-11-15T05:51:52.357Z"}
{"type":"answer.complete","data":{"ok":true},"ts":"2025-11-15T05:51:52.359Z"}
{"type":"complete","status":"done","error":null}
```

**Notes:**
- `ack` = job accepted.
- `grounding.chunk` confirms the worker is calling the graph endpoint.
- Then it jumps straight to `answer.complete` and `complete` with `ok:true`.
- There are **zero** `answer.delta` events in between.

So the job runs and finishes, but never streams any content.

---

## Expected Behavior

For this request:

```json
{
  "precog": "home.safety",
  "task": "diagnose",
  "content": "I live near a canal in Fort Myers (33908). My garage floods when it rains. What should I be looking at for protection?"
}
```

I expect:
- One or more `answer.delta` events containing:
  - assessment
  - risk_score
  - likely causes
  - recommended steps
  - triage level
- Optionally: location context (33908 / Fort Myers) and flood-specific recommendations.

In other words, the same behavior as the schema precog: NDJSON stream with human-readable answer chunks, then `answer.complete`.

---

## Likely Issue (Hypothesis)

Inside `homePrecog` / home-foundation worker:
- The handler appears to:
  - Load KB
  - Hit `https://graph.croutons.ai/api/triples`
  - Compute some result
- But it likely:
  - Returns a final structured object without calling the streaming helpers, or
  - Calls a different event type that `/v1/run.ndjson` does not treat as `answer.delta`.

In code terms: the equivalent of `streamAnswerDelta(job_id, text)` or its abstraction is never being called for home tasks.

---

## Fix Applied

**File:** `precogs/precogs-api/precogs-worker/src/homePrecog.js`

**Changes:**
1. Enhanced `emitAnswer()` function to:
   - Always emit at least one event (defensive check for null/undefined result)
   - Add console.log statements for debugging
   - Emit all result fields including `dangerous_conditions`, `triage_level`, `when_to_call_pro`, `risk_projection`
   - Always emit full result JSON at the end
2. Added debug logging in `processHomePrecog()` to track:
   - When task completes
   - Result structure
   - When all events are emitted
3. Updated `queryCroutonsGraph()` to accept and use `emit` parameter to emit grounding chunk

**Key fix:** The `emitAnswer()` function now ensures that even if conditional fields are missing, it always emits the full result JSON at the end, guaranteeing at least one `answer.delta` event.

---

## Verification Steps

1. **Check worker logs for this job id:**
   ```
   job_id: d57894ac-6cdd-4a13-8547-d5d9761555ff
   ```
   - Confirm the home handler is running to completion.
   - Confirm what object it returns.
   - Look for new debug logs: `[home-precog] Task diagnose completed, result: ...`
   - Look for: `[home-precog] emitAnswer called with result keys: ...`
   - Look for: `[home-precog] All answer.delta events emitted for job ...`

2. **Re-deploy the worker:**
   ```bash
   cd ~/Desktop/croutons.ai/precogs/precogs-api/precogs-worker
   npx railway link
   npx railway up -s precogs-worker
   npx railway logs -s precogs-worker
   ```

3. **Re-test the curl command:**
   ```bash
   curl -N "https://precogs.croutons.ai/v1/run.ndjson" \
     -H "Content-Type: application/json" \
     -d '{
       "precog": "home.safety",
       "task": "diagnose",
       "content": "I live near a canal in Fort Myers (33908). My garage floods when it rains. What should I be looking at for protection?"
     }'
   ```

4. **Expected output after fix:**
   ```json
   {"type":"ack","job_id":"..."}
   {"type":"grounding.chunk","data":{"count":1,"source":"KB: home-foundation",...}}
   {"type":"grounding.chunk","data":{"count":1,"source":"https://graph.croutons.ai/api/triples",...}}
   {"type":"answer.delta","data":{"text":"\nAssessment:\nHome in a flood-risk area with ground-level garage flooding issue\n"}}
   {"type":"answer.delta","data":{"text":"\nRisk Score: 0.75\n"}}
   {"type":"answer.delta","data":{"text":"\nLikely Causes:\n"}}
   {"type":"answer.delta","data":{"text":"  • Insufficient drainage near garage entrance\n"}}
   {"type":"answer.delta","data":{"text":"  • Backflow from street drains during heavy rain\n"}}
   {"type":"answer.delta","data":{"text":"  • Lack of flood barriers or seals\n"}}
   {"type":"answer.delta","data":{"text":"\nRecommended Steps:\n"}}
   {"type":"answer.delta","data":{"text":"  • Install removable flood barrier at garage entrance\n"}}
   {"type":"answer.delta","data":{"text":"  • Add trench drain and ensure gutters discharge away from driveway\n"}}
   {"type":"answer.delta","data":{"text":"  • Check for proper grading around garage\n"}}
   {"type":"answer.delta","data":{"text":"\nTriage Level: caution\n"}}
   {"type":"answer.delta","data":{"text":"\nFull Result:\n```json\n{...}\n```\n"}}
   {"type":"answer.complete","data":{"ok":true}}
   {"type":"complete","status":"done"}
   ```

---

## Next Steps

Once this is in place, the home precog becomes actually usable from curl / GPT, and we'll know the vertical slice is really alive.

**If issues persist after deployment:**
- Check worker logs for the debug statements added
- Verify that `emitAnswer()` is being called (look for log: `[home-precog] emitAnswer called with result keys: ...`)
- Verify that `insertEvent()` is succeeding (check for database errors in logs)
- Verify that the API is correctly streaming events from the database (check API logs for SSE streaming)

---

## Files Modified

- `precogs/precogs-api/precogs-worker/src/homePrecog.js`
  - Enhanced `emitAnswer()` function
  - Added debug logging
  - Updated `queryCroutonsGraph()` to emit grounding chunk




