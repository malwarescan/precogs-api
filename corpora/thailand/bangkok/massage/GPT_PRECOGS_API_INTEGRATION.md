# GPT Implementation Team - Precogs API Integration Guide

**For:** GPT Development Team  
**Purpose:** Complete instructions for integrating GPT agents with Precogs API for Bangkok Massage Intelligence (`bkk_massage`)

---

## Overview

This guide explains how to integrate GPT agents with the Precogs API to access Bangkok Massage Intelligence. The Precogs API provides a streaming interface that returns real-time results for queries about massage shops, districts, pricing, and safety in Bangkok.

**Key Principle:** GPT agents should call the Precogs API for all Bangkok massage queries rather than making domain decisions themselves.

---

## Function Definition

Add this function to your GPT function calling configuration:

```json
{
  "name": "invoke_precog",
  "description": "Invoke a Precogs oracle to analyze content using domain-specific knowledge. For Bangkok massage queries, use precog='bkk_massage' to get safety-verified shop recommendations, district information, pricing, and risk assessments. Returns a job_id and stream URL for real-time results.",
  "parameters": {
    "type": "object",
    "properties": {
      "precog": {
        "type": "string",
        "description": "Precog namespace to invoke. Use 'bkk_massage' for Bangkok massage queries.",
        "enum": ["schema", "faq", "pricing", "home", "home.hvac", "home.plumbing", "home.electrical", "home.safety", "home.safety.mold", "home.flood", "bkk_massage"]
      },
      "content": {
        "type": "string",
        "description": "User's question or request. For bkk_massage, this should be the user's massage-related query (e.g., 'Where can I get a safe massage in Asok?', 'What are the prices in Nana?', 'Is this shop safe for solo female travelers?')"
      },
      "content_source": {
        "type": "string",
        "enum": ["inline", "url"],
        "default": "inline",
        "description": "Always use 'inline' for chat-based queries"
      },
      "task": {
        "type": "string",
        "description": "Task type. For bkk_massage, use: 'legitimacy_scoring' (default), 'district_aware_ranking', 'safety_pattern_recognition', 'price_sanity_checking'"
      },
      "region": {
        "type": "string",
        "description": "For bkk_massage, extract district from user query (e.g., 'Asok', 'Nana', 'Phrom Phong', 'Thonglor', 'Ekkamai', 'Silom', 'Ari', 'Victory Monument', 'Ratchada', 'Old City'). Use immediately if mentioned, don't ask for confirmation."
      }
    },
    "required": ["precog", "content"]
  }
}
```

---

## API Endpoints

### 1. Create Job (Function Call)

When GPT calls `invoke_precog`, it receives:

```json
{
  "job_id": "job_abc123",
  "status": "pending",
  "stream_url": "https://precogs.croutons.ai/v1/jobs/job_abc123/events",
  "ndjson_url": "https://precogs.croutons.ai/v1/run.ndjson",
  "cli_url": "https://precogs.croutons.ai/cli?precog=bkk_massage&kb=general",
  "message": "Precog job created. Job ID: job_abc123. Stream results at: https://precogs.croutons.ai/cli?precog=bkk_massage&kb=general"
}
```

### 2. Stream Results (SSE)

Fetch the stream URL to get real-time results:

**Endpoint:** `GET {stream_url}`  
**Format:** Server-Sent Events (SSE)  
**Content-Type:** `text/event-stream`

**Event Types:**
- `thinking` - Analysis in progress
- `grounding.chunk` - Data source loaded
- `answer.delta` - Partial answer text
- `answer.complete` - Final answer ready

---

## Implementation Steps

### Step 1: Update System Prompt

Add this section to your GPT system prompt:

```
**Bangkok Massage Intelligence (bkk_massage Precog):**

When users ask about massage services in Bangkok, you MUST call invoke_precog with:
- precog: "bkk_massage"
- content: User's full question about Bangkok massage
- content_source: "inline"
- task: Infer from user intent:
  - "legitimacy_scoring" - User asks if a shop is safe/legitimate
  - "district_aware_ranking" - User asks for recommendations in a district
  - "safety_pattern_recognition" - User asks about safety indicators
  - "price_sanity_checking" - User asks about pricing
- region: Extract district name from user message if mentioned (Asok, Nana, Phrom Phong, Thonglor, Ekkamai, Silom, Ari, Victory Monument, Ratchada, Old City)

**IMPORTANT Safety Rules:**
1. NEVER recommend shops from shops_risky.ndjson
2. ALWAYS prioritize shops with verified safety signals
3. For solo female travelers, ONLY recommend shops from female_safe_spaces.ndjson
4. Always mention district context and pricing norms
5. Warn users about common scam patterns if relevant
6. Emphasize safety signals (posted prices, visible reception, uniforms)

**After Calling invoke_precog:**
1. The function returns a job_id and stream_url
2. IMMEDIATELY show loading state: "Analyzing..." (with animated dots if UI supports it)
3. Fetch the SSE stream from the stream_url
4. Parse events: thinking, grounding.chunk, answer.delta, answer.complete
5. Display answer.delta events as they arrive (streaming text)
6. Wait for answer.complete before finalizing response
7. Format the response into a friendly, conversational answer
```

