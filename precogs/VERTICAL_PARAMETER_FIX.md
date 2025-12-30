# Fix: "vertical is not defined" Error

## Issue

The `home.safety` precog was throwing a runtime error when processing `diagnose` tasks:

```
⚠️ Error processing diagnose: vertical is not defined
```

## Root Cause

The `diagnoseTask` function in `homePrecog.js` was accessing `vertical` as a variable without extracting it from the `context` parameter first.

**Bug Location:** `precogs/precogs-api/precogs-worker/src/homePrecog.js:296`

**Before:**
```javascript
function diagnoseTask(factlets, context) {
  const content = context?.content || "";
  const symptoms = extractSymptoms(content);
  const region = context?.region || "";
  const domain = context?.domain || "";
  // ❌ Missing: const vertical = context?.vertical || "";
  
  // Later in code:
  const connectedPartners = getConnectedPartners(vertical || "flood_protection", region);
  // ❌ Error: vertical is not defined
}
```

## Fix

Added extraction of `vertical` from `context` at the beginning of `diagnoseTask`:

**After:**
```javascript
function diagnoseTask(factlets, context) {
  const content = context?.content || "";
  const symptoms = extractSymptoms(content);
  const region = context?.region || "";
  const domain = context?.domain || "";
  const vertical = context?.vertical || "";  // ✅ Fixed
  
  // Later in code:
  const connectedPartners = getConnectedPartners(vertical || "flood_protection", region);
  // ✅ Now works correctly
}
```

## Verification

Other task handlers already extract `vertical` correctly:
- ✅ `localContextTask` - extracts `vertical` (line 419)
- ✅ `costBandTask` - extracts `vertical` (line 482)
- ✅ `diagnoseTask` - **NOW FIXED** (line 257)

## Test Case

**Request:**
```json
POST /v1/run.ndjson
{
  "precog": "home.safety",
  "task": "diagnose",
  "content": "My garage keeps flooding. ZIP: 33908.",
  "region": "33908",
  "domain": "floodbarrierpros.com",
  "vertical": "flood_protection"
}
```

**Expected:** No "vertical is not defined" errors

**Previous:** Error appeared 4 times per request

**Now:** Should work correctly

## Impact

- ✅ Fixes blocking issue for Flood Barrier Pros integration
- ✅ Enables vertical-specific logic in diagnose task
- ✅ Allows proper filtering of connected partners by vertical
- ✅ No breaking changes (backward compatible)

## Deployment

After deployment, Casa's PrecogsClient.php should work correctly with the `vertical` parameter.

## Related Files

- `precogs/precogs-api/precogs-worker/src/homePrecog.js` - Fixed
- `precogs/precogs-api/src/functions/invoke_precog.js` - Already accepts vertical parameter
- Casa's `PrecogsClient.php` - Already sending vertical correctly


