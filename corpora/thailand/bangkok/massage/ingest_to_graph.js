#!/usr/bin/env node
/* jshint node: true, esversion: 11 */
/**
 * Ingest Bangkok Massage corpus into Croutons Graph Service
 * 
 * Converts corpus NDJSON files to Factlet format and sends to graph.croutons.ai/api/import
 */

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

// Corpus files to ingest
const CORPUS_FILES = [
  'shops_legit.ndjson',
  'shops_risky.ndjson',
  'pricing_tiers.ndjson',
  'neighborhood_profiles.ndjson',
  'etiquette.ndjson',
  'scam_patterns.ndjson',
  'safety_signals.ndjson',
  'female_safe_spaces.ndjson',
];

/**
 * Generate HMAC signature for NDJSON body
 */
function signHmac(body) {
  const sig = crypto.createHmac('sha256', HMAC_SECRET).update(body).digest('hex');
  return `sha256=${sig}`;
}

/**
 * Convert corpus record to Factlet format
 */
function toFactlet(record, sourceFile) {
  // Generate deterministic fact_id
  const factId = record['@id'] || `https://croutons.ai/factlet/bkk_massage/${crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex').slice(0, 16)}`;
  const pageId = `https://croutons.ai/corpus/bkk_massage/${sourceFile}`;
  
  // Extract text/claim from record - MUST have claim for /v1/streams/ingest
  let claim = '';
  if (record.name) {
    claim = `${record.name}`;
    if (record.district) claim += ` (${record.district})`;
    if (record.address) claim += ` - ${record.address}`;
    if (record.notes) claim += `. ${record.notes}`;
  } else if (record.text) {
    claim = record.text;
  } else if (record.description) {
    claim = record.description;
  } else {
    // Fallback: stringify key fields - ensure we always have a claim
    const parts = [];
    if (record['@type']) parts.push(`Type: ${record['@type']}`);
    if (record.name) parts.push(`Name: ${record.name}`);
    if (record.district) parts.push(`District: ${record.district}`);
    if (record.description) parts.push(record.description);
    claim = parts.join('. ') || `Bangkok Massage: ${JSON.stringify(record).substring(0, 200)}`;
  }
  
  // Ensure claim is not empty (required by endpoint)
  if (!claim || claim.trim().length === 0) {
    claim = `Bangkok Massage data: ${record['@type'] || 'unknown'}`;
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

/**
 * Generate triples from corpus record
 */
function generateTriples(record, factId) {
  const triples = [];
  
  // Shop → District (located_in)
  if (record['@type'] === 'MassageShop' && record.name && record.district) {
    triples.push({
      '@type': 'Triple',
      subject: record.name,
      predicate: 'located_in',
      object: record.district,
      evidence_crouton_id: factId
    });
  }
  
  // Shop → Safety Signals (has_safety_signal)
  if (record['@type'] === 'MassageShop' && record.name && record.strengths && Array.isArray(record.strengths)) {
    for (const signal of record.strengths) {
      triples.push({
        '@type': 'Triple',
        subject: record.name,
        predicate: 'has_safety_signal',
        object: signal,
        evidence_crouton_id: factId
      });
    }
  }
  
  // Shop → Risk Factors (has_risk_factor)
  if (record['@type'] === 'MassageShop' && record.name && record.risk_factors && Array.isArray(record.risk_factors)) {
    for (const risk of record.risk_factors) {
      triples.push({
        '@type': 'Triple',
        subject: record.name,
        predicate: 'has_risk_factor',
        object: risk,
        evidence_crouton_id: factId
      });
    }
  }
  
  // District → Price Tier (has_price_band)
  if (record['@type'] === 'PriceTier' && record.district && record.massage_type) {
    const priceBand = JSON.stringify({
      massage_type: record.massage_type,
      price_low: record.price_low,
      price_high: record.price_high,
      price_typical: record.price_typical,
      currency: record.currency || 'THB'
    });
    triples.push({
      '@type': 'Triple',
      subject: record.district,
      predicate: 'has_price_band',
      object: priceBand,
      evidence_crouton_id: factId
    });
  }
  
  // Female Safe Spaces → Shop (is_verified_safe_for)
  if (record['@type'] === 'FemaleSafeSpace' && record.name && record.verified_safe_female) {
    triples.push({
      '@type': 'Triple',
      subject: record.name,
      predicate: 'is_verified_safe_for',
      object: 'solo_female_travelers',
      evidence_crouton_id: factId
    });
  }
  
  return triples;
}

/**
 * Load and parse NDJSON file
 */
function loadNDJSON(filename) {
  const filepath = join(CORPUS_DIR, filename);
  
  if (!existsSync(filepath)) {
    console.warn(`⚠️  File not found: ${filepath}`);
    return [];
  }
  
  try {
    const content = readFileSync(filepath, 'utf-8');
    const lines = content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.warn(`⚠️  Failed to parse line in ${filename}: ${e.message}`);
          return null;
        }
      })
      .filter(record => record !== null);
    
    console.log(`✅ Loaded ${lines.length} records from ${filename}`);
    return lines;
  } catch (error) {
    console.error(`❌ Failed to load ${filename}: ${error.message}`);
    return [];
  }
}

