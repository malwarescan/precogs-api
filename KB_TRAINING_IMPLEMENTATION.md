# KB Training Implementation - Complete

**Date:** December 2024  
**Status:** ✅ Implemented and Ready for Deployment

---

## What Was Implemented

### 1. KB File Structure Created

```
precogs-worker/
  kb/
    schema-foundation/
      kb.json                    # Core registry + global prefs
      types/
        Service.json             # Per-type rules with constraints
      examples/
        Service.good.jsonld      # Good example
        Service.minimal.jsonld   # Minimal valid example
        Service.bad.jsonld       # Bad example (anti-pattern)
      templates/
        Service.hbs              # Generation template
      patterns/
        common-anti-patterns.md   # Documentation
```

### 2. KB Loader (`src/kb.js`)

- Loads KB configuration from `kb.json`
- Loads all type rules from `types/` directory
- Provides helpers for loading examples and templates
- Caches KB data for performance

### 3. Schema Validator (`src/validateSchema.js`)

- Validates JSON-LD against KB rules
- Checks required fields
- Checks disallowed fields
- Enforces constraints (oneOf, type, minLength, maxCount, etc.)
- Builds recommendations for missing recommended fields
- Pretty prints validation results

### 4. Worker Integration

- Updated `worker.js` to use new KB system
- Loads KB at startup (cached)
- Processes schema precog jobs with KB validation
- Provides detailed validation output with issues and recommendations

### 5. Dependencies Added

- `ajv` - JSON Schema validator (installed)
- `ajv-formats` - Additional format validators (installed)

---

## KB Rules Structure

### Service Type Rules (`types/Service.json`)

**Required Fields:**
- `@context`
- `@type`
- `name`

**Recommended Fields:**
- `description`
- `areaServed`
- `serviceType`
- `provider`

**Disallowed Fields:**
- `aggregateRating`
- `offers.priceCurrency`
- `brand`

**Constraints:**
- `provider.@type` must be one of: `["Organization", "LocalBusiness"]`
- `areaServed` must be string or Place object, max 3 items
- `serviceType` must be string, min length 3

**Field Guidance:**
- Provides helpful descriptions for each field

---

## How It Works

### 1. Job Processing Flow

```
Job arrives → Load KB (cached) → Extract JSON-LD → 
Find type rules → Validate → Build recommendations → 
Stream results → Complete
```

### 2. Validation Process

1. **Extract JSON-LD** from content (handles both raw JSON and HTML with script tags)
2. **Identify schema type** from `@type` field or `type` parameter
3. **Load type rules** from KB
4. **Validate** against rules:
   - Check required fields
   - Check disallowed fields
   - Enforce constraints
5. **Build recommendations** for missing recommended fields
6. **Format output** with issues, warnings, and recommendations

### 3. Output Format

```
📋 Schema Validation Results for @type: Service
✅ Schema is valid! (or ❌ Validation Issues Found)

⚠️  Warnings:
  • [warning messages]

💡 Recommendations:
  • Consider adding: description (1–2 sentences, unique per page; plain text.)
  • Consider adding: provider (Organization or LocalBusiness...)

📦 Validated JSON-LD:
```json
{...}
```
```

---

## Testing

### Local Test

```bash
cd ~/Desktop/croutons.ai/precogs/precogs-api/precogs-worker

# Test KB loading
node -e "import('./src/kb.js').then(m => console.log(JSON.stringify(m.loadKB('schema-foundation'), null, 2)))"
```

### Production Test

```bash
API="https://precogs.croutons.ai"
SNIPPET='{"@context":"https://schema.org","@type":"Service","name":"Test"}'

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

**Expected:** Detailed validation output with recommendations

---

## Deployment

### 1. Commit Changes

```bash
cd ~/Desktop/croutons.ai/precogs/precogs-api
git add .
git commit -m "feat: Add KB training system for schema precog

- Add KB file structure (kb/schema-foundation/)
- Add KB loader (src/kb.js)
- Add schema validator (src/validateSchema.js)
- Update worker to use KB validation
- Add Service type rules and examples"

git push origin master
```

### 2. Deploy Worker

```bash
cd ~/Desktop/croutons.ai/precogs/precogs-api/precogs-worker
npx railway up -s precogs-worker
```

### 3. Verify

```bash
# Check worker logs
npx railway logs -s precogs-worker

# Test validation
# (use curl command from Testing section above)
```

---

## Next Steps: Making It "Intelligent" Over Time

### Phase 1: Expand Type Coverage
- Add `Organization.json` rules
- Add `Product.json` rules
- Add `Article.json` rules
- Add `LocalBusiness.json` rules

### Phase 2: Richer Constraints
- Cross-field validation (e.g., URL must match page domain)
- Logo URL validation (must be absolute HTTPS)
- Date format validation
- Email/phone format validation

### Phase 3: Template Generation
- Implement template rendering for `generate_and_validate` task
- Map page hints (title, H1, meta tags) to template variables
- Generate JSON-LD from template, then validate

### Phase 4: Embeddings (Future)
- Store curated examples in vector store
- Retrieve top-k exemplars by type
- Use exemplars for better defaults and recommendations

### Phase 5: Metrics & Coverage
- Track required/recommended field satisfaction per type
- Add KB efficacy metrics to `/metrics` endpoint
- Monitor validation success rates

### Phase 6: Governance
- Version KB (`kb.json` version field)
- PR review for rule changes
- Changelog of rule updates

---

## Files Created/Modified

### New Files
- `precogs-worker/kb/schema-foundation/kb.json`
- `precogs-worker/kb/schema-foundation/types/Service.json`
- `precogs-worker/kb/schema-foundation/examples/Service.*.jsonld` (3 files)
- `precogs-worker/kb/schema-foundation/templates/Service.hbs`
- `precogs-worker/kb/schema-foundation/patterns/common-anti-patterns.md`
- `precogs-worker/src/kb.js`
- `precogs-worker/src/validateSchema.js`

### Modified Files
- `precogs-worker/worker.js` - Updated to use KB system
- `precogs-worker/package.json` - Added ajv dependencies

---

## Success Criteria

✅ KB files created with proper structure  
✅ KB loader loads rules correctly  
✅ Validator checks required/disallowed fields and constraints  
✅ Worker integrates KB validation  
✅ Validation output is detailed and helpful  
✅ Examples and templates included  
✅ Ready for deployment  

---

**Status:** ✅ Complete - Ready for deployment and testing

