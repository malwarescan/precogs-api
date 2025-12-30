# Unified Architecture - All Precogs Use Same Pattern

## The Right Way ✅

**One Function, One Pattern:**

```
GPT → invoke_precog(precog="bkk_massage") → Precogs API → Worker → Merge Service → Response
GPT → invoke_precog(precog="home.hvac") → Precogs API → Worker → Graph Service → Response
GPT → invoke_precog(precog="schema") → Precogs API → Worker → Schema Validation → Response
```

## Why This Makes Sense

1. **Consistency**: All precogs use the same function (`invoke_precog`)
2. **Simplicity**: GPT only needs to know one function
3. **Maintainability**: One code path to maintain
4. **Scalability**: Easy to add new precogs

## Architecture Layers

### Layer 1: GPT Interface
- **Function**: `invoke_precog`
- **Parameters**: `precog`, `content`, `task`, `region`, etc.
- **Returns**: `job_id` + `stream_url`

### Layer 2: Precogs API
- Receives `invoke_precog` calls
- Creates job
- Routes to appropriate worker handler

### Layer 3: Precogs Worker
- **homePrecog.js**: Calls Graph Service → Returns factlets
- **bkkMassagePrecog.js**: Calls Merge Service → Returns merged shops
- **schemaPrecog.js**: Validates schema → Returns validation results

### Layer 4: Data Services (Separate Services)
- **Graph Service**: Stores/retrieves factlets (for home precogs)
- **Merge Service**: Merges live data + corpus (for bkk_massage)
- **Schema KB**: Schema validation rules (for schema precog)

## What Changed

### Before (Wrong ❌)
```
GPT → invoke_bkk_merge() → Merge Service → Response
GPT → invoke_precog(precog="home") → Precogs API → Worker → Response
```

### After (Right ✅)
```
GPT → invoke_precog(precog="bkk_massage") → Precogs API → Worker → Merge Service → Response
GPT → invoke_precog(precog="home") → Precogs API → Worker → Graph Service → Response
```

## Benefits

1. **Single Function**: GPT only needs `invoke_precog`
2. **Consistent Pattern**: All precogs work the same way
3. **Worker Handles Complexity**: Worker decides which service to call
4. **Services Stay Separate**: Data services remain independent (good separation of concerns)

## Implementation

### GPT Side
```javascript
// One function for all precogs
{
  "name": "invoke_precog",
  "parameters": {
    "precog": "bkk_massage" | "home.hvac" | "schema" | ...
  }
}
```

### Worker Side
```javascript
// bkkMassagePrecog.js
async function processBkkMassagePrecog(...) {
  // 1. Fetch live data (Google Maps)
  const liveShops = await fetchGoogleMapsData();
  
  // 2. Call merge service (like homePrecog calls graph service)
  const mergedShops = await mergeWithCorpus(liveShops);
  
  // 3. Process and return
  return processTask(mergedShops);
}
```

## Environment Variables

**Precogs Worker** needs:
```bash
BKK_MERGE_API_URL=https://croutons-merge-service.up.railway.app/v1/merge/bkk_massage
```

**Not needed in GPT/API layer** - worker handles it internally.

---

**Result**: Clean, consistent architecture where all precogs follow the same pattern! ✅