### Step 2: Implement Function Call Handler

```javascript
// Example: Handle invoke_precog function call
async function handleInvokePrecog(args) {
  const { precog, content, task, region } = args;
  
  // Call Precogs API - POST to /v1/run.ndjson
  const response = await fetch('https://precogs.croutons.ai/v1/run.ndjson', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`, // If required
    },
    body: JSON.stringify({
      precog,
      content,
      content_source: 'inline',
      task,
      region, // For bkk_massage, this is the district name
    }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  // Parse NDJSON stream response
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let jobId = null;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        handlePrecogEvent(event);
        
        // Capture job_id from ack event
        if (event.type === 'ack' && event.job_id) {
          jobId = event.job_id;
        }
      } catch (e) {
        console.error('Failed to parse event:', e);
      }
    }
  }
  
  return { jobId };
}

function handlePrecogEvent(event) {
  switch (event.type) {
    case 'ack':
      // Job acknowledged
      console.log('Job created:', event.job_id);
      break;
    case 'thinking':
      // Show loading state
      updateUI({ status: 'analyzing', message: event.data?.message || 'Analyzing...' });
      break;
    case 'grounding.chunk':
      // Data source loaded
      console.log('Data loaded:', event.data);
      break;
    case 'answer.delta':
      // Stream text to user
      if (event.data?.text) {
        appendToResponse(event.data.text);
      }
      break;
    case 'answer.complete':
      // Finalize response
      finalizeResponse();
      break;
    case 'complete':
      // Job complete
      if (event.status === 'error') {
        showError(event.error || 'An error occurred');
      }
      break;
    case 'heartbeat':
      // Keep-alive, ignore
      break;
    case 'error':
      // Error occurred
      showError(event.message || 'An error occurred');
      break;
  }
}
```

### Step 3: Alternative - Use Function Call Return Value

If your GPT function calling returns the job_id and stream_url directly:

```javascript
// When invoke_precog function is called, it returns:
// {
//   job_id: "job_abc123",
//   stream_url: "https://precogs.croutons.ai/v1/jobs/job_abc123/events",
//   ...
// }

async function streamFromJobId(jobId) {
  const streamUrl = `https://precogs.croutons.ai/v1/jobs/${jobId}/events`;
  
  // Use EventSource for SSE
  const eventSource = new EventSource(streamUrl);
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handlePrecogEvent(data);
    } catch (e) {
      console.error('Failed to parse SSE event:', e);
    }
  };
  
  eventSource.addEventListener('thinking', (event) => {
    const data = JSON.parse(event.data);
    updateUI({ status: 'analyzing', message: data.message });
  });
  
  eventSource.addEventListener('grounding.chunk', (event) => {
    const data = JSON.parse(event.data);
    console.log('Data loaded:', data);
  });
  
  eventSource.addEventListener('answer.delta', (event) => {
    const data = JSON.parse(event.data);
    if (data.text) {
      appendToResponse(data.text);
    }
  });
  
  eventSource.addEventListener('answer.complete', (event) => {
    finalizeResponse();
    eventSource.close();
  });
  
  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    eventSource.close();
  };
  
  return eventSource;
}
```

---

## Example Queries and Responses

### Example 1: District Recommendation

**User:** "Where can I get a safe massage in Asok?"

**GPT Function Call:**
```json
{
  "precog": "bkk_massage",
  "content": "Where can I get a safe massage in Asok?",
  "content_source": "inline",
  "task": "district_aware_ranking",
  "region": "Asok"
}
```

**Stream Events:**
```
thinking: {"message": "Analyzing Bangkok massage request..."}
grounding.chunk: {"count": 42, "source": "Corpus: bkk_massage", "shops_loaded": 20}
answer.delta: {"text": "District-aware ranking for Asok\n\n**Recommended Shops:**\n\n1. **Health Land Asok** (Asok) - 400 THB traditional / 650 THB oil ✅ Verified safe for solo female travelers\n2. **Let's Relax Asok** (Asok) - 450 THB traditional / 700 THB oil ✅ Verified safe for solo female travelers\n\n**District Info:** Asok\n- Safety at night: good\n- Risk level: low\n- Price average: 450 THB traditional / 700 THB oil\n"}
answer.complete: {"ok": true}
```

**GPT Formatted Response:**
```
Asok is a modern business district with excellent safety standards. Here are verified safe massage options:

**Health Land Asok** (Franchise Chain)
- Traditional Thai: 400 THB | Oil: 650 THB
- Hours: 10:00-24:00
- Safety: Professional uniforms, posted menu, visible reception
- ✅ Verified safe for solo female travelers

