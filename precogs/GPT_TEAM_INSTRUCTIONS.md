# GPT Implementation Team - Precogs API Integration Instructions

**For:** GPT Development Team  
**Purpose:** Step-by-step instructions to integrate GPT agents with Precogs API  
**Date:** 2025-01-05

---

## Quick Start

1. Add `bkk_massage` to your function definition
2. Update system prompt with Bangkok massage section
3. Implement stream handler for NDJSON responses
4. Test with sample queries

---

## 1. Function Definition

Add this to your GPT function calling configuration:

```json
{
  "name": "invoke_precog",
  "description": "Invoke a Precogs oracle to analyze content using domain-specific knowledge. For Bangkok massage queries, use precog='bkk_massage' to get shop recommendations, district information, pricing, and ratings from Google Maps data.",
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
        "description": "User's question or request. For bkk_massage, this should be the user's massage-related query (e.g., 'Where can I get a massage in Asok?', 'What are the prices?', 'Show me shops with prettiest women')"
      },
      "content_source": {
        "type": "string",
        "enum": ["inline", "url"],
        "default": "inline",
        "description": "Always use 'inline' for chat-based queries"
      },
      "task": {
        "type": "string",
        "description": "Task type. For bkk_massage, use: 'district_aware_ranking' (default), 'legitimacy_scoring', 'safety_pattern_recognition', 'price_sanity_checking'"
      },
      "region": {
        "type": "string",
        "description": "For bkk_massage, extract district from user query (e.g., 'Asok', 'Nana', 'Phrom Phong', 'Thonglor', 'Ekkamai', 'Silom', 'Ari', 'Victory Monument', 'Ratchada', 'Old City'). Use immediately if mentioned."
      }
    },
    "required": ["precog", "content"]
  }
}
```

---

## 2. System Prompt Addition

Add this section to your GPT system prompt:

```
**Bangkok Massage Intelligence (bkk_massage Precog):**

When users ask about massage services in Bangkok, you MUST call invoke_precog with:
- precog: "bkk_massage"
- content: User's full question about Bangkok massage
- content_source: "inline"
- task: Infer from user intent:
  - "district_aware_ranking" - User asks for recommendations (default)
  - "legitimacy_scoring" - User asks if a shop is legitimate
  - "safety_pattern_recognition" - User asks about safety
  - "price_sanity_checking" - User asks about pricing
- region: Extract district name from user message if mentioned (Asok, Nana, Phrom Phong, Thonglor, Ekkamai, Silom, Ari, Victory Monument, Ratchada, Old City)

**After Calling invoke_precog:**
1. The function returns a job_id and stream_url
2. IMMEDIATELY show loading state: "Analyzing..." (with animated dots if UI supports it)
3. Fetch the NDJSON stream from the stream_url (or use POST /v1/run.ndjson directly)
4. Parse events: ack, thinking, grounding.chunk, answer.delta, answer.complete
5. Display answer.delta events as they arrive (streaming text)
6. Wait for answer.complete before finalizing response
7. Format the response into a friendly, conversational answer

**Response Format:**
- List shops with name, address, rating, review count
- Include prettiest women mentions if available
- Show pricing information if available
- Display Line usernames if available
- Include websites if available
- Highlight overall ratings
```

---

## 3. API Integration

### Option A: Direct POST to /v1/run.ndjson (Recommended)

```javascript
async function callPrecogsAPI(precog, content, task, region) {
  const response = await fetch('https://precogs.croutons.ai/v1/run.ndjson', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add Authorization header if required
      // 'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      precog,
      content,
      content_source: 'inline',
      task,
      region,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response; // Returns NDJSON stream
}
```

### Option B: Use Function Return Value

If your GPT function calling returns `job_id` and `stream_url`:

