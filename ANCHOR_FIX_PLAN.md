# ANCHOR CORRECTNESS FIX PLAN

## ROOT CAUSE

Units are **synthetic descriptions** generated from schema.org structured_data, NOT actual quotes from page text.

Example:
- Unit clean_text: "Neural Command, LLC (Organization) name is Neural Command, LLC."
- This is GENERATED, not a quote from canonical_extracted_text
- Trying to indexOf this in canonical text fails or finds wrong matches

## SOLUTION

### A) Separate fact types

**Type 1: Metadata Facts (from structured_data)**
- Source: schema.org JSON-LD  
- NOT anchorable in page text
- Store with: `evidence_type: "structured_data"`
- NOT included in citation_grade tier
- Example: "organization.name", "organization.telephone"

**Type 2: Body Text Facts (from doc_clean_text/sections)**
- Source: Actual page body text
- MUST be anchorable with char offsets
- Store with: `evidence_type: "text_extraction"`
- Required for citation_grade tier
- Example: Sentences extracted from paragraphs

### B) Fix extraction to identify fact type

```javascript
function extractFacts(structuredData, sections, canonicalText) {
  const facts = [];
  
  // Type 1: Schema.org facts (NOT anchorable)
  for (const item of structuredData) {
    for (const [prop, value] of Object.entries(item)) {
      if (prop.startsWith('@')) continue;
      
      facts.push({
        unit_type: 'fact',
        evidence_type: 'structured_data',
        triple: {
          subject: item['@id'] || generateId(item),
          predicate: prop,
          object: value
        },
        // NO clean_text, NO char offsets
        anchor_missing: true,  // By design - metadata facts aren't quotes
        metadata_source: 'schema_org'
      });
    }
  }
  
  // Type 2: Body text facts (MUST be anchorable)
  for (const section of sections) {
    const sentences = extractSentences(section.text);
    
    for (const sentence of sentences) {
      // Find EXACT position in canonicalText
      const charStart = canonicalText.indexOf(sentence);
      if (charStart === -1) {
        console.warn(`Cannot anchor sentence: ${sentence.substring(0, 50)}`);
        continue;  // Skip if can't anchor
      }
      
      const charEnd = charStart + sentence.length;
      const supportingText = canonicalText.substring(charStart, charEnd);
      const fragmentHash = sha256(supportingText);
      
      // Validate
      if (supportingText !== sentence) {
        console.error('Anchor validation failed!');
        continue;
      }
      
      facts.push({
        unit_type: 'fact',
        evidence_type: 'text_extraction',
        clean_text: sentence,
        supporting_text: supportingText,
        evidence_anchor: {
          char_start: charStart,
          char_end: charEnd,
          fragment_hash: fragmentHash,
          extraction_text_hash: extractionTextHash
        },
        anchor_missing: false
      });
    }
  }
  
  return facts;
}
```

### C) Update storage to handle both types

```sql
ALTER TABLE public.croutons 
  ADD COLUMN IF NOT EXISTS evidence_type VARCHAR(50);

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_croutons_evidence_type 
  ON public.croutons(evidence_type);
```

### D) Update QA tier logic

```javascript
function computeQATier(domain) {
  // Count facts BY TYPE
  const textFacts = await pool.query(`
    SELECT COUNT(*) as count
    FROM public.croutons
    WHERE domain = $1 
      AND evidence_type = 'text_extraction'
      AND anchor_missing = false
  `, [domain]);
  
  const metadataFacts = await pool.query(`
    SELECT COUNT(*) as count
    FROM public.croutons
    WHERE domain = $1 
      AND evidence_type = 'structured_data'
  `, [domain]);
  
  // Citation grade requires text_extraction facts with valid anchors
  if (textFacts.rows[0].count >= 5) {
    return 'citation_grade';
  } else if (metadataFacts.rows[0].count > 0) {
    return 'best_effort';
  } else {
    return 'none';
  }
}
```

### E) Update facts stream to separate types

```json
{
  "slot_id": "...",
  "fact_id": "...",
  "evidence_type": "text_extraction",
  "triple": {
    "subject": "...",
    "predicate": "states",
    "object": "AI systems prioritize extractability and trust."
  },
  "supporting_text": "Traditional rankings measure page relevance, while AI systems prioritize extractability and trust.",
  "evidence_anchor": {
    "char_start": 1234,
    "char_end": 1330,
    "fragment_hash": "...",
    "extraction_text_hash": "..."
  }
}
```

vs

```json
{
  "slot_id": "...",
  "fact_id": "...",
  "evidence_type": "structured_data",
  "triple": {
    "subject": "https://nrlc.ai/#org",
    "predicate": "name",
    "object": "Neural Command, LLC"
  },
  "metadata_source": "schema_org",
  "anchor_missing": true
}
```

### F) Create /v1/extract validator endpoint

```javascript
app.get('/v1/extract/:domain', async (req, res) => {
  const { url } = req.query;
  const { domain } = req.params;
  
  // Fetch canonical extraction
  const snapshot = await pool.query(`
    SELECT canonical_extracted_text, extraction_text_hash
    FROM public.html_snapshots
    WHERE domain = $1 AND source_url = $2
  `, [domain, url]);
  
  // Fetch text_extraction facts
  const facts = await pool.query(`
    SELECT slot_id, fact_id, supporting_text, evidence_anchor
    FROM public.croutons
    WHERE domain = $1 
      AND source_url = $2
      AND evidence_type = 'text_extraction'
  `, [domain, url]);
  
  const canonical = snapshot.rows[0].canonical_extracted_text;
  const validation = [];
  
  for (const fact of facts.rows) {
    const { char_start, char_end, fragment_hash } = fact.evidence_anchor;
    const slice = canonical.substring(char_start, char_end);
    const computedHash = sha256(slice);
    
    validation.push({
      slot_id: fact.slot_id,
      fact_id: fact.fact_id,
      pass: slice === fact.supporting_text && computedHash === fragment_hash,
      errors: slice !== fact.supporting_text ? ['slice_mismatch'] : 
              computedHash !== fragment_hash ? ['hash_mismatch'] : []
    });
  }
  
  res.json({
    domain,
    url,
    extraction_text_hash: snapshot.rows[0].extraction_text_hash,
    facts_validated: facts.rows.length,
    validation
  });
});
```

## IMPLEMENTATION STEPS

1. ✅ Add `evidence_type` column + migration
2. ✅ Update extraction to tag fact type
3. ✅ Separate anchoring logic (only for text_extraction)
4. ✅ Update QA tier to count by evidence_type  
5. ✅ Create /v1/extract validator
6. ✅ Re-ingest test domains
7. ✅ Run validation on 5+ facts
8. ✅ Update status endpoint to show separate counts

## ACCEPTANCE CRITERIA

For nrlc.ai:

```bash
# 1. Facts stream shows both types
curl https://precogs.croutons.ai/v1/facts/nrlc.ai.ndjson | jq .evidence_type | sort | uniq -c

# Should show:
#   12 "structured_data"
#   X "text_extraction"  (where X >= 5)

# 2. Validator passes
curl https://precogs.croutons.ai/v1/extract/nrlc.ai?url=https://nrlc.ai | jq '.validation[] | select(.pass == false)'

# Should return EMPTY (all facts pass)

# 3. Status shows citation_grade
curl https://precogs.croutons.ai/v1/status/nrlc.ai | jq '{tier: .qa.tier, text_facts: .counts.text_extraction_facts}'

# Should show:
# {"tier": "citation_grade", "text_facts": 5+}
```
