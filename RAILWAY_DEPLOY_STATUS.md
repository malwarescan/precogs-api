# RAILWAY DEPLOYMENT: Install Phase Missing - Added Explicit Config

**Time**: 2026-01-28 19:32 UTC  
**Status**: 🔧 EXPLICIT BUILD CONFIG ADDED

---

## ROOT PROBLEM IDENTIFIED

Railway is **skipping the install phase** entirely. The logs show:
```
2026-01-28T19:28:14.000000000Z [inf] Starting Container
2026-01-28T19:28:17.217552168Z [err] Cannot find package 'express'
```

**No build/install logs** - container starts immediately without `npm install`.

---

## FIX APPLIED (Commit `705eb26`)

Added explicit install command to `railway.toml`:

```toml
[build]
builder = "nixpacks"

[build.nixpacksConfig]
installCommand = "npm ci"

[deploy]
startCommand = "npm run start"
```

This forces Railway to:
1. Run `npm ci` during build phase
2. **Then** start container with `npm run start`

---

## TIMELINE OF ATTEMPTS

| Time | Action | Result |
|------|--------|--------|
| 13:45 UTC | Added nixpacks.toml (nodejs-20_x) | Wrong package name |
| 16:55 UTC | Fixed to nodejs_20 | Install still not running |
| 19:27 UTC | Removed nixpacks.toml (auto-detect) | Install still not running |
| 19:32 UTC | Added installCommand to railway.toml | Testing now ⏳ |

---

## CURRENT BUILD STATUS

**Deployed**: 19:32 UTC  
**Expected Completion**: 19:36 UTC  
**Health Check**: 19:37 UTC

---

## WHAT TO WATCH FOR

### Success Indicators (in Railway logs):
```
✓ Running install command: npm ci
✓ added XXX packages
✓ Applied 020_add_evidence_type.sql
✓ Applied 021_add_anchor_missing.sql
✓ precogs-api listening on port 8080
```

### Failure Indicators:
```
✗ Starting Container (immediately, no install)
✗ Cannot find package 'express'
```

---

## IF THIS FAILS

Next escalation steps:
1. **Railway Dashboard** - Check detailed build settings
2. **Clear Build Cache** - Railway may be using stale cache
3. **Alternative: Dockerfile** - Create explicit Docker build instead of nixpacks
4. **Railway Support** - Report persistent build configuration issue

---

## ALL CODE READY

Phase A-E implementation: ✅ **100% COMPLETE**

Only blocker: Railway platform needs to run `npm install` before starting container.

---

**Next Update**: 19:37 UTC (after health check)