```javascript
// Function returns: { job_id: "...", stream_url: "..." }
async function streamFromJobId(jobId) {
  const streamUrl = `https://precogs.croutons.ai/v1/jobs/${jobId}/events`;
  // Use EventSource for SSE or fetch for NDJSON
}
```

---

## 4. NDJSON Stream Parsing

```javascript
async function parseNDJSONStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let jobId = null;
  let fullAnswer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line

    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const event = JSON.parse(line);
        
        switch (event.type) {
          case 'ack':
            jobId = event.job_id;
            console.log('Job created:', jobId);
            break;
            
          case 'thinking':
            // Show loading state
            updateUI({ status: 'analyzing', message: event.data?.message });
            break;
            
          case 'grounding.chunk':
            // Data source loaded
            console.log('Data loaded:', event.data);
            break;
            
          case 'answer.delta':
            // Stream text to user
            if (event.data?.text) {
              fullAnswer += event.data.text;
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
            showError(event.message || 'An error occurred');
            break;
        }
      } catch (e) {
        console.error('Failed to parse event:', e);
      }
    }
  }

  return { jobId, fullAnswer };
}
```

---

## 5. Example Implementation

```javascript
// Complete example
async function handleBangkokMassageQuery(userMessage) {
  // Extract district if mentioned
  const districts = ['Asok', 'Nana', 'Phrom Phong', 'Thonglor', 'Ekkamai', 
                     'Silom', 'Ari', 'Victory Monument', 'Ratchada', 'Old City'];
  const region = districts.find(d => userMessage.toLowerCase().includes(d.toLowerCase()));
  
  // Determine task
  let task = 'district_aware_ranking'; // default
  if (userMessage.toLowerCase().includes('price') || userMessage.toLowerCase().includes('cost')) {
    task = 'price_sanity_checking';
  } else if (userMessage.toLowerCase().includes('safe') || userMessage.toLowerCase().includes('legitimate')) {
    task = 'legitimacy_scoring';
  }

  // Show loading
  showLoading('Analyzing Bangkok massage options...');

  try {
    // Call Precogs API
    const response = await callPrecogsAPI('bkk_massage', userMessage, task, region);
    
    // Parse stream
    const { fullAnswer } = await parseNDJSONStream(response);
    
    // Format and display
    displayFormattedAnswer(fullAnswer);
    
  } catch (error) {
    showError(`Error: ${error.message}`);
  } finally {
    hideLoading();
  }
}
```

---

## 6. Response Formatting

Format the Precogs response for users:

```javascript
function formatShopResponse(shops) {
  let text = '**Bangkok Massage Recommendations:**\n\n';
  
  shops.forEach((shop, idx) => {
    text += `${idx + 1}. **${shop.name}**`;
    if (shop.address) text += `\n   📍 ${shop.address}`;
    if (shop.rating) text += `\n   ⭐ ${shop.rating}/5`;
    if (shop.review_count) text += ` (${shop.review_count} reviews)`;
    
    if (shop.prettiest_women_mentions?.length > 0) {
      text += `\n   💃 Prettiest women mentions: ${shop.prettiest_women_mentions.join(', ')}`;
    }
    
    if (shop.pricing?.length > 0) {
      text += `\n   💰 Pricing: ${shop.pricing.join(', ')}`;
    }
    
    if (shop.line_usernames?.length > 0) {
      text += `\n   📱 Line: ${shop.line_usernames.join(', ')}`;
    }
    
    if (shop.websites?.length > 0) {
      text += `\n   🌐 Website: ${shop.websites.join(', ')}`;
    }
    
    text += '\n\n';
  });
  
  return text;
}
```

---

## 7. Error Handling

```javascript
async function callPrecogsWithRetry(precog, content, task, region, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await callPrecogsAPI(precog, content, task, region);
      return await parseNDJSONStream(response);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

---

## 8. Testing Checklist

- [ ] Function definition includes `bkk_massage` in enum
- [ ] System prompt includes Bangkok massage section
- [ ] API endpoint correctly configured
- [ ] NDJSON stream parsing works correctly
- [ ] Loading states display properly
- [ ] Error handling works for network failures
- [ ] District extraction works (10 districts)
- [ ] Task selection works (4 tasks)
- [ ] Response formatting is clear
- [ ] Shop data displays correctly (name, rating, reviews, etc.)

---

## 9. Example Queries

### Query 1: District Recommendation
**User:** "Where can I get a massage in Asok?"

**Function Call:**
```json
{
  "precog": "bkk_massage",
  "content": "Where can I get a massage in Asok?",
  "task": "district_aware_ranking",
  "region": "Asok"
}
```

### Query 2: Pricing
**User:** "What are the prices in Nana?"

**Function Call:**
```json
{
  "precog": "bkk_massage",
  "content": "What are the prices in Nana?",
  "task": "price_sanity_checking",
  "region": "Nana"
}
```

### Query 3: Prettiest Women
**User:** "Show me shops with prettiest women"

**Function Call:**
```json
{
  "precog": "bkk_massage",
  "content": "Show me shops with prettiest women",
  "task": "district_aware_ranking"
}
```

---

## 10. API Base URL

**Production:** `https://precogs.croutons.ai`  
**Development:** Check with Precogs team for dev environment

---

## 11. Authentication

If authentication is required:

```javascript
headers: {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
}
```

Check with Precogs team for API key requirements.

---

## 12. Support & Documentation

- **Full Integration Guide:** `/corpora/thailand/bangkok/massage/GPT_PRECOGS_API_INTEGRATION.md`
- **Function Definition:** See section 1 above
- **System Prompt:** See section 2 above
- **Questions:** Contact Precogs dev team

---

## Quick Reference

**Endpoint:** `POST https://precogs.croutons.ai/v1/run.ndjson`  
**Request Format:** JSON body with `precog`, `content`, `task`, `region`  
**Response Format:** NDJSON stream  
**Event Types:** `ack`, `thinking`, `grounding.chunk`, `answer.delta`, `answer.complete`, `complete`

---

**Ready to integrate!** Follow steps 1-4 to get started.

