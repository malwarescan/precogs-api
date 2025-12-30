# Bangkok Massage Intelligence Corpus - Integration Request

**To:** @precogs  
**Subject:** New Corpus Ready for Precog Integration - `bkk_massage`

---

## Summary

New localized intelligence domain corpus ready for Precog integration: **Bangkok Massage Intelligence** (`bkk_massage`).

**Status:** ✅ Complete and validated  
**Location:** `/corpora/thailand/bangkok/massage/`  
**Precog Binding:** `bkk_massage`

---

## Corpus Details

### Statistics
- **Total Factlets:** 103
  - MassageShop (legitimate): 20
  - MassageShop (risky): 12
  - District profiles: 10
  - Pricing tiers: 20
  - Safety signals: 8
  - Scam patterns: 8
  - Etiquette rules: 10
  - Female safe spaces: 15

- **Total Triples:** 199
  - Shop → District (located_in): 32
  - Shop → Safety Signals (has_safety_signal): 101
  - Shop → Risk Factors (has_risk_factor): 31
  - District → Price Tier (has_price_band): 20
  - Shop → Female Safe (is_verified_safe_for): 15

### Validation Status
- ✅ Schema Compliance: PASS
- ✅ Data Quality: good
- ✅ Errors: 0
- ✅ Warnings: 0

---

## Files Delivered

All files located in `/corpora/thailand/bangkok/massage/`:

### NDJSON Data Files
1. `shops_legit.ndjson` - 20 legitimate massage shops
2. `shops_risky.ndjson` - 12 risky shops (for filtering)
3. `pricing_tiers.ndjson` - 20 district-based pricing tiers
4. `neighborhood_profiles.ndjson` - 10 district definitions
5. `etiquette.ndjson` - 10 Thai massage etiquette rules
6. `scam_patterns.ndjson` - 8 common scam patterns
7. `safety_signals.ndjson` - 8 positive safety indicators
8. `female_safe_spaces.ndjson` - 15 verified safe spaces for solo women
9. `triples.ndjson` - 199 generated triples (entity linking)

### Scripts & Reports
- `generate_triples.js` - Triple generation script
- `generate_entity_index.js` - Entity indexing script
- `validate_corpus.js` - Validation script
- `triple_generation_report.json` - Triple statistics
- `entity_index_summary.json` - Entity counts and index
- `validation_report.json` - Validation results

### Documentation
- `corpus_manifest.json` - Precog registration manifest (full schema)
- `README.md` - Corpus documentation
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `DELIVERY_SUMMARY.md` - Delivery checklist

---

## Precog Tasks Supported

The corpus is designed to support these Precog tasks:

1. **`legitimacy_scoring`** - Score shops based on safety signals and risk factors
2. **`district_aware_ranking`** - Rank shops by district with context
3. **`safety_pattern_recognition`** - Identify safety patterns and risk factors
4. **`price_sanity_checking`** - Validate prices against district norms

---

## Integration Requirements

### 1. Register Corpus
- Use `corpus_manifest.json` for registration
- Corpus ID: `bkk_massage`
- Version: 1.0.0

### 2. Bind to Precog Namespace
- Namespace: `precog="bkk_massage"`
- Add to `invoke_precog` function enum
- Update worker routing to handle `bkk_massage` namespace

### 3. Load Data
- Load factlets from NDJSON files into graph
- Load triples from `triples.ndjson` for entity linking
- Primary entity: `MassageShop`

### 4. Implement Precog Worker
Create worker handler for `bkk_massage` that:
- Queries corpus for shops by district
- Scores shops based on safety signals
- Filters risky shops
- Returns district-aware rankings
- Validates pricing against district norms

### 5. Update Function Definition
Add `bkk_massage` to precog enum in:
- `src/functions/invoke_precog.js`
- Function schema for GPT integration

---

## Data Schema

### MassageShop Entity
```json
{
  "@type": "MassageShop",
  "name": "Health Land Asok",
  "district": "Asok",
  "address": "55/5 Sukhumvit 21 Road, Asok",
  "coordinates": {"lat": 13.7306, "lng": 100.5628},
  "price_traditional": 400,
  "price_oil": 650,
  "hours": "10:00-24:00",
  "franchise": true,
  "legit": true,
  "strengths": ["uniforms", "open_storefront", "posted_menu"],
  "notes": "Consistent service, bright entry",
  "last_verified": "2025-01-05"
}
```

### District Entity
```json
{
  "@type": "District",
  "name": "Asok",
  "character": "Modern business district",
  "safety_at_night": "good",
  "price_average_traditional": 450,
  "price_average_oil": 700,
  "tourist_density": "high",
  "risk_level": "low"
}
```

### Triple Format
```json
{
  "@type": "Triple",
  "subject": "Health Land Asok",
  "predicate": "located_in",
  "object": "Asok"
}
```

---

## Districts Covered

All districts normalized to allowed list:
- Asok
- Nana
- Phrom Phong
- Thonglor
- Ekkamai
- Silom
- Ari
- Victory Monument
- Ratchada
- Old City

---

## Data Quality Guarantees

1. ✅ **No ambiguous shops** - All shops have explicit `legit` field
2. ✅ **Conservative safety** - Unverified shops in risky file
3. ✅ **Normalized districts** - All districts match allowed list exactly
4. ✅ **No duplicates** - All shop names verified unique
5. ✅ **Atomic factlets** - Each factlet is independent and verifiable

---

## Example Precog Query

**Input:**
```json
{
  "precog": "bkk_massage",
  "content": "Where can I get a safe massage in Asok?",
  "task": "district_aware_ranking",
  "region": "Asok"
}
```

**Expected Output:**
- List of legitimate shops in Asok district
- Safety signals for each shop
- Pricing information
- District context (safety level, price norms)

---

## Next Steps

1. **Review corpus files** - Check validation reports and manifest
2. **Register corpus** - Use `corpus_manifest.json`
3. **Implement worker** - Create `bkk_massage` handler in worker
4. **Update function schema** - Add to `invoke_precog` enum
5. **Test integration** - Verify Precog tasks work correctly

---

## Questions?

Refer to:
- `corpus_manifest.json` - Full schema and requirements
- `README.md` - Corpus documentation
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `DELIVERY_SUMMARY.md` - Delivery checklist

---

## Files Location

All files are in: `/corpora/thailand/bangkok/massage/`

**Ready for Precog integration!** 🚀

---

**Contact:** See corpus directory for full documentation

