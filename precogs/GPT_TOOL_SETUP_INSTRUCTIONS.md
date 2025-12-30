# GPT Tool Manifest - Ready to Paste

**For:** GPT Implementation Team  
**Status:** ✅ Ready to Deploy

---

## Quick Setup

### Option 1: JSON Format (Function Definition)

**Paste this into your GPT function/tool configuration:**

```json
{
  "name": "invoke_precog",
  "description": "Calls the Precogs API to retrieve verified massage safety, pricing, and legitimacy data for Bangkok districts. Use precog='bkk_massage' for Bangkok massage queries.",
  "parameters": {
    "type": "object",
    "properties": {
      "precog": {
        "type": "string",
        "description": "Precog type to invoke. Use 'bkk_massage' for Bangkok massage queries.",
        "enum": ["schema", "faq", "pricing", "home", "home.hvac", "home.plumbing", "home.electrical", "home.safety", "home.safety.mold", "home.flood", "bkk_massage"]
      },
      "content_source": {
        "type": "string",
        "enum": ["inline", "url"],
        "default": "inline",
        "description": "Always use 'inline' for chat queries"
      },
      "content": {
        "type": "string",
        "description": "The user's original natural-language request about Bangkok massage (e.g., 'Find a safe massage in Asok', 'What are the prices in Nana?')"
      },
      "task": {
        "type": "string",
        "description": "The analysis type to perform. Valid options: district_aware_ranking (default), legitimacy_scoring, safety_pattern_recognition, price_sanity_checking.",
        "enum": ["district_aware_ranking", "legitimacy_scoring", "safety_pattern_recognition", "price_sanity_checking"]
      },
      "region": {
        "type": "string",
        "description": "Bangkok district (e.g., Asok, Nana, Phrom Phong, Thonglor, Ekkamai, Silom, Ari, Victory Monument, Ratchada, Old City). Extract from user query if mentioned.",
        "enum": ["Asok", "Nana", "Phrom Phong", "Thonglor", "Ekkamai", "Silom", "Ari", "Victory Monument", "Ratchada", "Old City"]
      }
    },
    "required": ["precog", "content"]
  }
}
```

---

### Option 2: OpenAI Actions Format (YAML)

**For OpenAI GPT Actions/Plugins:**

See file: `GPT_TOOL_MANIFEST_OPENAI_ACTIONS.yaml`

---

## API Endpoint Configuration

### Endpoint URL
```
https://precogs.croutons.ai/v1/run.ndjson
```

### HTTP Method
```
POST
```

### Headers
```
Content-Type: application/json
```

### Request Body Example
```json
{
  "precog": "bkk_massage",
  "content_source": "inline",
  "content": "Find a safe massage in Asok",
  "task": "district_aware_ranking",
  "region": "Asok"
}
```

### Response Format
```json
{
  "job_id": "job_abc123",
  "status": "pending",
  "stream_url": "https://precogs.croutons.ai/v1/jobs/job_abc123/events",
  "ndjson_url": "https://precogs.croutons.ai/v1/run.ndjson",
  "cli_url": "https://precogs.croutons.ai/cli?precog=bkk_massage"
}
```

---

## Integration Steps

1. **Open GPT Configuration**
   - Go to your GPT editor
   - Click "Configure" tab
   - Scroll to "Actions" or "Functions"

2. **Add Action/Function**
   - Click "Add Action" or "Add Function"
   - Paste the JSON from above (Option 1)

3. **Set Endpoint**
   - **URL:** `https://precogs.croutons.ai/v1/run.ndjson`
   - **Method:** `POST`
   - **Headers:** `Content-Type: application/json`

4. **Save and Deploy**

5. **Test**
   - Ask: "Find a safe massage in Asok"
   - GPT should call the function and return results

---

## Test Query

**User:** "Check average massage prices in Silom"

**Expected Function Call:**
```json
{
  "precog": "bkk_massage",
  "content_source": "inline",
  "content": "Check average massage prices in Silom",
  "task": "price_sanity_checking",
  "region": "Silom"
}
```

**Expected Response:**
- Returns `job_id` and `stream_url`
- Stream results contain verified pricing data

---

## Files

- `GPT_TOOL_MANIFEST.json` - JSON format (ready to paste)
- `GPT_TOOL_MANIFEST_OPENAI_ACTIONS.yaml` - YAML format for OpenAI Actions
- `GPT_TOOL_SETUP_INSTRUCTIONS.md` - This file

---

**Ready to deploy!** ✅

