# Graph Service: /api/urls Endpoint - Final Implementation

**File**: Create `/graph-service/src/routes/urls.js`

---

## Complete Implementation (Copy-Paste Ready)

```javascript
// GET /api/urls?domain=<domain>
// Returns list of URLs from html_snapshots for a domain

import { pool } from '../db.js';  // IMPORTANT: Use same pool as other routes

export async function getUrls(req, res) {
  try {
    const { domain } = req.query;
    
    if (!domain) {
      return res.status(400).json({ ok: false, error: 'Domain required' });
    }
    
    // DISTINCT ON with deterministic tie-breaker (id DESC prevents flicker)
    const query = `
      SELECT DISTINCT ON (source_url)
        source_url,
        fetched_at,
        extraction_text_hash,
        extraction_method
      FROM public.html_snapshots
      WHERE domain = $1
      ORDER BY source_url, fetched_at DESC, id DESC
    `;
    
    const result = await pool.query(query, [domain]);
    
    res.json({
      ok: true,
      domain,
      count: result.rows.length,
      data: result.rows
    });
    
  } catch (error) {
    console.error('[urls] Error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
```

---

## Register Route in Server

**File**: `/graph-service/server.js` (or wherever routes are registered)

```javascript
import { getUrls } from './src/routes/urls.js';

// Add this route
app.get('/api/urls', getUrls);
```

---

## Key Details

### 1. Pool Import
**CRITICAL**: Use the same `pool` import as other routes in graph-service
```javascript
import { pool } from '../db.js';  // Adjust path to match your structure
```

### 2. Deterministic Ordering
```sql
ORDER BY source_url, fetched_at DESC, id DESC
```
- `source_url`: Groups duplicates
- `fetched_at DESC`: Gets latest
- `id DESC`: **Tie-breaker** when fetched_at is identical (prevents flicker)

### 3. Fields Returned
**Only what's needed** (no `LENGTH(canonical_extracted_text)` for performance):
- `source_url` - The page URL
- `fetched_at` - When it was ingested
- `extraction_text_hash` - Links to facts
- `extraction_method` - How it was extracted

### 4. URL Normalization
**Do NOT normalize** `source_url` in this endpoint. Return exactly as stored in DB. Consistency is key.

---

## Testing

### Test A: Basic Functionality
```bash
curl -s "https://graph.croutons.ai/api/urls?domain=nrlc.ai" | jq '.'
```

**Expected Output**:
```json
{
  "ok": true,
  "domain": "nrlc.ai",
  "count": 1,
  "data": [
    {
      "source_url": "https://nrlc.ai/",
      "fetched_at": "2026-01-28T08:27:00.000Z",
      "extraction_text_hash": "01afe8a1fa5c04b995e3efe8d010857e2f2172b11e45b272b054ee020bd95cdf",
      "extraction_method": "croutons-readability-v1"
    }
  ]
}
```

### Test A1: Missing Domain
```bash
curl -s "https://graph.croutons.ai/api/urls" | jq '.'
```

**Expected**: `{ "ok": false, "error": "Domain required" }`

### Test A2: Non-Existent Domain
```bash
curl -s "https://graph.croutons.ai/api/urls?domain=nonexistent.example" | jq '.count'
```

**Expected**: `0` (empty data array, not error)

---

## Common Issues

### Issue 1: "pool is not defined"
**Cause**: Wrong import path
**Fix**: Check other routes in graph-service, use same import:
```javascript
import { pool } from '../db.js';  // or './db.js' or '../config/db.js'
```

### Issue 2: "column 'id' does not exist"
**Cause**: html_snapshots uses different PK name
**Fix**: Check schema, use actual PK column name:
```sql
-- If PK is 'uuid':
ORDER BY source_url, fetched_at DESC, uuid DESC
```

### Issue 3: Flicker when same domain has multiple snapshots
**Cause**: Missing tie-breaker in ORDER BY
**Fix**: Already included (`id DESC`)

---

## Deployment Checklist

- [ ] Create `/graph-service/src/routes/urls.js`
- [ ] Import correct `pool` from db module
- [ ] Register route in server.js: `app.get('/api/urls', getUrls)`
- [ ] Deploy to Railway/production
- [ ] Run Test A and verify output
- [ ] Paste raw output to Slack with timestamp

---

**ETA**: 15 minutes (including deploy + test)
