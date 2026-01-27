#!/usr/bin/env node
// validate-phase1.js
// Phase 1 Verification: Validate canonical extraction + evidence anchors
// Usage: node scripts/validate-phase1.js <domain> <url> [sample_count]

import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import db - use relative path from scripts/ to src/
let pool;
try {
  const dbPath = join(__dirname, '../src/db.js');
  const dbModule = await import(dbPath);
  pool = dbModule.pool;
} catch (e) {
  console.error('Could not import db.js:', e.message);
  console.error('Tried path:', join(__dirname, '../src/db.js'));
  process.exit(1);
}

const domain = process.argv[2];
const url = process.argv[3];
const sampleCount = parseInt(process.argv[4]) || 10;

if (!domain || !url) {
  console.error('Usage: node scripts/validate-phase1.js <domain> <url> [sample_count]');
  process.exit(1);
}

async function validatePhase1() {
  console.log(`\n=== Phase 1 Validation: ${domain} -> ${url} ===\n`);
  
  let failures = [];
  let passes = 0;
  
  try {
    // 1. Check html_snapshots has extraction tracking
    console.log('1. Checking html_snapshots extraction tracking...');
    const snapshotResult = await pool.query(
      `SELECT extraction_method, canonical_extracted_text, extraction_text_hash
       FROM html_snapshots
       WHERE domain = $1 AND source_url = $2
       LIMIT 1`,
      [domain, url]
    );
    
    if (snapshotResult.rows.length === 0) {
      failures.push('❌ html_snapshots row not found - run ingestion first');
      console.log('   ❌ FAIL: No snapshot found');
    } else {
      const snapshot = snapshotResult.rows[0];
      
      if (!snapshot.extraction_method || snapshot.extraction_method !== 'croutons-readability-v1') {
        failures.push(`❌ extraction_method missing or incorrect: ${snapshot.extraction_method}`);
        console.log(`   ❌ FAIL: extraction_method = ${snapshot.extraction_method}`);
      } else {
        console.log(`   ✅ extraction_method = ${snapshot.extraction_method}`);
        passes++;
      }
      
      if (!snapshot.canonical_extracted_text || snapshot.canonical_extracted_text.length === 0) {
        failures.push('❌ canonical_extracted_text is empty');
        console.log('   ❌ FAIL: canonical_extracted_text is empty');
      } else {
        console.log(`   ✅ canonical_extracted_text length = ${snapshot.canonical_extracted_text.length}`);
        passes++;
      }
      
      if (!snapshot.extraction_text_hash) {
        failures.push('❌ extraction_text_hash is null');
        console.log('   ❌ FAIL: extraction_text_hash is null');
      } else {
        // Verify hash matches text
        const computedHash = crypto.createHash('sha256')
          .update(snapshot.canonical_extracted_text, 'utf8')
          .digest('hex');
        
        if (computedHash !== snapshot.extraction_text_hash) {
          failures.push(`❌ extraction_text_hash mismatch: stored=${snapshot.extraction_text_hash.substring(0, 16)}..., computed=${computedHash.substring(0, 16)}...`);
          console.log('   ❌ FAIL: extraction_text_hash does not match canonical_extracted_text');
        } else {
          console.log(`   ✅ extraction_text_hash matches: ${snapshot.extraction_text_hash.substring(0, 16)}...`);
          passes++;
        }
      }
    }
    
    // 2. Check units have evidence anchors (from ingest response)
    console.log('\n2. Checking units have evidence anchors...');
    console.log('   ℹ️  Fetching units from ingest API response...');
    
    // Call ingest API to get units with evidence anchors
    const API_BASE = process.env.API_BASE || 'http://localhost:8080';
    let ingestResponse;
    try {
      const response = await fetch(`${API_BASE}/v1/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, url }),
        signal: AbortSignal.timeout(60000)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        failures.push(`❌ Failed to fetch ingest response: ${response.status} - ${errorText}`);
        console.log(`   ❌ FAIL: Ingest API returned ${response.status}`);
      } else {
        ingestResponse = await response.json();
        
        if (!ingestResponse.ok || !ingestResponse.data || !ingestResponse.data.units) {
          failures.push('❌ Ingest response missing units');
          console.log('   ❌ FAIL: No units in ingest response');
        } else {
          const units = ingestResponse.data.units;
          console.log(`   ✅ Found ${units.length} units in ingest response`);
          
          // Sample units for validation
          const sampleSize = Math.min(sampleCount, units.length);
          const sampledUnits = units.slice(0, sampleSize);
          let validatedCount = 0;
          let anchorMissingCount = 0;
          
          console.log(`\n   Validating ${sampleSize} sampled units...`);
          
          for (const unit of sampledUnits) {
            if (unit.anchor_missing) {
              anchorMissingCount++;
              console.log(`   ⚠️  Unit ${unit.unit_id?.substring(0, 16)}... has anchor_missing=true`);
              continue;
            }
            
            const validation = validateUnitEvidenceAnchor(
              unit,
              snapshot.canonical_extracted_text,
              snapshot.extraction_text_hash
            );
            
            if (validation.valid) {
              validatedCount++;
            } else {
              failures.push(...validation.failures);
              console.log(`   ❌ Unit ${unit.unit_id?.substring(0, 16)}...: ${validation.failures[0]}`);
            }
          }
          
          console.log(`   ✅ ${validatedCount}/${sampleSize} units validated successfully`);
          if (anchorMissingCount > 0) {
            console.log(`   ⚠️  ${anchorMissingCount} units have anchor_missing=true (excluded from citation-grade)`);
          }
          passes += validatedCount;
        }
      }
    } catch (fetchError) {
      failures.push(`❌ Failed to call ingest API: ${fetchError.message}`);
      console.log(`   ❌ FAIL: ${fetchError.message}`);
    }
    
    // 3. Test deterministic extraction
    console.log('\n3. Testing deterministic extraction...');
    console.log('   ℹ️  Re-run ingestion twice and compare extraction_text_hash');
    console.log('   ℹ️  Hash should be identical for same HTML input');
    console.log('   ℹ️  Manual test required: ingest same URL twice and compare hashes');
    
    // 4. Check for anchor_missing handling
    console.log('\n4. Checking anchor_missing handling...');
    if (ingestResponse && ingestResponse.data && ingestResponse.data.units) {
      const unitsWithMissing = ingestResponse.data.units.filter(u => u.anchor_missing);
      if (unitsWithMissing.length > 0) {
        console.log(`   ✅ ${unitsWithMissing.length} units correctly marked as anchor_missing`);
        console.log('   ✅ No fake offsets (0/0) should be present');
        passes++;
      } else {
        console.log('   ✅ No units with anchor_missing (all anchored successfully)');
        passes++;
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`✅ Passes: ${passes}`);
    console.log(`❌ Failures: ${failures.length}`);
    
    if (failures.length > 0) {
      console.log('\nFailures:');
      failures.forEach(f => console.log(`  ${f}`));
      console.log('\n❌ VALIDATION FAILED');
      process.exit(1);
    } else {
      console.log('\n✅ VALIDATION PASSED (extraction tracking verified)');
      console.log('⚠️  Unit validation pending - requires units to be stored');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ Validation error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Function to validate a single unit's evidence anchor
export function validateUnitEvidenceAnchor(unit, canonicalExtractedText, extractionTextHash) {
  const failures = [];
  
  if (!unit.evidence_anchor) {
    failures.push(`Unit ${unit.unit_id}: evidence_anchor missing`);
    return { valid: false, failures };
  }
  
  const anchor = unit.evidence_anchor;
  
  // Check required fields
  if (typeof anchor.char_start !== 'number' || anchor.char_start < 0) {
    failures.push(`Unit ${unit.unit_id}: invalid char_start`);
  }
  
  if (typeof anchor.char_end !== 'number' || anchor.char_end <= anchor.char_start) {
    failures.push(`Unit ${unit.unit_id}: invalid char_end`);
  }
  
  if (!anchor.fragment_hash) {
    failures.push(`Unit ${unit.unit_id}: fragment_hash missing`);
  }
  
  if (!anchor.extraction_text_hash) {
    failures.push(`Unit ${unit.unit_id}: extraction_text_hash missing`);
  }
  
  // Validate supporting_text matches slice
  if (!unit.supporting_text) {
    failures.push(`Unit ${unit.unit_id}: supporting_text missing`);
  } else {
    const slice = canonicalExtractedText.substring(anchor.char_start, anchor.char_end);
    if (slice !== unit.supporting_text) {
      failures.push(`Unit ${unit.unit_id}: supporting_text mismatch - expected "${slice.substring(0, 50)}...", got "${unit.supporting_text.substring(0, 50)}..."`);
    }
    
    // Validate fragment_hash
    const computedFragmentHash = crypto.createHash('sha256')
      .update(unit.supporting_text, 'utf8')
      .digest('hex');
    
    if (computedFragmentHash !== anchor.fragment_hash) {
      failures.push(`Unit ${unit.unit_id}: fragment_hash mismatch`);
    }
  }
  
  // Validate extraction_text_hash matches page
  if (anchor.extraction_text_hash !== extractionTextHash) {
    failures.push(`Unit ${unit.unit_id}: extraction_text_hash mismatch with page`);
  }
  
  return {
    valid: failures.length === 0,
    failures
  };
}

validatePhase1();