**Let's Relax Asok** (Premium Chain)
- Traditional Thai: 450 THB | Oil: 700 THB
- Hours: 10:00-22:00
- Safety: Premium facilities, excellent safety record
- ✅ Verified safe for solo female travelers

Both shops are part of well-known chains with consistent service quality and bright, street-facing entrances.
```

### Example 2: Solo Female Traveler Query

**User:** "I'm traveling alone in Bangkok. Where is safe for a massage?"

**GPT Function Call:**
```json
{
  "precog": "bkk_massage",
  "content": "I'm traveling alone in Bangkok. Where is safe for a massage?",
  "content_source": "inline",
  "task": "district_aware_ranking"
}
```

**GPT Response:**
```
For solo female travelers, I recommend these verified safe options:

**Premium Districts (Highest Safety):**
- **Phrom Phong:** Health Land Phrom Phong, Asia Herb Association
- **Thonglor:** Divana Massage & Spa, Coran Boutique Spa
- **Asok:** Health Land Asok, Let's Relax Asok

**Key Safety Indicators to Look For:**
- Posted menu with clear prices
- Visible reception desk
- Professional uniforms
- Street-facing entrance (not in alley)
- Franchise chains (Health Land, Let's Relax)

**Avoid:**
- Shops with unlisted pricing
- Dark or hidden entrances
- Aggressive street touts
- Shops without visible reception

All recommended shops above are verified safe for solo female travelers with excellent safety records.
```

### Example 3: Pricing Query

**User:** "What should I expect to pay for a massage in Nana?"

**GPT Function Call:**
```json
{
  "precog": "bkk_massage",
  "content": "What should I expect to pay for a massage in Nana?",
  "content_source": "inline",
  "task": "price_sanity_checking",
  "region": "Nana"
}
```

**GPT Response:**
```
In Nana district, typical pricing ranges:

**Traditional Thai Massage:**
- Normal range: 300-450 THB
- Typical: 350 THB

**Oil Massage:**
- Normal range: 500-700 THB
- Typical: 550 THB

**Important Notes:**
- Nana is a tourist-heavy area with wide price variation
- Always verify prices are posted before entering
- Be cautious of shops quoting much lower prices (common scam pattern)
- Legitimate shops will have prices clearly displayed

**Recommended Shops in Nana:**
- Baan Sabai Nana: 350 THB traditional, 550 THB oil (verified safe)
- Urban Retreat Nana: 400 THB traditional, 650 THB oil (verified safe)

If a shop quotes prices significantly outside these ranges or doesn't have posted prices, consider it a red flag.
```

---

## Error Handling

### Network Errors

```javascript
try {
  const response = await fetch(streamUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  // Process stream...
} catch (error) {
  // Show user-friendly error
  showError("Unable to connect to Precogs API. Please try again.");
  console.error("Precogs API error:", error);
}
```

### Timeout Handling

```javascript
const TIMEOUT = 30000; // 30 seconds

const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

try {
  const response = await fetch(streamUrl, {
    signal: controller.signal,
  });
  // Process stream...
} catch (error) {
  if (error.name === 'AbortError') {
    showError("Request timed out. Please try again.");
  }
} finally {
  clearTimeout(timeoutId);
}
```

### Stream Errors

```javascript
eventSource.onerror = (error) => {
  console.error("SSE stream error:", error);
  showError("Connection interrupted. Please try again.");
  eventSource.close();
};
```

---

## Response Formatting Guidelines

1. **Start with context** - District info, safety level, price norms
2. **List shops clearly** - Name, prices, safety signals, hours
3. **Highlight safety** - Emphasize verified safe spaces for solo travelers
4. **Include warnings** - Mention risk factors when relevant
5. **Provide etiquette** - Brief tips on tipping, clothing, communication

---

## Testing Checklist

- [ ] Function definition includes `bkk_massage` in enum
- [ ] System prompt includes Bangkok massage section
- [ ] District extraction works (10 districts)
- [ ] Task selection works (4 tasks)
- [ ] SSE stream parsing works correctly
- [ ] Loading states display properly
- [ ] Error handling works for network failures
- [ ] Solo female traveler queries return only verified safe shops
- [ ] Pricing queries return district-appropriate ranges
- [ ] Safety warnings appear for risky areas
- [ ] Response formatting is clear and safety-focused

---

## API Base URL

**Production:** `https://precogs.croutons.ai`  
**Development:** Check with Precogs team for dev environment URL

---

## Authentication

If authentication is required, include in headers:

```javascript
headers: {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
}
```

Check with Precogs team for API key requirements.

---

## Support

For questions or issues:
- Refer to: `/precogs/BANGKOK_MASSAGE_CORPUS_INTEGRATION.md`
- Contact: Precogs dev team
- Check: Precogs API documentation

---

**Ready for integration!**

