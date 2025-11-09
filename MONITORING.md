# Monitoring & Metrics for /v1/chat

Monitoring setup for OpenAI function calling integration.

---

## Logging

### Request Logs

Every `/v1/chat` request logs:
- Request received timestamp
- Message preview (first 100 chars)
- Whether history is present

### Function Call Logs

When function is called:
- Function name
- Arguments received

### Job Creation Logs

When job is created:
- Job ID
- Time to create job (ms)

### Completion Logs

When stream completes:
- Function called (boolean)
- Job created (boolean)
- Total time (ms)
- First chunk time (ms)

### Example Logs

```
[chat] Request received: { message: 'Run schema audit...', hasHistory: false }
[chat] First chunk: 234 ms
[chat] Function called: invoke_precog
[chat] Job created: 550e8400-e29b-41d4-a716-446655440000 in 456 ms
[chat] Completed: { functionCalled: true, jobCreated: true, totalTime: '1234ms', firstChunkTime: '234ms' }
```

---

## Metrics to Track

### Latency Metrics

1. **First Chunk Time**
   - Time from request to first SSE chunk
   - Target: < 500ms
   - Logged: `[chat] First chunk: X ms`

2. **Job Creation Time**
   - Time from function call to job created
   - Target: < 100ms
   - Logged: `[chat] Job created: ... in X ms`

3. **Total Stream Time**
   - Time from request to stream complete
   - Target: < 5s (for function call + follow-up)
   - Logged: `[chat] Completed: { totalTime: 'Xms' }`

### Success Metrics

1. **Function Call Rate**
   - Percentage of requests that trigger function calls
   - Target: > 80% (when user requests precog)

2. **Job Creation Success Rate**
   - Percentage of function calls that successfully create jobs
   - Target: > 95%

3. **Stream Completion Rate**
   - Percentage of streams that complete successfully
   - Target: > 95%

### Error Metrics

1. **Function Call Errors**
   - Parse errors
   - Execution errors
   - Logged: `[chat] Stream error: ...`

2. **Client Disconnects**
   - Logged: `[chat] Client disconnected`

---

## Adding to /metrics Endpoint

### Proposed Metrics

```javascript
// In /metrics endpoint
const chatMetrics = {
  chat_requests_total: 0,
  chat_function_calls_total: 0,
  chat_jobs_created_total: 0,
  chat_errors_total: 0,
  chat_avg_first_chunk_ms: null,
  chat_avg_job_creation_ms: null,
};
```

### Implementation

Track metrics in memory (or use Redis for distributed tracking):

```javascript
// In server.js
const chatMetrics = {
  requests: 0,
  functionCalls: 0,
  jobsCreated: 0,
  errors: 0,
  firstChunkTimes: [],
  jobCreationTimes: [],
};

// Update in /v1/chat endpoint
chatMetrics.requests++;
if (functionCalled) chatMetrics.functionCalls++;
if (jobCreated) chatMetrics.jobsCreated++;
if (firstChunkTime) chatMetrics.firstChunkTimes.push(firstChunkTime - startTime);
```

---

## Alerting Thresholds

### Critical Alerts

- **Error rate > 10%** - Function calls failing
- **Job creation failure > 5%** - Jobs not being created
- **Avg first chunk > 2s** - Slow OpenAI responses
- **Avg job creation > 500ms** - Slow job creation

### Warning Alerts

- **Function call rate < 50%** - Model not calling functions when expected
- **Stream completion < 90%** - Streams not completing

---

## Log Aggregation

### Railway Logs

Railway automatically aggregates logs. Filter by:
- `[chat]` prefix for chat endpoint logs
- `[invoke_precog]` for function execution logs

### External Logging (Optional)

- **Datadog** - Full APM
- **Grafana + Loki** - Self-hosted
- **Sentry** - Error tracking

---

## Testing Monitoring

### Test Script

Run `npm run test:chat` to generate test logs:

```bash
npm run test:chat
```

This will:
- Send test request
- Generate logs
- Verify metrics are tracked

### Manual Testing

```bash
curl -X POST http://localhost:8080/v1/chat \
  -H 'Content-Type: application/json' \
  -d '{"message": "Run schema audit on https://example.com"}' \
  > /dev/null

# Check logs for metrics
```

---

**Status:** Monitoring ready  
**Last Updated:** $(date)

