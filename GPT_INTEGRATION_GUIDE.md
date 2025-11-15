# Precogs Schema API - GPT Integration Guide

**For:** GPT/ChatGPT Development Team  
**Purpose:** How to integrate GPT with Precogs Schema Validation API  
**Status:** Production Ready

---

## Overview

The Precogs Schema API provides real-time schema validation powered by a Knowledge Base (KB) system. When GPT/ChatGPT needs to validate or improve JSON-LD schema markup, it calls the Precogs API via function calling, which streams back validation results, issues, and recommendations.

**Key Concept:** GPT acts as the interface; Precogs provides the validation intelligence.

---

## How It Works

### 1. Function Calling Flow

```
User Message → GPT → Function Call (invoke_precog) → Precogs API → 
Job Created → Worker Validates → Stream Results → GPT → User Response
```

### 2. Function Definition

GPT uses the `invoke_precog` function with these parameters:

```json
{
  "name": "invoke_precog",
  "description": "Invoke a Precogs oracle to analyze schema or HTML content using domain-specific knowledge. Returns a job_id and stream URL for real-time results. Prefer inline content when user provides schema or HTML snippets.",
  "parameters": {
    "type": "object",
    "properties": {
      "kb": {
        "type": "string",
        "description": "Knowledge base identifier. Defaults to 'schema-foundation' for schema precog, 'general' otherwise.",
        "enum": ["general", "schema-foundation", "siding-services", "cladding"],
        "default": "schema-foundation"
      },
      "precog": {
        "type": "string",
        "description": "Precog type to invoke",
        "enum": ["schema", "faq", "pricing"]
      },
      "content_source": {
        "type": "string",
        "description": "Source of content: 'inline' for pasted HTML/JSON-LD snippets, 'url' for web page URLs. Defaults to 'inline'.",
        "enum": ["inline", "url"],
        "default": "inline"
      },
      "content": {
        "type": "string",
        "description": "Inline content (HTML or JSON-LD snippet) when content_source is 'inline'. Preferred when user provides schema or HTML in chat."
      },
      "url": {
        "type": "string",
        "description": "Target URL to analyze. Only use when content_source is 'url' or user explicitly provides a URL."
      },
      "type": {
        "type": "string",
        "description": "Context type (e.g., 'Service', 'Product', 'Article')"
      },
      "task": {
        "type": "string",
        "description": "Task description or prompt. Defaults to 'validate' for schema precog, 'Run {precog}' otherwise."
      }
    },
    "required": ["precog"]
  }
}
```

---

## System Prompt for GPT

**Use this system prompt to guide GPT behavior:**

```
You are a helpful assistant that can invoke Precogs oracles to analyze schema, HTML, or web pages using domain-specific knowledge.

When a user provides schema or HTML content in chat, call invoke_precog with:
- kb="schema-foundation" (for schema precog)
- precog="schema"
- content_source="inline"
- content=<the snippet they provided>
- type=<if given>
- task="validate"

Only use content_source="url" if the user explicitly provides a URL to analyze.

After calling the function, always provide the stream_url or cli_url so the user can watch results in real-time.

Be concise and helpful.
```

---

## Integration Examples

### Example 1: User Pastes JSON-LD Schema

**User Message:**
```
Validate this schema:
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Siding Installation"
}
```

**GPT Function Call:**
```json
{
  "name": "invoke_precog",
  "arguments": {
    "precog": "schema",
    "kb": "schema-foundation",
    "content_source": "inline",
    "content": "{\"@context\":\"https://schema.org\",\"@type\":\"Service\",\"name\":\"Siding Installation\"}",
    "type": "Service",
    "task": "validate"
  }
}
```

**Precogs API Response:**
```json
{
  "job_id": "abc123...",
  "status": "pending",
  "stream_url": "https://precogs.croutons.ai/v1/jobs/abc123.../events",
  "cli_url": "https://precogs.croutons.ai/cli?precog=schema&kb=schema-foundation&type=Service",
  "message": "Precog job created. Job ID: abc123..."
}
```

