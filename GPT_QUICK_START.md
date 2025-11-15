# Precogs Schema API - GPT Quick Start

**For:** GPT Development Team  
**Quick Reference:** How GPT calls Precogs for schema validation

---

## TL;DR

GPT calls `invoke_precog` function → Precogs validates schema → Returns job_id + stream URL → GPT presents results to user.

---

## Function Definition

```json
{
  "name": "invoke_precog",
  "parameters": {
    "precog": "schema",                    // Required
    "kb": "schema-foundation",            // Default for schema
    "content_source": "inline",           // Default (use "url" only if user provides URL)
    "content": "{...JSON-LD string...}",  // Required when inline
    "type": "Service",                    // Optional but helpful
    "task": "validate"                    // Default for schema
  }
}
```

---

## System Prompt (Copy-Paste)

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

## Example Flow

### User Input
```
Validate this schema:
{"@context":"https://schema.org","@type":"Service","name":"Gutter Repair"}
```

### GPT Function Call
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

### Precogs Response
```json
{
  "job_id": "abc123",
  "stream_url": "https://precogs.croutons.ai/v1/jobs/abc123/events",
  "cli_url": "https://precogs.croutons.ai/cli?precog=schema&kb=schema-foundation&type=Service"
}
```

### GPT User Response
```
I've submitted your schema for validation. The Precogs oracle is checking it against schema-foundation knowledge base rules.

**Watch results:** https://precogs.croutons.ai/cli?precog=schema&kb=schema-foundation&type=Service

The validation will show any issues and provide recommendations for improvement.
```

---

## Rules

1. **Always use `content_source="inline"`** when user provides schema snippet
2. **Always use `kb="schema-foundation"`** for schema validation
3. **Include `type`** when schema type is known (Service, Product, etc.)
4. **Provide `cli_url`** to user after function call
5. **Only use `url` mode** when user explicitly provides a URL

---

## What Precogs Validates

- ✅ Required fields (@context, @type, name)
- ✅ Recommended fields (description, provider, areaServed, serviceType)
- ✅ Disallowed fields (aggregateRating, etc.)
- ✅ Constraints (field types, formats, limits)

---

## API Endpoint

```
POST https://precogs.croutons.ai/v1/chat
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "message": "Validate this schema: {...}",
  "history": []
}
```

---

## Full Documentation

See `GPT_INTEGRATION_GUIDE.md` for complete details.

---

**Status:** Production Ready ✅  
**Last Updated:** December 2024



