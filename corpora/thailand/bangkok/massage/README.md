# Bangkok Massage Intelligence Corpus

## Overview

This corpus provides structured, verifiable, safety-prioritized data covering massage shops, districts, pricing, etiquette, and risk signals across Bangkok. It feeds the `bkk_massage` Precog and is consumed by downstream GPT agents.

## Corpus Structure

### NDJSON Files

- **shops_legit.ndjson** - Legitimate massage shops with verified safety and service quality (20 shops)
- **shops_risky.ndjson** - Shops with known risk factors or unverifiable legitimacy (12 shops)
- **pricing_tiers.ndjson** - Price bands by district and type of massage (20 tiers)
- **neighborhood_profiles.ndjson** - District-level definitions (10 districts)
- **etiquette.ndjson** - Thai massage etiquette rules (10 rules)
- **scam_patterns.ndjson** - Common scam patterns (8 patterns)
- **safety_signals.ndjson** - Positive safety indicators (8 signals)
- **female_safe_spaces.ndjson** - Verified safe spaces for solo women (15 shops)
- **triples.ndjson** - Generated triples linking entities (199 triples)

### Scripts

- **generate_triples.js** - Generates triples from factlets
- **generate_entity_index.js** - Generates entity index summary
- **validate_corpus.js** - Validates schema compliance and data quality

### Reports

- **triple_generation_report.json** - Triple generation statistics
- **entity_index_summary.json** - Entity counts and index
- **validation_report.json** - Schema validation results

### Configuration

- **corpus_manifest.json** - Corpus registration manifest for Precog

## Entity Counts

- MassageShop (legitimate): 20
- MassageShop (risky): 12
- MassageShop (total): 32
- District: 10
- SafetySignal: 8
- ScamPattern: 8
- EtiquetteRule: 10
- PriceTier: 20
- FemaleSafeSpace: 15

## Triple Counts

- located_in: 32 (Shop → District)
- has_safety_signal: 101 (Shop → Safety Signal)
- has_risk_factor: 31 (Shop → Risk Factor)
- has_price_band: 20 (District → Price Tier)
- is_verified_safe_for: 15 (Shop → Female Safe)

**Total Triples: 199**

## Districts Covered

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

## Usage

### Generate Triples

```bash
node generate_triples.js
```

### Generate Entity Index

```bash
node generate_entity_index.js
```

### Validate Corpus

```bash
node validate_corpus.js
```

## Precog Binding

This corpus is bound to the `bkk_massage` Precog namespace and supports the following tasks:

- legitimacy_scoring
- district_aware_ranking
- safety_pattern_recognition
- price_sanity_checking

## Data Quality

- Schema Compliance: PASS
- Data Quality: good
- All districts normalized to allowed list
- No duplicate shop entries
- Conservative safety markings (unverified shops marked as risky)

## Last Updated

2025-01-05