**GPT Follow-up:**
```
I've created a validation job for your schema. The Precogs oracle is analyzing it against schema-foundation knowledge base rules.

You can watch the results in real-time here:
https://precogs.croutons.ai/cli?precog=schema&kb=schema-foundation&type=Service

The validation will check for:
- Required fields (@context, @type, name)
- Recommended fields (description, provider, areaServed, serviceType)
- Schema.org best practices
```

---

### Example 2: User Provides URL

**User Message:**
```
Analyze the schema on https://example.com/services
```

**GPT Function Call:**
```json
{
  "name": "invoke_precog",
  "arguments": {
    "precog": "schema",
    "kb": "schema-foundation",
    "content_source": "url",
    "url": "https://example.com/services",
    "task": "generate_and_validate"
  }
}
```

**Note:** URL mode is for fetching and analyzing web pages. Inline mode (default) is preferred for schema validation.

---

### Example 3: User Asks for Schema Generation

**User Message:**
```
Generate a Service schema for "Gutter Repair" in "South Bend, IN"
```

**GPT Function Call:**
```json
{
  "name": "invoke_precog",
  "arguments": {
    "precog": "schema",
    "kb": "schema-foundation",
    "content_source": "inline",
    "content": "{\"@context\":\"https://schema.org\",\"@type\":\"Service\",\"name\":\"Gutter Repair\",\"areaServed\":\"South Bend, IN\"}",
    "type": "Service",
    "task": "validate"
  }
}
```

**Then GPT can:**
1. Call the function to validate
2. Get recommendations from Precogs
3. Use those recommendations to improve the schema
4. Present the final validated schema to the user

---

## What Precogs Returns

### Function Result (Immediate)

```json
{
  "job_id": "abc123...",
  "status": "pending",
  "stream_url": "https://precogs.croutons.ai/v1/jobs/abc123.../events",
  "ndjson_url": "https://precogs.croutons.ai/v1/run.ndjson",
  "cli_url": "https://precogs.croutons.ai/cli?precog=schema&kb=schema-foundation",
  "message": "Precog job created..."
}
```

### Stream Events (Real-time)

**Event Types:**
- `ack` - Job acknowledged
- `grounding.chunk` - KB rules loaded
- `answer.delta` - Validation results (streaming)
- `answer.complete` - Validation finished
- `complete` - Job complete

**Example Stream:**
```
{"type":"ack","job_id":"abc123..."}
{"type":"grounding.chunk","data":{"source":"KB: schema-foundation","rules_loaded":true}}
{"type":"answer.delta","data":{"text":"📋 Schema Validation Results for @type: Service"}}
{"type":"answer.delta","data":{"text":"✅ Schema is valid!"}}
{"type":"answer.delta","data":{"text":"💡 Recommendations:"}}
{"type":"answer.delta","data":{"text":"  • Consider adding: description"}}
{"type":"answer.delta","data":{"text":"  • Consider adding: provider"}}
{"type":"complete","status":"done"}
```

---

## Best Practices for GPT Integration

### 1. Always Use Inline Mode for Schema Snippets

**✅ Good:**
```json
{
  "content_source": "inline",
  "content": "{...schema snippet...}"
}
```

**❌ Avoid:**
```json
{
  "content_source": "url",
  "url": "https://example.com"
}
```
(Unless user explicitly provides a URL)

---

### 2. Default to schema-foundation KB

**✅ Good:**
```json
{
  "kb": "schema-foundation"
}
```

**❌ Avoid:**
```json
{
  "kb": "general"
}
```
(For schema validation, always use schema-foundation)

---

### 3. Include Type When Known

**✅ Good:**
```json
{
  "type": "Service"
}
```

**Helpful:** Helps Precogs select the right validation rules

---

### 4. Provide User-Friendly Links

After function call, always include:
- `cli_url` - For real-time viewing
- `stream_url` - For programmatic access
- Brief explanation of what's being validated

