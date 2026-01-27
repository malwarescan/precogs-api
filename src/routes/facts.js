// src/routes/facts.js
// E1: NDJSON facts stream endpoint for guaranteed citeability

import crypto from 'crypto';
import { pool } from '../db.js';

/**
 * Generate stable fact ID from components
 * fact_id = sha256(domain + '|' + source_url + '|' + entity_id + '|' + predicate + '|' + normalized_object)
 */
function generateFactId(domain, sourceUrl, entityId, predicate, object) {
  const normalized = String(object).trim().replace(/\s+/g, ' ');
  const components = `${domain}|${sourceUrl}|${entityId}|${predicate}|${normalized}`;
  return crypto.createHash('sha256').update(components).digest('hex');
}

/**
 * GET /v1/facts/:domain.ndjson
 * Returns all facts for a domain in spec-compliant NDJSON format
 */
export async function getFactsStream(req, res) {
  try {
    const domain = req.params.domain.replace('.ndjson', '');
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain required' });
    }
    
    // Query croutons for this domain
    const { rows } = await pool.query(
      `SELECT 
        crouton_id,
        source_url,
        text,
        triple,
        confidence,
        created_at,
        verified_at
      FROM croutons
      WHERE source_url LIKE $1
      ORDER BY created_at DESC
      LIMIT 1000`,
      [`%${domain}%`]
    );
    
    // Set NDJSON headers
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Generate entity ID for this domain
    const baseEntityId = `https://${domain}/#org`;
    
    // Stream facts
    for (const row of rows) {
      let fact;
      
      // If we have a triple, use it
      if (row.triple && typeof row.triple === 'object') {
        const { subject, predicate, object } = row.triple;
        
        fact = {
          fact_id: generateFactId(domain, row.source_url, subject, predicate, object),
          entity_id: subject || baseEntityId,
          predicate: predicate || 'states',
          object: object,
          source_url: row.source_url,
          supporting_text: row.text || object,
          updated_at: row.verified_at || row.created_at,
          confidence: row.confidence,
          crouton_id: row.crouton_id
        };
      } else {
        // Fall back to text-based fact
        fact = {
          fact_id: generateFactId(domain, row.source_url, baseEntityId, 'states', row.text),
          entity_id: baseEntityId,
          predicate: 'states',
          object: row.text,
          source_url: row.source_url,
          supporting_text: row.text,
          updated_at: row.verified_at || row.created_at,
          confidence: row.confidence,
          crouton_id: row.crouton_id
        };
      }
      
      // Write NDJSON line
      res.write(JSON.stringify(fact) + '\n');
    }
    
    res.end();
    
  } catch (error) {
    console.error('[facts] Error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /v1/facts.ndjson (all domains)
 * Returns all facts in spec-compliant NDJSON format
 */
export async function getAllFactsStream(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 1000;
    
    // Query croutons
    const { rows } = await pool.query(
      `SELECT 
        crouton_id,
        source_url,
        text,
        triple,
        confidence,
        created_at,
        verified_at
      FROM croutons
      ORDER BY created_at DESC
      LIMIT $1`,
      [limit]
    );
    
    // Set NDJSON headers
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Stream facts
    for (const row of rows) {
      try {
        const sourceUrl = new URL(row.source_url);
        const domain = sourceUrl.hostname;
        const baseEntityId = `https://${domain}/#org`;
        
        let fact;
        
        if (row.triple && typeof row.triple === 'object') {
          const { subject, predicate, object } = row.triple;
          
          fact = {
            fact_id: generateFactId(domain, row.source_url, subject, predicate, object),
            entity_id: subject || baseEntityId,
            predicate: predicate || 'states',
            object: object,
            source_url: row.source_url,
            supporting_text: row.text || object,
            updated_at: row.verified_at || row.created_at,
            confidence: row.confidence,
            crouton_id: row.crouton_id
          };
        } else {
          fact = {
            fact_id: generateFactId(domain, row.source_url, baseEntityId, 'states', row.text),
            entity_id: baseEntityId,
            predicate: 'states',
            object: row.text,
            source_url: row.source_url,
            supporting_text: row.text,
            updated_at: row.verified_at || row.created_at,
            confidence: row.confidence,
            crouton_id: row.crouton_id
          };
        }
        
        res.write(JSON.stringify(fact) + '\n');
      } catch (e) {
        // Skip malformed URLs
        continue;
      }
    }
    
    res.end();
    
  } catch (error) {
    console.error('[facts-all] Error:', error);
    res.status(500).json({ error: error.message });
  }
}
