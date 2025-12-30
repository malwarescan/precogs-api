# LLM Access to Croutons Graph - Implementation Summary

## What Was Built

### 1. Graph Query API Endpoint
**Location:** `graph-service/server.js`
**Endpoint:** `GET /api/query`

A new LLM-friendly query endpoint that:
- Accepts natural language text queries
- Filters by domain or corpus
- Returns factlets + related triples
- Supports JSON and NDJSON formats

**Example:**
```
GET https://graph.croutons.ai/api/query?q=Bangkok%20massage%20Asok&corpus=bkk_massage&limit=10
```

### 2. GPT Function Definition
**Location:** `precogs-api/src/functions/query_croutons_graph.js`

A complete GPT function definition that:
- Defines the function schema for OpenAI
- Executes queries against the graph API
- Returns structured results with factlets and triples

**Function Name:** `query_croutons_graph`

### 3. OpenAI Integration
**Location:** `precogs-api/src/integrations/openai-chat.js`

Updated to:
- Include `query_croutons_graph` in available functions
- Handle function execution for both `invoke_precog` and `query_croutons_graph`
- Updated system prompt to guide LLM on when to use the graph query

### 4. Documentation
**Location:** `precogs/LLM_GRAPH_ACCESS.md`

Complete guide for:
- API usage
- GPT function integration
- Use cases and examples
- Best practices

## How LLMs Access the Graph

### Option 1: Direct API Call
```bash
curl "https://graph.croutons.ai/api/query?q=YOUR_QUERY&limit=20"
```

### Option 2: GPT Function Calling
When integrated into a GPT:
1. GPT receives user query
2. GPT decides to call `query_croutons_graph`
3. Function executes and queries graph API
4. Results returned to GPT
5. GPT uses results to answer user

### Option 3: Custom Integration
Use the function definition and executor in your own LLM integration:
```javascript
import { queryCroutonsGraphFunction, executeQueryCroutonsGraph } from './functions/query_croutons_graph.js';

// Add to your function list
const functions = [queryCroutonsGraphFunction];

// Execute when called
const result = await executeQueryCroutonsGraph({
  query: "Bangkok massage Asok",
  corpus: "bkk_massage"
});
```

## Next Steps for LLM Teams

1. **Add Function to GPT Configuration**
   - Copy function definition from `precogs-api/src/functions/query_croutons_graph.js`
   - Add to your GPT's function list
   - Set API endpoint: `https://graph.croutons.ai/api/query`

2. **Update System Prompt**
   - Add guidance on when to use `query_croutons_graph`
   - Explain use cases (fact verification, relationship discovery, etc.)

3. **Test Integration**
   - Try queries like "Bangkok massage shops in Asok"
   - Verify results are returned correctly
   - Check that GPT uses results appropriately

## Available Data

The graph currently contains:
- **bkk_massage**: 103 factlets, 199 triples (shops, districts, safety signals)
- **floodbarrierpros.com**: 662 factlets, 1,987 triples (flood protection services)
- **Total**: ~765 factlets, ~2,186 triples

## API Endpoints Summary

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `/api/query` | LLM-friendly semantic search | None (public) |
| `/api/triples` | Query triples by subject/predicate/object | None |
| `/api/facts` | Query factlets by source URL | None |
| `/feeds/croutons.ndjson` | Full croutons feed | None |
| `/feeds/graph.json` | Full graph (triples) | None |

## Files Changed

1. `graph-service/server.js` - Added `/api/query` endpoint
2. `precogs-api/src/functions/query_croutons_graph.js` - New function definition
3. `precogs-api/src/integrations/openai-chat.js` - Integrated function into OpenAI chat
4. `precogs/LLM_GRAPH_ACCESS.md` - Complete documentation

## Testing

Test the endpoint:
```bash
# Basic query
curl "https://graph.croutons.ai/api/query?q=Bangkok%20massage&limit=5"

# With corpus filter
curl "https://graph.croutons.ai/api/query?q=massage&corpus=bkk_massage&limit=10"

# With domain filter
curl "https://graph.croutons.ai/api/query?q=flood%20protection&domain=floodbarrierpros.com"
```

## Status

✅ Graph query API endpoint created
✅ GPT function definition created
✅ OpenAI integration updated
✅ Documentation created
⏳ Ready for LLM team integration