---

## GPT Response Template

**After calling `invoke_precog`, GPT should respond:**

```
I've submitted your schema for validation to the Precogs oracle.

**Job ID:** {job_id}

**What's being checked:**
- Required fields (@context, @type, name)
- Recommended fields (description, provider, areaServed, serviceType)
- Schema.org best practices
- Field constraints and formats

**Watch results in real-time:**
{cli_url}

The validation will stream results showing any issues found and recommendations for improvement.
```

---

## Error Handling

### Function Execution Errors

If `invoke_precog` fails, GPT should:
1. Inform the user of the error
2. Suggest checking the schema format
3. Offer to help fix the input

**Example:**
```
I encountered an error validating your schema: {error message}

This usually means:
- The schema JSON is malformed
- Required parameters are missing
- The content couldn't be parsed

Would you like me to help fix the schema format?
```

---

## API Endpoints

### Function Calling Endpoint
```
POST https://precogs.croutons.ai/v1/chat
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "message": "Validate this schema: {...}",
  "history": []
}
```

### Direct Validation Endpoint (Alternative)
```
POST https://precogs.croutons.ai/v1/run.ndjson
Content-Type: application/json

{
  "precog": "schema",
  "kb": "schema-foundation",
  "content_source": "inline",
  "content": "{...schema...}",
  "type": "Service",
  "task": "validate"
}
```

**Note:** Function calling (`/v1/chat`) is preferred for GPT integration as it handles the full flow automatically.

---

## Validation Output Interpretation

### What GPT Should Extract from Stream

1. **Validation Status**
   - `✅ Schema is valid!` - No errors found
   - `❌ Validation Issues Found` - Errors detected

2. **Issues**
   - Missing required fields
   - Disallowed fields
   - Constraint violations

3. **Recommendations**
   - Fields to add
   - Best practices
   - Format suggestions

4. **Validated JSON-LD**
   - Clean, validated schema output
   - Ready to use

### GPT Should Present Results As:

