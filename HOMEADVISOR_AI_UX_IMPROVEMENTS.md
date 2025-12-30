# HomeAdvisor AI UX Improvements

**Date:** December 2024  
**Issue:** Flow feels choppy, too many questions before calling Precogs

---

## Problems Identified

### Current Flow (Not Fluid)
```
User: "How much would a flood barrier cost in Fort Myers?"
GPT: "Could you share your ZIP code?"
User: "33907"
GPT: "Still on it — the last step hasn't come back yet."
GPT: "Let me re-run... Can you confirm temporary vs permanent?"
```

**Issues:**
1. ❌ Asking for ZIP when "Fort Myers" is enough
2. ❌ Saying "hasn't come back yet" - poor UX
3. ❌ Asking for clarification before calling Precogs
4. ❌ No loading state shown to user

---

## Improved Flow (Fluid)

### Target Flow
```
User: "How much would a flood barrier cost in Fort Myers?"
GPT: [Shows "Analyzing..." with animated dots]
GPT: [Calls Precogs immediately with region="Fort Myers", task="cost_band"]
GPT: "Based on Fort Myers, FL, flood barrier installation typically costs $1,200-$5,600. The median cost is around $3,400. Best time to install is April-May, before hurricane season."
```

**Improvements:**
1. ✅ Call Precogs immediately with available info
2. ✅ Show loading state ("Analyzing...")
3. ✅ Don't ask for clarification upfront
4. ✅ Use location from user message directly

---

## Changes Made

### 1. Updated GPT Instructions

**File:** `HOMEADVISOR_AI_GPT_INSTRUCTIONS.md`

**Key Changes:**
- ✅ "Call Precogs IMMEDIATELY" - don't ask questions first
- ✅ "Use location immediately if mentioned" - don't ask for confirmation
- ✅ "Show loading state" - "Analyzing..." with animated dots
- ✅ "Never ask for clarification before calling" - call with best guess

### 2. Added "thinking" Event

**File:** `precogs/precogs-api/precogs-worker/src/homePrecog.js`

**Added:**
```javascript
await emit("thinking", {
  message: "Analyzing your request...",
  status: "analyzing",
});
```

**Purpose:** Provides early feedback that Precogs is working, allows UI to show loading animation.

---

## Loading Animation Implementation

### For GPT Team (UI Layer)

**Option 1: Simple Text Animation**
```
"Analyzing..."
"Analyzing.."
"Analyzing."
"Analyzing..."
```

**Option 2: Dots Animation**
```
"Analyzing"
"Analyzing."
"Analyzing.."
"Analyzing..."
"Analyzing"
```

**Option 3: Spinner + Text**
```
"⏳ Analyzing your request..."
```

### Implementation Pattern

```javascript
// When invoke_precog is called
showLoadingState("Analyzing...");

// While fetching stream
updateLoadingState("Analyzing..");

// When answer.complete received
hideLoadingState();
showResults();
```

### Precogs Event Handling

**Listen for:**
- `thinking` event → Show "Analyzing..."
- `grounding.chunk` → Update to "Gathering data..."
- `answer.delta` → Show partial results (optional)
- `answer.complete` → Hide loading, show full results

---

## Example: Cost Question Flow

### User Input
```
"How much would a flood barrier cost in Fort Myers?"
```

### GPT Action (Immediate)
```json
{
  "name": "invoke_precog",
  "arguments": {
    "precog": "home.flood",
    "content": "How much would a flood barrier cost in Fort Myers?",
    "content_source": "inline",
    "task": "cost_band",
    "region": "Fort Myers, FL",
    "vertical": "flood_protection"
  }
}
```

### GPT UI State
```
[Shows: "Analyzing..." with animated dots]
```

### Precogs Stream
```json
{"type":"thinking","data":{"message":"Analyzing your request...","status":"analyzing"}}
{"type":"grounding.chunk","data":{"source":"KB: home-foundation",...}}
{"type":"grounding.chunk","data":{"source":"https://graph.croutons.ai/api/triples",...}}
{"type":"answer.delta","data":{"text":"\nCost Band: $1,200-$5,600\n"}}
{"type":"answer.delta","data":{"text":"\nWhen: April-May (before hurricane season)\n"}}
{"type":"answer.complete","data":{"ok":true}}
{"type":"complete","status":"done"}
```

### GPT Response
```
Based on Fort Myers, FL, flood barrier installation typically costs:

**Cost Range:** $1,200-$5,600
**Median Cost:** ~$3,400
**Best Time to Install:** April-May (before hurricane season)

This range covers both temporary and permanent flood barrier systems. For a more specific estimate, I'd need to know:
- The size of the area you need to protect
- Whether you prefer temporary (removable) or permanent installation

Would you like me to help you find a local flood protection specialist in Fort Myers?
```

---

## Best Practices

### ✅ DO
- Call Precogs immediately with available info
- Show loading state ("Analyzing...")
- Use location from user message directly
- Infer vertical from problem description
- Show results as soon as `answer.complete` arrives

### ❌ DON'T
- Ask for ZIP code when city/state is provided
- Ask for clarification before calling Precogs
- Say "hasn't come back yet" - just show loading
- Wait for perfect information - use best guess
- Ask multiple questions before responding

---

## Testing

### Test Case 1: Cost Question with Location
**Input:** "How much would a flood barrier cost in Fort Myers?"  
**Expected:** Immediate call with region="Fort Myers, FL", task="cost_band"  
**Loading:** "Analyzing..." shown immediately

### Test Case 2: Cost Question with ZIP
**Input:** "How much would a flood barrier cost? ZIP 33907"  
**Expected:** Immediate call with region="33907", task="cost_band"  
**Loading:** "Analyzing..." shown immediately

### Test Case 3: Problem Description
**Input:** "My garage floods when it rains. I'm in Naples, FL"  
**Expected:** Immediate call with region="Naples, FL", task="diagnose"  
**Loading:** "Analyzing..." shown immediately

---

## Status

✅ **GPT Instructions Updated** - Now emphasizes immediate calls  
✅ **Thinking Event Added** - Precogs emits early loading signal  
⏳ **UI Implementation** - GPT team needs to implement loading animation

---

## Next Steps for GPT Team

1. **Update System Prompt** - Use new instructions from `HOMEADVISOR_AI_GPT_INSTRUCTIONS.md`
2. **Implement Loading Animation** - Show "Analyzing..." with animated dots
3. **Handle `thinking` Event** - Update loading message when received
4. **Test Flow** - Verify immediate calls, no unnecessary questions
5. **Monitor UX** - Collect feedback on flow smoothness

---

**Files Updated:**
- `HOMEADVISOR_AI_GPT_INSTRUCTIONS.md` - Improved flow guidance
- `precogs/precogs-api/precogs-worker/src/homePrecog.js` - Added thinking event