/**
 * Ingest records to graph service
 */
async function ingestToGraph(factlets, triples, batchName) {
  if (factlets.length === 0 && triples.length === 0) {
    console.log(`⏭️  Skipping ${batchName} (no records)`);
    return { success: true, inserted: 0, triples_inserted: 0 };
  }
  
  // Combine factlets and triples into single NDJSON
  const allRecords = [...factlets, ...triples];
  const ndjson = allRecords.map(r => JSON.stringify(r)).join('\n') + '\n';
  
  // Sign with HMAC
  const signature = signHmac(ndjson);
  
  // Try /api/import first (HMAC), fallback to /v1/streams/ingest (Bearer)
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
        'X-Dataset-Id': 'bkk_massage',
        'X-Site': 'corpus',
      } 
    },
  ];
  
  for (const endpoint of endpoints) {
    console.log(`📤 Sending ${factlets.length} factlets + ${triples.length} triples to ${endpoint.url}...`);
    
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: endpoint.headers,
        body: ndjson,
      });
      
      if (!response.ok) {
        if (endpoints.indexOf(endpoint) < endpoints.length - 1) {
          console.warn(`⚠️  ${endpoint.url} returned ${response.status}, trying next endpoint...`);
          continue; // Try next endpoint
        }
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      const inserted = result.factlets_inserted || result.records_inserted || 0;
      const triplesInserted = result.triples_inserted || result.triples_created || 0;
      console.log(`✅ ${batchName}: ${inserted} factlets + ${triplesInserted} triples inserted`);
      console.log(`   Response: ${JSON.stringify(result).substring(0, 200)}`);
      if (inserted === 0 && factlets.length > 0) {
        console.warn(`⚠️  WARNING: Sent ${factlets.length} factlets but 0 were inserted!`);
        console.warn(`   This might indicate a format issue. Check graph service logs.`);
        console.warn(`   Sample factlet: ${JSON.stringify(factlets[0]).substring(0, 200)}`);
      }
      return result;
    } catch (error) {
      if (endpoints.indexOf(endpoint) < endpoints.length - 1) {
        console.warn(`⚠️  ${endpoint.url} failed: ${error.message}, trying next endpoint...`);
        continue; // Try next endpoint
      }
      console.error(`❌ Failed to ingest ${batchName}: ${error.message}`);
      throw error;
    }
  }
  
  // If we get here, all endpoints failed
  throw new Error(`All endpoints failed for ${batchName}`);
}

/**
 * Main ingestion function
 */
async function main() {
  console.log('=== Bangkok Massage Corpus Ingestion ===\n');
  console.log(`Graph Service: ${GRAPH_BASE}`);
  console.log(`HMAC Secret: ${HMAC_SECRET.substring(0, 8)}...`);
  console.log(`Corpus Directory: ${CORPUS_DIR}\n`);
  
  let totalInserted = 0;
  let totalTriples = 0;
  let totalProcessed = 0;
  
  for (const filename of CORPUS_FILES) {
    console.log(`\n📂 Processing ${filename}...`);
    
    // Load records
    const records = loadNDJSON(filename);
    if (records.length === 0) continue;
    
    // Convert to factlets and generate triples
    const factlets = [];
    const triples = [];
    
    for (const record of records) {
      const factlet = toFactlet(record, filename);
      factlets.push(factlet);
      
      // Generate triples from this record
      const recordTriples = generateTriples(record, factlet.fact_id);
      triples.push(...recordTriples);
    }
    
    totalProcessed += factlets.length;
    totalTriples += triples.length;
    
    // Ingest to graph (both factlets and triples)
    try {
      const result = await ingestToGraph(factlets, triples, filename);
      totalInserted += (result.factlets_inserted || result.records_inserted || 0);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Failed to ingest ${filename}: ${error.message}`);
      // Continue with other files
    }
  }
  
  console.log('\n=== Ingestion Complete ===');
  console.log(`Total processed: ${totalProcessed} records`);
  console.log(`Total inserted: ${totalInserted} factlets`);
  console.log(`Total triples generated: ${totalTriples}`);
  console.log(`\n✅ Check dashboard: ${GRAPH_BASE}/dashboard.html`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { main, toFactlet, generateTriples, signHmac };

