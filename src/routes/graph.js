// src/routes/graph.js
// C2: Aggregated entity graph endpoint

import { pool } from '../db.js';

/**
 * GET /v1/graph/:domain.jsonld
 * Returns aggregated entity graph with stable @id values
 */
export async function getEntityGraph(req, res) {
  try {
    const domain = req.params.domain.replace('.jsonld', '');
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain required' });
    }
    
    // Check if domain is verified
    const verifiedCheck = await pool.query(
      'SELECT verified_at FROM verified_domains WHERE domain = $1',
      [domain]
    );
    
    if (verifiedCheck.rows.length === 0 || !verifiedCheck.rows[0].verified_at) {
      return res.status(404).json({ error: 'Domain not verified' });
    }
    
    // Get triples for this domain to build entity graph
    const { rows: tripleRows } = await pool.query(
      `SELECT subject, predicate, object, evidence_crouton_id
       FROM triples
       WHERE subject LIKE $1 OR object LIKE $1
       LIMIT 500`,
      [`%${domain}%`]
    );
    
    const baseUrl = `https://${domain}`;
    const graph = {
      '@context': 'https://schema.org',
      '@graph': []
    };
    
    // Build entity registry
    const entities = {};
    
    // Core entities with stable IDs
    const orgId = `${baseUrl}/#org`;
    const websiteId = `${baseUrl}/#website`;
    
    entities[orgId] = {
      '@type': 'Organization',
      '@id': orgId,
      'name': extractValueFromTriples(tripleRows, orgId, 'name'),
      'url': baseUrl,
      'sameAs': extractArrayFromTriples(tripleRows, orgId, 'sameAs'),
      'telephone': extractValueFromTriples(tripleRows, orgId, 'telephone'),
      'email': extractValueFromTriples(tripleRows, orgId, 'email'),
      'address': extractValueFromTriples(tripleRows, orgId, 'address')
    };
    
    entities[websiteId] = {
      '@type': 'WebSite',
      '@id': websiteId,
      'name': extractValueFromTriples(tripleRows, websiteId, 'name') || domain,
      'url': baseUrl,
      'publisher': { '@id': orgId }
    };
    
    // Add entities to graph
    for (const entity of Object.values(entities)) {
      // Remove null/undefined/empty fields
      const cleaned = {};
      for (const [key, value] of Object.entries(entity)) {
        if (value !== null && value !== undefined && value !== '') {
          // Skip empty arrays
          if (Array.isArray(value) && value.length === 0) continue;
          cleaned[key] = value;
        }
      }
      
      // Only add if has more than just @type and @id
      if (Object.keys(cleaned).length > 2) {
        graph['@graph'].push(cleaned);
      }
    }
    
    // Set JSON-LD headers
    res.setHeader('Content-Type', 'application/ld+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.json(graph);
    
  } catch (error) {
    console.error('[graph] Error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Extract single value from triples
 */
function extractValueFromTriples(triples, entityId, predicate) {
  for (const triple of triples) {
    if (triple.subject === entityId && triple.predicate === predicate) {
      return triple.object;
    }
  }
  return null;
}

/**
 * Extract array values from triples (e.g., sameAs links)
 */
function extractArrayFromTriples(triples, entityId, predicate) {
  const values = [];
  for (const triple of triples) {
    if (triple.subject === entityId && triple.predicate === predicate) {
      values.push(triple.object);
    }
  }
  return values.length > 0 ? values : undefined;
}
