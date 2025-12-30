# Ingestion Scaffold - Step-by-Step Guide

## Overview

This document provides a step-by-step scaffold for ingesting data into Croutons, from raw sources to LLM-accessible knowledge.

## Step 1: Prepare Data Source

### Option A: Corpus Files (NDJSON)

**Location:** `/corpora/{domain}/{subdomain}/{topic}/`

**Format:** One factlet per line (NDJSON)

**Example:**
```json
{"@type":"MassageShop","name":"Health Land Asok","district":"Asok","address":"55/5 Sukhumvit 21 Road","price_traditional":400,"legit":true}
{"@type":"MassageShop","name":"Let's Relax Asok","district":"Asok","address":"Sukhumvit 19","price_traditional":450,"legit":true}
```

**Required Fields:**
- `@type`: Entity type (e.g., "MassageShop", "PriceTier")
- `name`: Entity name (or equivalent identifier)

**Optional Fields:**
- Any domain-specific fields (district, price, etc.)

### Option B: External NDJSON Feed

**Format:** Same as corpus files, but hosted externally

**Example URLs:**
- `https://ourcasa.ai/sitemaps/sitemap-ai.ndjson`
- `https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson`

**Requirements:**
- Must be publicly accessible
- Must return valid NDJSON
- Should include `@id` or `@type` fields

### Option C: Manual Factlets

**Format:** Direct Factlet creation

```json
{
  "@type": "Factlet",
  "fact_id": "https://croutons.ai/factlet/domain/unique-id",
  "page_id": "https://source.url/page",
  "claim": "The actual fact or claim text",
  "text": "Same as claim"
}
```

## Step 2: Create Ingestion Script

### Template: `ingest_to_graph.js`

```javascript
#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const GRAPH_BASE = process.env.GRAPH_BASE || 'https://graph.croutons.ai';
const HMAC_SECRET = process.env.PUBLISH_HMAC_KEY || process.env.HMAC_SECRET || 'dev-secret';
const CORPUS_DIR = __dirname;

// Files to ingest
const CORPUS_FILES = [
  'file1.ndjson',
  'file2.ndjson',
];

// Convert record to Factlet
function toFactlet(record, sourceFile) {
  const factId = record['@id'] || `https://croutons.ai/factlet/domain/${crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex').slice(0, 16)}`;
  const pageId = `https://croutons.ai/corpus/domain/${sourceFile}`;
  
  let claim = '';
  if (record.name) {
    claim = `${record.name}`;
    if (record.description) claim += ` - ${record.description}`;
  } else if (record.text) {
    claim = record.text;
  } else {
    claim = JSON.stringify(record).substring(0, 200);
  }
  
  return {
    '@type': 'Factlet',
    fact_id: factId,
    '@id': factId,
    page_id: pageId,
    passage_id: factId,
    claim: claim.trim(),
    text: claim.trim(),
  };
}

// Generate triples from record
function generateTriples(record, factId) {
  const triples = [];
  
  // Add your triple generation logic here
  // Example: if (record.name && record.district) {
  //   triples.push({
  //     '@type': 'Triple',
  //     subject: record.name,
  //     predicate: 'located_in',
  //     object: record.district,
  //     evidence_crouton_id: factId
  //   });
  // }
  
  return triples;
}

// Load NDJSON file
function loadNDJSON(filename) {
  const filepath = join(CORPUS_DIR, filename);
  if (!existsSync(filepath)) {
    console.warn(`⚠️  File not found: ${filepath}`);
    return [];
  }
  
  const content = readFileSync(filepath, 'utf-8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.warn(`⚠️  Failed to parse line: ${e.message}`);
        return null;
      }
    })
    .filter(record => record !== null);
}

// Sign HMAC
function signHmac(body) {
  const sig = crypto.createHmac('sha256', HMAC_SECRET).update(body).digest('hex');
  return `sha256=${sig}`;
}

// Ingest to graph
async function ingestToGraph(factlets, triples, batchName) {
  if (factlets.length === 0 && triples.length === 0) {
    return { success: true, inserted: 0, triples_inserted: 0 };
  }
  
  const allRecords = [...factlets, ...triples];
  const ndjson = allRecords.map(r => JSON.stringify(r)).join('\n') + '\n';
  const signature = signHmac(ndjson);
  
  const endpoints = [
    { 
      url: `${GRAPH_BASE}/api/import`, 
      headers: { 'Content-Type': 'application/x-ndjson', 'X-Signature': signature } 
    },
    { 
      url: `${GRAPH_BASE}/v1/streams/ingest`, 
      headers: { 
        'Content-Type': 'application/x-ndjson', 
        'Authorization': `Bearer ${HMAC_SECRET}`,
        'X-Dataset-Id': 'your_corpus_id',
        'X-Site': 'corpus',
      } 
    },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: endpoint.headers,
        body: ndjson,
      });
      
      if (!response.ok) {
        if (endpoints.indexOf(endpoint) < endpoints.length - 1) {
          console.warn(`⚠️  ${endpoint.url} returned ${response.status}, trying next...`);
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      const result = await response.json();
      const inserted = result.factlets_inserted || result.records_inserted || 0;
      const triplesInserted = result.triples_inserted || result.triples_created || 0;
      console.log(`✅ ${batchName}: ${inserted} factlets + ${triplesInserted} triples`);
      return result;
    } catch (error) {
      if (endpoints.indexOf(endpoint) < endpoints.length - 1) {
        continue;
      }
      throw error;
    }
  }
}