```
**Validation Results:**

✅ Schema is valid!

**Recommendations:**
- Consider adding: description (1–2 sentences, unique per page; plain text.)
- Consider adding: provider (Organization or LocalBusiness with legalName or name.)
- Consider adding: areaServed (City/region names or Place objects.)
- Consider adding: serviceType (Service type description, min 3 characters.)

**Validated Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Siding Installation"
}
```
```

---

## Knowledge Base Rules (What Precogs Validates)

### Service Type Rules

**Required Fields:**
- `@context` - Must be "https://schema.org"
- `@type` - Must be "Service"
- `name` - Human-readable service name

**Recommended Fields:**
- `description` - 1–2 sentences, unique per page
- `provider` - Organization or LocalBusiness
- `areaServed` - City/region names (max 3)
- `serviceType` - Service type description (min 3 chars)

**Disallowed Fields:**
- `aggregateRating` - Not recommended for Service
- `offers.priceCurrency` - Use Product type instead
- `brand` - Use Product type instead

**Constraints:**
- `provider.@type` must be "Organization" or "LocalBusiness"
- `areaServed` must be string or Place object, max 3 items
- `serviceType` must be string, minimum 3 characters

---

## Testing Your Integration

### Test Case 1: Valid Schema

**Input:**
```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Siding Installation"
}
```

**Expected:** Validation passes, recommendations provided

---

### Test Case 2: Invalid Schema (Missing @context)

**Input:**
```json
{
  "@type": "Service",
  "name": "Test"
}
```

**Expected:** Error: Missing required field `@context`

---

### Test Case 3: Schema with Issues

**Input:**
```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "A",
  "aggregateRating": {"ratingValue": 4.9}
}
```

**Expected:** 
- Warning: Disallowed field `aggregateRating`
- Recommendation: Add description, provider, etc.

---

## API Configuration

### Base URL
```
https://precogs.croutons.ai
```

### Authentication
- Function calling endpoint (`/v1/chat`) requires Bearer token
- Set via `Authorization: Bearer {API_KEY}` header
- API key configured via `API_KEY` environment variable

### Rate Limits
- 60 requests per minute per IP
- Applies to `/v1/chat` endpoint

---

## Common Integration Patterns

### Pattern 1: Validate User's Schema

```
User: "Check this schema: {...}"
GPT: Calls invoke_precog with inline content
Precogs: Validates and returns recommendations
GPT: Presents results to user
```

---

### Pattern 2: Generate Then Validate

```
User: "Create a Service schema for X"
GPT: Generates initial schema
GPT: Calls invoke_precog to validate
Precogs: Returns recommendations
GPT: Improves schema based on recommendations
GPT: Presents final validated schema
```

---

### Pattern 3: Fix Existing Schema

```
User: "Fix this schema: {...}"
GPT: Calls invoke_precog to identify issues
Precogs: Returns issues and recommendations
GPT: Applies fixes
GPT: Calls invoke_precog again to verify
GPT: Presents fixed schema
```

---

## Troubleshooting

### Issue: Function Not Being Called

**Check:**
- System prompt includes function calling instructions
- Function definition is registered with GPT
- User message triggers schema validation need

**Fix:** Ensure system prompt clearly instructs GPT to use `invoke_precog` for schema validation.

---

### Issue: Wrong Parameters Sent

**Check:**
- `content_source` is "inline" (not "url") when user provides snippet
- `kb` is "schema-foundation" for schema precog
- `content` is a JSON string (properly escaped)

**Fix:** Review function schema defaults and system prompt.

---

### Issue: No Validation Results

**Check:**
- Job was created (`job_id` returned)
- Worker is processing jobs
- Stream URL is accessible

**Fix:** Check worker logs: `npx railway logs -s precogs-worker`

---

## Example GPT Conversation Flow

**User:**
```
I need to validate this Service schema:
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Gutter Repair"
}
```

**GPT (calls function):**
```json
{
  "name": "invoke_precog",
  "arguments": {
    "precog": "schema",
    "kb": "schema-foundation",
    "content_source": "inline",
    "content": "{\"@context\":\"https://schema.org\",\"@type\":\"Service\",\"name\":\"Gutter Repair\"}",
    "type": "Service",
    "task": "validate"
  }
}
```

**Precogs Response:**
```json
{
  "job_id": "xyz789",
  "stream_url": "https://precogs.croutons.ai/v1/jobs/xyz789/events",
  "cli_url": "https://precogs.croutons.ai/cli?precog=schema&kb=schema-foundation&type=Service"
}
```

**GPT (to user):**
```
I've submitted your schema for validation. The Precogs oracle is checking it against schema-foundation knowledge base rules.

**Job ID:** xyz789

**Watch results:** https://precogs.croutons.ai/cli?precog=schema&kb=schema-foundation&type=Service

**What's being validated:**
- Required fields (@context, @type, name) ✅
- Recommended fields (description, provider, areaServed, serviceType)
- Schema.org best practices
- Field constraints

The validation will show any issues and provide recommendations for improvement.
```

*(GPT can optionally fetch stream results and present them directly to user)*

---

## Key Takeaways

1. **Always use `content_source="inline"`** when user provides schema snippets
2. **Default to `kb="schema-foundation"`** for schema validation
3. **Include `type` parameter** when schema type is known
4. **Provide user-friendly links** (`cli_url`) after function call
5. **Interpret validation results** and present them clearly to users
6. **Handle errors gracefully** with helpful suggestions

---

## Support & Resources

- **API Docs:** See `CHAT_ENDPOINT_USAGE.md`
- **Operations:** See `OPS_CARD.md`
- **KB System:** See `KB_TRAINING_IMPLEMENTATION.md`
- **Status:** See `OPERATIONAL_SNAPSHOT.md`

---

**Ready for Integration:** ✅  
**API Status:** Production Ready  
**Last Updated:** December 2024



