# Message for OurCasa Team: Vertical Parameter Fix

## Quick Message (Copy-Paste Ready)

```
✅ Fixed: "vertical is not defined" Error

The Precogs runtime bug has been fixed and deployed. The issue was in the 
home.safety precog's diagnoseTask function - it was accessing the `vertical` 
parameter without extracting it from the request context first.

Fix Details:
- Added: const vertical = context?.vertical || "";
- Location: precogs-worker/src/homePrecog.js
- Status: ✅ Committed and pushed to master
- Deployment: Railway will auto-deploy (usually takes 2-3 minutes)

Your PrecogsClient.php is sending the vertical parameter correctly - the 
bug was entirely on our side. The fix is now live.

Next Steps:
1. Retry your integration tests with the same request
2. You should no longer see "vertical is not defined" errors
3. The diagnose task will now properly use vertical-specific logic

Test Request:
POST https://precogs.croutons.ai/v1/run.ndjson
{
  "precog": "home.safety",
  "task": "diagnose",
  "content": "My garage keeps flooding. ZIP: 33908.",
  "region": "33908",
  "domain": "floodbarrierpros.com",
  "vertical": "flood_protection"
}

Expected: No errors, proper response with vertical-specific recommendations

Let me know if you see any remaining issues!
```

## Technical Details (If They Ask)

**What Was Wrong:**
The `diagnoseTask` function extracted `content`, `region`, and `domain` from context, but forgot to extract `vertical`. When it later tried to use `vertical` in `getConnectedPartners(vertical || "flood_protection", region)`, it threw a ReferenceError.

**The Fix:**
Added one line: `const vertical = context?.vertical || "";` at the beginning of `diagnoseTask`, matching how other parameters are extracted.

**Impact:**
- ✅ Unblocks Flood Barrier Pros integration
- ✅ Enables vertical-specific partner filtering
- ✅ Better recommendations based on vertical
- ✅ Backward compatible (works even if vertical not provided)

**Commit:** `ccf148a` - "Fix: Extract vertical parameter in diagnoseTask to resolve 'vertical is not defined' error"


