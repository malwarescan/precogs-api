# Bangkok Massage Corpus - Live Discussion Notes

**Date:** 2025-01-05  
**Team:** Precogs Dev Team (live discussion)

---

## Quick Overview (30 seconds)

- **New corpus:** Bangkok Massage Intelligence (`bkk_massage`)
- **Status:** ✅ Complete, validated, ready for integration
- **Location:** `/corpora/thailand/bangkok/massage/`
- **Size:** 103 factlets, 199 triples
- **Validation:** PASS (0 errors, 0 warnings)

---

## What We Have Ready

### Corpus Files
- 8 NDJSON files with all data
- `corpus_manifest.json` - Full registration manifest
- Validation reports (all passing)
- Triple generation complete

### Documentation
- Integration guide: `BANGKOK_MASSAGE_CORPUS_INTEGRATION.md`
- Corpus README with full details
- GPT implementation instructions

---

## What We Need From Precogs Team

### 1. Code Updates
- [ ] Add `bkk_massage` to precog enum in `invoke_precog.js` (line 22)
- [ ] Create worker handler for `bkk_massage` namespace
- [ ] Implement 4 tasks:
  - `legitimacy_scoring`
  - `district_aware_ranking`
  - `safety_pattern_recognition`
  - `price_sanity_checking`

### 2. Corpus Registration
- [ ] Register corpus using `corpus_manifest.json`
- [ ] Load factlets into graph
- [ ] Load triples for entity linking

### 3. Testing
- [ ] Test corpus loading
- [ ] Test Precog tasks
- [ ] Verify entity queries

---

## Key Questions to Discuss

1. **Timeline:** When can we integrate this?
2. **Priority:** Is this high priority or can it wait?
3. **Worker pattern:** Should we follow the `homePrecog.js` pattern?
4. **Testing:** How do you want to test it?
5. **Questions:** Any questions about the corpus structure?

---

## Corpus Structure (Quick Reference)

- **Primary Entity:** MassageShop (32 total: 20 legitimate, 12 risky)
- **Districts:** 10 (Asok, Nana, Phrom Phong, Thonglor, Ekkamai, Silom, Ari, Victory Monument, Ratchada, Old City)
- **Safety Signals:** 8 indicators (uniforms, posted menu, etc.)
- **Scam Patterns:** 8 risk factors to filter
- **Pricing:** 20 district-based price tiers

---

## Files to Show Them

1. `/corpora/thailand/bangkok/massage/corpus_manifest.json` - Schema
2. `/corpora/thailand/bangkok/massage/validation_report.json` - Validation
3. `/precogs/BANGKOK_MASSAGE_CORPUS_INTEGRATION.md` - Full guide

---

## Action Items (After Discussion)

- [ ] Document decisions made
- [ ] Set timeline for integration
- [ ] Assign tasks
- [ ] Schedule follow-up

---

**Notes from discussion:**




