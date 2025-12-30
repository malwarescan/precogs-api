# LLM Access to Croutons Graph

## Overview

The Croutons graph is now accessible to LLMs via a dedicated query endpoint and GPT function definition. This allows AI agents to directly query the knowledge graph for verified factlets and relationships.

## Quick Start

### 1. API Endpoint

**Endpoint:** `GET https://graph.croutons.ai/api/query`

**Parameters:**
- `q` or `query` (required): Text search query
- `domain` (optional): Filter by domain (e.g., "ourcasa.ai", "floodbarrierpros.com", "bkk_massage")
- `corpus` (optional): Filter by corpus ID (e.g., "bkk_massage", "home_services")
- `limit` (optional): Number of results (1-100, default: 20)
- `format` (optional): Response format - "json" (default) or "ndjson"

**Example:**
```bash
curl "https://graph.croutons.ai/api/query?q=Bangkok%20massage%20Asok&limit=10"
```

**Response:**
```json
{
  "ok": true,
  "query": "Bangkok massage Asok",
  "results": [
    {
      "fact_id": "https://croutons.ai/factlet/bkk_massage/...",
      "claim": "Health Land Asok (Asok) - 55/5 Sukhumvit 21 Road, Asok...",
      "source_url": "https://croutons.ai/corpus/bkk_massage/shops_legit.ndjson",
      "corpus_id": "bkk_massage",
      "confidence": null,
      "created_at": "2025-11-17T12:32:59.745Z",
      "triple": null
    }
  ],
  "triples": [
    {
      "subject": "Health Land Asok",
      "predicate": "located_in",
      "object": "Asok",
      "evidence_crouton_id": "..."
    }
  ],
  "count": 10,
  "timestamp": "2025-11-17T12:45:00.000Z"
}
```

### 2. GPT Function Definition

**Function Name:** `query_croutons_graph`

**Description:** Query the Croutons knowledge graph for factlets, claims, and relationships.

**Parameters:**
```json
{
  "query": "string (required) - Text search query",
  "domain": "string (optional) - Filter by domain",
  "corpus": "string (optional) - Filter by corpus ID",
  "limit": "number (optional, 1-100, default: 20)"
}
```

**Example Usage in GPT:**
```javascript
{
  "name": "query_croutons_graph",
  "arguments": {
    "query": "safe massage shops in Bangkok Asok district",
    "corpus": "bkk_massage",
    "limit": 10
  }
}
```

## Integration Guide

### For OpenAI GPTs

1. **Add Function to GPT Configuration:**
   - Go to your GPT configuration
   - Add the function definition from `precogs-api/src/functions/query_croutons_graph.js`
   - Set the API endpoint to: `https://graph.croutons.ai/api/query`

2. **Update System Prompt:**
   ```
   You can query the Croutons knowledge graph using query_croutons_graph when users ask about:
   - Verified facts or claims
   - Relationships between entities
   - Domain-specific information (home services, Bangkok massage, etc.)
   
   Use natural language queries like:
   - "Bangkok massage shops in Asok"
   - "flood protection services in Naples FL"
   - "safe massage recommendations"
   ```

3. **Function Execution:**
   The function automatically calls `https://graph.croutons.ai/api/query` with the provided parameters.

### For Custom LLM Integrations

**JavaScript/Node.js:**
```javascript
import { queryCroutonsGraphFunction, executeQueryCroutonsGraph } from './functions/query_croutons_graph.js';

// Add to your function definitions
const functions = [queryCroutonsGraphFunction];

// Execute when called
const result = await executeQueryCroutonsGraph({
  query: "Bangkok massage Asok",
  corpus: "bkk_massage",
  limit: 10
});
```

**Python:**
```python
import requests

def query_croutons_graph(query, domain=None, corpus=None, limit=20):
    url = "https://graph.croutons.ai/api/query"
    params = {"q": query, "limit": limit}
    if domain:
        params["domain"] = domain
    if corpus:
        params["corpus"] = corpus
    
    response = requests.get(url, params=params)
    return response.json()
```

## Use Cases

### 1. Fact Verification
**Query:** "What are verified safe massage shops in Bangkok?"
```json
{
  "query": "safe massage shops Bangkok",
  "corpus": "bkk_massage"
}
```

### 2. Domain-Specific Search
**Query:** "Find flood protection services in Naples"
```json
{
  "query": "flood protection Naples",
  "domain": "floodbarrierpros.com"
}
```

### 3. Relationship Discovery
**Query:** "What districts have massage shops?"
```json
{
  "query": "massage shop district",
  "corpus": "bkk_massage"
}
```
Returns both factlets and triples showing relationships.

### 4. Multi-Domain Search
**Query:** "Find all home service providers"
```json
{
  "query": "home services",
  "corpus": "home_services"
}
```

## Response Format

The API returns:
- **results**: Array of factlets matching the query
  - `fact_id`: Unique identifier
  - `claim`: The actual fact/claim text
  - `source_url`: Where the fact came from
  - `corpus_id`: Corpus identifier
  - `confidence`: Confidence score (if available)
  - `created_at`: When it was added
  - `triple`: Associated triple (if any)
- **triples**: Related relationships (subject-predicate-object)
- **count**: Number of results
- **timestamp**: Query timestamp

## Best Practices

1. **Use Specific Queries:** More specific queries return better results
   - Good: "Bangkok massage shops in Asok district with safety signals"
   - Less effective: "massage"

2. **Filter by Domain/Corpus:** When you know the domain, filter for faster, more relevant results

3. **Limit Results:** Use `limit` to control response size (default: 20, max: 100)

4. **Combine with Precogs:** Use `query_croutons_graph` for fact lookup, `invoke_precog` for analysis/recommendations

5. **Handle Errors:** The function returns `success: false` on errors, always check this

## Available Domains/Corpora

- **bkk_massage**: Bangkok Massage Intelligence (shops, districts, safety, pricing)
- **ourcasa.ai**: Home services from OurCasa
- **floodbarrierpros.com**: Flood protection services
- **home_services**: General home services corpus

## Rate Limits

Currently no rate limits, but be respectful:
- Use appropriate `limit` values
- Cache results when possible
- Don't spam queries

## Support

For issues or questions:
- Check the dashboard: `https://graph.croutons.ai/dashboard.html`
- View stats: `https://graph.croutons.ai/diag/stats`
- Graph service logs: Railway dashboard

