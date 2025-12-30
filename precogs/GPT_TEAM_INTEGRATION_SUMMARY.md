# GPT Implementation Team - Integration Summary

**Date:** 2025-01-05  
**Status:** Ready for Integration

---

## Quick Start

The Precogs API is ready for `bkk_massage` integration. Here's what you need:

### 1. Function Definition

Add `bkk_massage` to your `invoke_precog` function enum (already done in Precogs code).

### 2. API Endpoint

**POST** `https://precogs.croutons.ai/v1/run.ndjson`

**Request Body:**
```json
{
  "precog": "bkk_massage",
  "content": "User's question about Bangkok massage",
  "content_source": "inline",
  "task": "district_aware_ranking",
  "region": "Asok"
}
```

**Response:** NDJSON stream with events:
- `ack` - Job created
- `thinking` - Analysis in progress
- `grounding.chunk` - Data loaded
- `answer.delta` - Streaming text
- `answer.complete` - Finished
- `complete` - Job done

### 3. System Prompt

Add Bangkok massage section (see `GPT_PRECOGS_API_INTEGRATION.md` for full prompt).

---

## Documentation Files

1. **`/corpora/thailand/bangkok/massage/GPT_PRECOGS_API_INTEGRATION.md`**
   - Complete API integration guide
   - Code examples
   - Error handling
   - Testing checklist

2. **`/corpora/thailand/bangkok/massage/GPT_IMPLEMENTATION_INSTRUCTIONS.md`**
   - Function definition
   - System prompt additions
   - Example queries

---

## Key Points

- **API:** POST to `/v1/run.ndjson` with `precog: "bkk_massage"`
- **Region:** District name (Asok, Nana, etc.) - extract from user message
- **Tasks:** 4 available tasks (see integration guide)
- **Streaming:** NDJSON format, parse line by line
- **Safety:** Always prioritize verified safe shops

---

## Next Steps

1. Review `GPT_PRECOGS_API_INTEGRATION.md`
2. Update function definition in your GPT config
3. Add system prompt section
4. Implement stream handler
5. Test with sample queries

---

**Questions?** See integration guide or contact Precogs team.