// Main
async function main() {
  console.log('=== Ingestion ===\n');
  
  for (const filename of CORPUS_FILES) {
    const records = loadNDJSON(filename);
    if (records.length === 0) continue;
    
    const factlets = [];
    const triples = [];
    
    for (const record of records) {
      const factlet = toFactlet(record, filename);
      factlets.push(factlet);
      
      const recordTriples = generateTriples(record, factlet.fact_id);
      triples.push(...recordTriples);
    }
    
    await ingestToGraph(factlets, triples, filename);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

main().catch(console.error);
```

## Step 3: Generate Triples

### Triple Generation Rules

**Rule 1: Entity → Location**
```javascript
if (record.name && record.district) {
  triples.push({
    '@type': 'Triple',
    subject: record.name,
    predicate: 'located_in',
    object: record.district,
    evidence_crouton_id: factId
  });
}
```

**Rule 2: Entity → Attributes**
```javascript
if (record.name && record.strengths) {
  for (const strength of record.strengths) {
    triples.push({
      '@type': 'Triple',
      subject: record.name,
      predicate: 'has_safety_signal',
      object: strength,
      evidence_crouton_id: factId
    });
  }
}
```

**Rule 3: Domain → Vertical**
```javascript
if (source.domain && source.vertical) {
  triples.push({
    '@type': 'Triple',
    subject: source.domain,
    predicate: 'serves_vertical',
    object: source.vertical,
    evidence_crouton_id: factId
  });
}
```

## Step 4: Run Ingestion

```bash
# Set environment variables
export GRAPH_BASE="https://graph.croutons.ai"
export PUBLISH_HMAC_KEY="your-key-from-railway"

# Run ingestion
node ingest_to_graph.js
```

## Step 5: Verify Ingestion

```bash
# Check dashboard
open https://graph.croutons.ai/dashboard.html

# Query via API
curl "https://graph.croutons.ai/api/query?q=YOUR_QUERY&corpus=YOUR_CORPUS&limit=10"

# Check stats
curl "https://graph.croutons.ai/diag/stats"
```

## Step 6: Make Available to Precogs

### Option A: Precog Loads Corpus Directly

```javascript
// In precog worker (e.g., bkkMassagePrecog.js)
function loadCorpusShops(district = null) {
  const corpusPath = join(__dirname, '../../corpora/thailand/bangkok/massage/shops_legit.ndjson');
  const content = readFileSync(corpusPath, 'utf-8');
  const shops = content.split('\n').filter(l => l.trim()).map(JSON.parse);
  return district ? shops.filter(s => s.district === district) : shops;
}
```

### Option B: Precog Queries Graph API

```javascript
// In precog worker
async function queryGraph(query, corpus) {
  const response = await fetch(`https://graph.croutons.ai/api/query?q=${encodeURIComponent(query)}&corpus=${corpus}`);
  const data = await response.json();
  return data.results;
}
```

## Step 7: Expose to LLMs

### Add GPT Function

1. **Create function definition:**
   - See `/precogs/precogs-api/src/functions/query_croutons_graph.js`

2. **Add to GPT configuration:**
   - Copy function schema
   - Set API endpoint: `https://graph.croutons.ai/api/query`

3. **Update system prompt:**
   - Guide when to use `query_croutons_graph`
   - Provide examples

### Direct API Access

LLMs can call directly:
```bash
curl "https://graph.croutons.ai/api/query?q=YOUR_QUERY&corpus=YOUR_CORPUS"
```

## Checklist

- [ ] Data source prepared (NDJSON format)
- [ ] Ingestion script created
- [ ] Triple generation logic implemented
- [ ] HMAC secret configured
- [ ] Ingestion script tested locally
- [ ] Data ingested successfully
- [ ] Verified in dashboard
- [ ] Precog can access data (corpus files or API)
- [ ] LLM function created (if needed)
- [ ] Documentation updated

## Common Patterns

### Pattern 1: Simple Factlet (No Triples)
```javascript
// Just convert to factlet, no relationships
const factlet = toFactlet(record, filename);
factlets.push(factlet);
// No triples generated
```

### Pattern 2: Factlet + Relationships
```javascript
// Convert to factlet AND generate triples
const factlet = toFactlet(record, filename);
factlets.push(factlet);
const triples = generateTriples(record, factlet.fact_id);
allTriples.push(...triples);
```

### Pattern 3: External Feed
```javascript
// Fetch from external URL
const response = await fetch('https://example.com/feed.ndjson');
const text = await response.text();
const records = text.split('\n').filter(l => l.trim()).map(JSON.parse);
// Then process same as corpus files
```

## Troubleshooting

**Issue: 0 factlets inserted**
- Check `claim` field is not empty
- Verify `fact_id` is unique
- Check graph service logs

**Issue: Triples not showing in graph**
- Verify triples are being generated
- Check triple format (subject, predicate, object required)
- Ensure `evidence_crouton_id` matches a factlet's `fact_id`

**Issue: Precog can't find corpus**
- Check file paths in precog worker
- Verify corpus files are in deployment
- Use absolute paths or environment variables

**Issue: LLM can't query**
- Verify `/api/query` endpoint is deployed
- Check function definition is correct
- Test endpoint directly with curl

