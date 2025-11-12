# Deploy KB Training System

**Status:** ✅ Ready to Deploy  
**What:** KB-based schema validation system

---

## Quick Deploy

```bash
# 1. Commit changes
cd ~/Desktop/croutons.ai/precogs/precogs-api
git add .
git commit -m "feat: Add KB training system for schema precog

- Add KB file structure (kb/schema-foundation/)
- Add KB loader (src/kb.js)
- Add schema validator (src/validateSchema.js)
- Update worker to use KB validation
- Add Service type rules and examples"

git push origin master

# 2. Deploy worker (KB system is in worker)
cd ~/Desktop/croutons.ai/precogs/precogs-api/precogs-worker
npx railway up -s precogs-worker

# 3. Wait 15 seconds, then test
sleep 15

# 4. Test KB validation
API="https://precogs.croutons.ai"
SNIPPET='{"@context":"https://schema.org","@type":"Service","name":"Test Service"}'

curl -N "$API/v1/run.ndjson" \
  -H "Content-Type: application/json" \
  -d '{
    "precog":"schema",
    "kb":"schema-foundation",
    "task":"validate",
    "type":"Service",
    "content_source":"inline",
    "content": '"$SNIPPET"'
  }'
```

**Expected:** Detailed validation with recommendations from KB rules

---

## What Changed

- ✅ KB files created (`kb/schema-foundation/`)
- ✅ KB loader implemented (`src/kb.js`)
- ✅ Validator implemented (`src/validateSchema.js`)
- ✅ Worker updated to use KB system
- ✅ Dependencies installed (ajv, ajv-formats)

---

## Verification

After deployment, check:

1. **Worker logs show KB loading:**
   ```
   [kb] Loaded KB: schema-foundation v1.0.0
   [kb] Loaded type rules: Service
   ```

2. **Validation output includes KB recommendations:**
   ```
   💡 Recommendations:
     • Consider adding: description (1–2 sentences...)
     • Consider adding: provider (Organization or...)
   ```

3. **Metrics increment:**
   ```bash
   curl -s https://precogs.croutons.ai/metrics | jq '.processed_total'
   ```

---

**Ready to deploy!** 🚀

