# Understanding Check - Bangkok Massage Corpus

**Date:** 2025-01-05  
**Team:** Precogs Dev Team

---

## Quick Summary (What We're Asking)

We've created a new corpus: **Bangkok Massage Intelligence** (`bkk_massage`)

- ✅ **Complete:** 103 factlets, 199 triples
- ✅ **Validated:** PASS (0 errors)
- ✅ **Ready:** All files in `/corpora/thailand/bangkok/massage/`

---

## What We Need From You

### 1. Add to Precog Enum
**File:** `precogs-api/src/functions/invoke_precog.js`  
**Line:** ~22  
**Change:** Add `"bkk_massage"` to the precog enum

```javascript
enum: ["schema", "faq", "pricing", "home", "home.hvac", ..., "bkk_massage"]
```

### 2. Create Worker Handler
**File:** `precogs-api/precogs-worker/src/`  
**Pattern:** Similar to `homePrecog.js`  
**Namespace:** `bkk_massage`

### 3. Implement 4 Tasks
- `legitimacy_scoring` - Score shops by safety signals
- `district_aware_ranking` - Rank shops by district
- `safety_pattern_recognition` - Identify safety patterns
- `price_sanity_checking` - Validate prices

### 4. Register Corpus
- Use `corpus_manifest.json` from corpus directory
- Load factlets into graph
- Load triples for entity linking

---

## Questions to Confirm Understanding

1. ✅ Do you understand what we need?
2. ✅ Is the corpus structure clear?
3. ✅ Do you have questions about the schema?
4. ✅ Timeline - when can this be done?
5. ✅ Any blockers or concerns?

---

## Key Files to Reference

- **Corpus:** `/corpora/thailand/bangkok/massage/`
- **Manifest:** `corpus_manifest.json` (full schema)
- **Integration Guide:** `/precogs/BANGKOK_MASSAGE_CORPUS_INTEGRATION.md`
- **Validation:** `validation_report.json` (all passing)

---

## Next Steps (After Confirmation)

1. [ ] Team confirms understanding
2. [ ] Set timeline for integration
3. [ ] Assign tasks
4. [ ] Begin implementation
5. [ ] Test integration
6. [ ] Deploy

---

**Status:** Awaiting confirmation  
**Action:** Please confirm you understand and we can proceed!

