# Message to Precogs Dev Team

**Channel:** @precogs  
**Date:** 2025-01-05

---

Hello Precogs dev team! 👋

I have a new corpus ready for integration: **Bangkok Massage Intelligence** (`bkk_massage`).

## Quick Summary

- **Status:** ✅ Complete and validated
- **Location:** `/corpora/thailand/bangkok/massage/`
- **Factlets:** 103 (20 legitimate shops, 12 risky shops, 10 districts, etc.)
- **Triples:** 199 (entity linking)
- **Validation:** PASS (0 errors, 0 warnings)

## What I Need From You

1. **Review the corpus** - Files are in `/corpora/thailand/bangkok/massage/`
2. **Register it** - Use `corpus_manifest.json` 
3. **Add to precog enum** - Add `bkk_massage` to `invoke_precog.js` (line 22)
4. **Create worker handler** - Implement the 4 Precog tasks:
   - `legitimacy_scoring`
   - `district_aware_ranking`
   - `safety_pattern_recognition`
   - `price_sanity_checking`

## Documentation

Full integration details are in:
- **Integration guide:** `/precogs/BANGKOK_MASSAGE_CORPUS_INTEGRATION.md`
- **Corpus manifest:** `/corpora/thailand/bangkok/massage/corpus_manifest.json`
- **Validation reports:** All in corpus directory

## Questions?

Let me know if you need any clarification or have questions about the corpus structure, schema, or integration requirements.

Ready to proceed when you are! 🚀

---

**Files ready for review:**
- `/corpora/thailand/bangkok/massage/` - All corpus files
- `/precogs/BANGKOK_MASSAGE_CORPUS_INTEGRATION.md` - Integration guide

