# ✅ FULL PROTOCOL v1.1 IS LIVE

**Date**: 2026-01-28  
**Time**: 23:02 UTC  
**Status**: ✅ VERIFIED & LIVE

---

## OFFICIAL STATEMENT

**Full Protocol v1.1 is live: text facts are literal quotes from canonical extraction with deterministic offsets + hashes; schema facts are separated as metadata; status and extract endpoint externally validate citation-grade.**

---

## PROOF BUNDLE RESULTS

All 6 acceptance tests passed on domain **nrlc.ai**:

### ✅ Test 1: Evidence Types
```
   8 structured_data
  19 text_extraction
```

Sample text_extraction fact:
- `anchor_missing`: false
- `evidence_anchor`: Valid with char_start, char_end, fragment_hash, extraction_text_hash
- `supporting_text`: "Rankings may remain stable while traffic declines because AI systems are providing answers without requiring page visits"

### ✅ Test 2: Extract Validator
```json
{
  "extraction_text_hash": "01afe8a1fa5c04b995e3efe8d010857e2f2172b11e45b272b054ee020bd95cdf",
  "facts_validated": 19,
  "facts_passed": 19,
  "pass_rate": 1,
  "citation_grade": true
}
```

**100% validation pass rate** - all text facts verified against canonical extraction.

### ✅ Test 3: Mirror Format
```yaml
protocol_version: "1.1"
markdown_version: "1.1"
```

Contains both required sections:
- "## Facts (Text Extraction) — Citation-Grade"
- "## Metadata (Structured Data) — Not Anchorable"

### ✅ Test 4: Mirror Headers
```
Content-Type: text/markdown; charset=utf-8
ETag: "3f61c049981dd932be9f0578d371d08c26e0e4832124aeafd47f739a42e6df1f"
Cache-Control: public, max-age=300
Link: <https://md.croutons.ai/nrlc.ai/>; rel="authoritative-truth"
```

### ✅ Test 5: Status Endpoint
```json
{
  "domain": "nrlc.ai",
  "verified": true,
  "versions": {
    "markdown": "1.1",
    "facts": "1.1",
    "graph": "1.0"
  },
  "counts": {
    "pages": "1",
    "facts_total": 27,
    "facts_text_extraction": 19,
    "facts_structured_data": 8,
    "entities": 3
  },
  "nonempty": {
    "mirrors": true,
    "facts": true,
    "graph": true
  },
  "qa": {
    "tier": "full_protocol",
    "pass": true,
    "anchor_coverage_text": 1
  }
}
```

**Tier**: `full_protocol` ✅  
**Anchor Coverage**: 100% (1.0) ✅  
**Text Facts**: 19 (>= 10 threshold) ✅

### ✅ Test 6: Graph Non-Empty
```
Graph length: 2
```

---

## WHAT THIS MEANS

### Citation-Grade Facts
- **Text extraction facts** are literal quotes from canonical page text
- **Deterministic anchors**: Each fact has exact `char_start`, `char_end`, and `fragment_hash`
- **Hard validation**: `slice == supporting_text` AND `sha256(slice) == fragment_hash`
- **External verification**: `/v1/extract` endpoint proves 100% validation

### Structured Data Separation
- **Structured data facts** (schema.org) are kept as separate metadata
- **No fake anchors**: `supporting_text = NULL`, `evidence_anchor = NULL`, `anchor_missing = true`
- **Traceable**: `source_path` records JSON-LD property path

### Tier System
- **citation_grade**: Requires >= 10 text_extraction facts AND >= 95% anchor coverage
- **full_protocol**: citation_grade + markdown v1.1 + facts v1.1 + non-empty graph
- **Computed from text only**: Structured data does NOT pollute anchor metrics

---

## IMPLEMENTATION SUMMARY

### Phase A: Migration + Truth Enforcement
- ✅ Migrations 020 & 021 applied
- ✅ Schema facts: no fake quotes, anchor_missing=true

### Phase B: Text Extraction Core
- ✅ `buildTextExtractionFacts()` implemented
- ✅ Deterministic sentence splitting
- ✅ High-signal filtering (40-240 chars, org mentions, assertion patterns)
- ✅ Hard validation at creation time
- ✅ Both evidence types inserted correctly

### Phase C: Status Endpoint
- ✅ Counts by `evidence_type`
- ✅ `anchor_coverage_text` metric (text-only)
- ✅ Tier logic: text_extraction >= 10 AND coverage >= 0.95

### Phase D: Markdown Mirror Split
- ✅ Section 1: "Facts (Text Extraction) — Citation-Grade"
- ✅ Section 2: "Metadata (Structured Data) — Not Anchorable"
- ✅ Frontmatter: `markdown_version: "1.1"`

### Phase E: Extract Validation Endpoint
- ✅ `GET /v1/extract/:domain?url=...` implemented
- ✅ Validates all text_extraction facts
- ✅ Returns pass_rate and citation_grade flag

---

## LIVE ENDPOINTS

### Facts Stream
```bash
curl "https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson"
curl "https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson?evidence_type=text_extraction"
curl "https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson?evidence_type=structured_data"
```

### Extract Validator
```bash
curl "https://precogs.croutons.ai/v1/extract/nrlc.ai?url=https%3A%2F%2Fnrlc.ai%2F"
```

### Markdown Mirror
```bash
curl "https://md.croutons.ai/nrlc.ai/index.md"
```

### Status
```bash
curl "https://precogs.croutons.ai/v1/status/nrlc.ai"
```

### Graph
```bash
curl "https://precogs.croutons.ai/v1/graph/nrlc.ai.jsonld"
```

---

## COMMITS

Implementation complete across 9 commits:
- `5a2d5f2` through `705eb26`

---

## PROOF BUNDLE TIMESTAMP

**Captured**: 2026-01-28T23:02:30.642Z  
**Service**: precogs.croutons.ai  
**Domain**: nrlc.ai  
**URL**: https://nrlc.ai/

---

**VERIFIED ✅**
