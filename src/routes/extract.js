// src/routes/extract.js
// PHASE E: Extraction validation endpoint
// GET /v1/extract/:domain?url=... - Returns canonical extraction + validates text_extraction facts

import crypto from 'crypto';
import { pool } from '../db.js';

/**
 * GET /v1/extract/:domain?url=...
 * Returns canonical extracted text and validates all text_extraction facts
 */
export async function getExtract(req, res) {
  try {
    const { domain } = req.params;
    const { url } = req.query;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain required' });
    }
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter required' });
    }
    
    // Validate URL format
    let canonicalUrl;
    try {
      canonicalUrl = new URL(url).href;
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // 1. Check if domain is verified
    const verifiedQuery = await pool.query(
      `SELECT verified_at FROM verified_domains WHERE domain = $1`,
      [domain]
    );
    
    const isVerified = verifiedQuery.rows.length > 0 && verifiedQuery.rows[0].verified_at !== null;
    
    if (!isVerified) {
      return res.status(403).json({
        error: 'Domain not verified',
        domain,
        message: 'Only verified domains can access extraction validation'
      });
    }
    
    // 2. Get canonical extracted text from html_snapshots
    const snapshotQuery = await pool.query(
      `SELECT 
        extraction_method,
        canonical_extracted_text,
        extraction_text_hash,
        fetched_at
      FROM html_snapshots
      WHERE domain = $1 AND source_url = $2`,
      [domain, canonicalUrl]
    );
    
    if (snapshotQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Page not found',
        domain,
        url: canonicalUrl,
        message: 'No extraction data found for this URL. Please ingest the page first.'
      });
    }
    
    const snapshot = snapshotQuery.rows[0];
    const canonicalExtractedText = snapshot.canonical_extracted_text || '';
    const extractionTextHash = snapshot.extraction_text_hash;
    const extractionMethod = snapshot.extraction_method;
    
    // 3. Get all text_extraction facts for this URL
    const factsQuery = await pool.query(
      `SELECT 
        fact_id,
        slot_id,
        supporting_text,
        evidence_anchor,
        triple
      FROM public.croutons
      WHERE domain = $1 
        AND source_url = $2 
        AND evidence_type = 'text_extraction'
      ORDER BY fact_id`,
      [domain, canonicalUrl]
    );
    
    const facts = factsQuery.rows;
    
    // 4. Validate each fact's anchor
    const validationResults = [];
    let factsValidated = 0;
    let factsPassed = 0;
    let factsFailed = 0;
    
    for (const fact of facts) {
      factsValidated++;
      
      const evidenceAnchor = typeof fact.evidence_anchor === 'object' 
        ? fact.evidence_anchor 
        : JSON.parse(fact.evidence_anchor || 'null');
      
      if (!evidenceAnchor) {
        validationResults.push({
          fact_id: fact.fact_id,
          slot_id: fact.slot_id,
          passed: false,
          error: 'No evidence anchor',
          supporting_text_length: fact.supporting_text?.length || 0
        });
        factsFailed++;
        continue;
      }
      
      const { char_start, char_end, fragment_hash, extraction_text_hash: anchorHash } = evidenceAnchor;
      
      // Validation 1: Check extraction_text_hash matches
      if (anchorHash !== extractionTextHash) {
        validationResults.push({
          fact_id: fact.fact_id,
          slot_id: fact.slot_id,
          passed: false,
          error: 'Extraction text hash mismatch',
          expected_hash: extractionTextHash,
          actual_hash: anchorHash
        });
        factsFailed++;
        continue;
      }
      
      // Validation 2: Check char offsets are valid
      if (char_start < 0 || char_end > canonicalExtractedText.length || char_start >= char_end) {
        validationResults.push({
          fact_id: fact.fact_id,
          slot_id: fact.slot_id,
          passed: false,
          error: 'Invalid char offsets',
          char_start,
          char_end,
          text_length: canonicalExtractedText.length
        });
        factsFailed++;
        continue;
      }
      
      // Validation 3: Extract slice and compare to supporting_text
      const slice = canonicalExtractedText.substring(char_start, char_end);
      const sliceMatches = slice === fact.supporting_text;
      
      if (!sliceMatches) {
        validationResults.push({
          fact_id: fact.fact_id,
          slot_id: fact.slot_id,
          passed: false,
          error: 'Slice mismatch',
          expected: fact.supporting_text.substring(0, 100) + (fact.supporting_text.length > 100 ? '...' : ''),
          actual: slice.substring(0, 100) + (slice.length > 100 ? '...' : '')
        });
        factsFailed++;
        continue;
      }
      
      // Validation 4: Verify fragment_hash
      const computedFragmentHash = crypto.createHash('sha256')
        .update(slice, 'utf8')
        .digest('hex');
      
      const hashMatches = computedFragmentHash === fragment_hash;
      
      if (!hashMatches) {
        validationResults.push({
          fact_id: fact.fact_id,
          slot_id: fact.slot_id,
          passed: false,
          error: 'Fragment hash mismatch',
          expected_hash: fragment_hash,
          computed_hash: computedFragmentHash
        });
        factsFailed++;
        continue;
      }
      
      // All validations passed
      validationResults.push({
        fact_id: fact.fact_id,
        slot_id: fact.slot_id,
        passed: true,
        char_start,
        char_end,
        supporting_text_length: fact.supporting_text?.length || 0
      });
      factsPassed++;
    }
    
    // Build failure summary for dashboard (schema-stable, always returns array)
    const failedResults = validationResults.filter(r => !r.passed);
    const firstFailedFact = failedResults[0] || null;
    const failureExamples = failedResults.slice(0, 3).map(f => ({
      slot_id: f.slot_id ?? null,
      fact_id: f.fact_id ?? null,
      reason: f.error ?? f.reason ?? 'validation_failed',
      char_start: f.char_start ?? null,
      char_end: f.char_end ?? null,
      expected_fragment_hash: f.expected_hash ?? f.fragment_hash ?? null,
      actual_fragment_hash: f.computed_hash ?? f.computed_fragment_hash ?? null
    }));
    
    // 5. Build response
    const passRate = factsValidated > 0 ? factsPassed / factsValidated : 0;
    
    res.json({
      domain,
      source_url: canonicalUrl,
      extraction_method: extractionMethod,
      extraction_text_hash: extractionTextHash,
      canonical_text_length: canonicalExtractedText.length,
      fetched_at: snapshot.fetched_at,
      validation: {
        facts_validated: factsValidated,
        facts_passed: factsPassed,
        facts_failed: factsFailed,
        pass_rate: passRate,
        citation_grade: passRate >= 0.95 && factsPassed >= 10,
        first_failed_fact: firstFailedFact,
        failed_examples: failureExamples
      },
      // Only include validation results if there are failures (for debugging)
      validation_results: factsFailed > 0 ? validationResults.filter(r => !r.passed) : undefined,
      // Optional: return excerpt of canonical text (not full text to keep response size manageable)
      canonical_text_excerpt: canonicalExtractedText.substring(0, 500) + (canonicalExtractedText.length > 500 ? '...' : '')
    });
    
  } catch (error) {
    console.error('[extract] Error:', error);
    res.status(500).json({ error: error.message });
  }
}
