// src/routes/ingest.js
// Single-URL ingestion with SINR-aligned retrieval substrate generation

import crypto from 'crypto';
import { pool } from '../db.js';

// Generate deterministic ID from components
function generateId(...components) {
  const combined = components.join('|');
  return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
}

// Extract JSON-LD structured data from HTML
function extractJSONLD(html) {
  const schemas = [];
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      schemas.push(parsed);
    } catch (e) {
      // Skip invalid JSON
    }
  }
  return schemas;
}

// Extract meta tags for LLM context
function extractMetaTags(html) {
  const meta = {
    description: '',
    keywords: '',
    author: '',
    og: {},
    twitter: {}
  };

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (descMatch) meta.description = descMatch[1].trim();

  const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
  if (keywordsMatch) meta.keywords = keywordsMatch[1].trim();

  const authorMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i);
  if (authorMatch) meta.author = authorMatch[1].trim();

  const ogRegex = /<meta[^>]*property=["']og:(\w+)["'][^>]*content=["']([^"']+)["']/gi;
  let ogMatch;
  while ((ogMatch = ogRegex.exec(html)) !== null) {
    meta.og[ogMatch[1]] = ogMatch[2].trim();
  }

  const twitterRegex = /<meta[^>]*name=["']twitter:(\w+)["'][^>]*content=["']([^"']+)["']/gi;
  let twitterMatch;
  while ((twitterMatch = twitterRegex.exec(html)) !== null) {
    meta.twitter[twitterMatch[1]] = twitterMatch[2].trim();
  }

  return meta;
}

// Extract links for boilerplate detection
function extractLinkTexts(html) {
  const linkTexts = new Set();
  const linkRegex = /<a[^>]*>(.*?)<\/a>/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const text = linkMatch[1].replace(/<[^>]*>/g, '').trim();
    if (text && text.length < 100) {
      linkTexts.add(text.toLowerCase());
    }
  }
  return linkTexts;
}

// Detect and remove boilerplate (nav, CTAs, repeated marketing)
function removeBoilerplate(text, linkTexts) {
  if (!text) return '';
  
  // Common CTA patterns
  const ctaPatterns = [
    /^Book Consultation/i,
    /^Start Learning/i,
    /^Learn More/i,
    /^Get Started/i,
    /^View Services/i,
    /^Contact$/i
  ];
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => {
    // Remove empty lines
    if (!line) return false;
    
    // Remove short lines that match link text (likely nav)
    if (line.length < 60 && linkTexts.has(line.toLowerCase())) {
      return false;
    }
    
    // Remove CTA patterns
    if (ctaPatterns.some(pattern => pattern.test(line))) {
      return false;
    }
    
    // Remove lines that are just punctuation or symbols
    if (/^[^\w\s]+$/.test(line)) {
      return false;
    }
    
    return true;
  });
  
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Extract sections from HTML using heading hierarchy
function extractSections(html, url, docId) {
  const sections = [];
  
  // Extract all headings with their positions
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      text: match[2].replace(/<[^>]*>/g, '').trim(),
      position: match.index,
      fullMatch: match[0]
    });
  }
  
  if (headings.length === 0) {
    // No headings, create one section from body
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      const cleanText = removeBoilerplate(
        bodyMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        new Set()
      );
      if (cleanText.length > 100) {
        sections.push({
          section_id: generateId(url, 'section', 0),
          doc_id: docId,
          url,
          section_path: 'Document',
          heading_text: '',
          heading_level: 0,
          char_start: 0,
          char_end: cleanText.length,
          clean_text: cleanText,
          prev_section_id: null,
          next_section_id: null
        });
      }
    }
    return sections;
  }
  
  // Build section path hierarchy
  const pathStack = [];
  
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = headings[i + 1];
    
    // Update path stack based on heading level
    while (pathStack.length > 0 && pathStack[pathStack.length - 1].level >= heading.level) {
      pathStack.pop();
    }
    pathStack.push({ level: heading.level, text: heading.text });
    
    const sectionPath = pathStack.map(h => h.text).join(' > ');
    
    // Find text between this heading and next (or end)
    const startPos = heading.position + heading.fullMatch.length;
    const endPos = nextHeading ? nextHeading.position : html.length;
    const sectionHtml = html.substring(startPos, endPos);
    
    // Clean and extract text
    let cleanText = sectionHtml
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<nav[^>]*>.*?<\/nav>/gis, '')
      .replace(/<footer[^>]*>.*?<\/footer>/gis, '')
      .replace(/<aside[^>]*>.*?<\/aside>/gis, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove boilerplate
    const linkTexts = extractLinkTexts(sectionHtml);
    cleanText = removeBoilerplate(cleanText, linkTexts);
    
    if (cleanText.length < 100) continue; // Skip very short sections
    
    // Split long sections into windows (600-1000 tokens ≈ 2400-4000 chars)
    const maxSectionLength = 3000;
    let windowIndex = 0;
    let remainingText = cleanText;
    
    while (remainingText.length > 0) {
      const windowText = remainingText.substring(0, maxSectionLength);
      const sectionId = generateId(url, sectionPath, windowIndex);
      
      sections.push({
        section_id: sectionId,
        doc_id: docId,
        url,
        section_path: sectionPath,
        heading_text: heading.text,
        heading_level: heading.level,
        char_start: 0, // Relative to section
        char_end: windowText.length,
        clean_text: windowText,
        prev_section_id: i > 0 ? sections[sections.length - 1]?.section_id : null,
        next_section_id: null // Will be set in next iteration
      });
      
      // Set prev section's next pointer
      if (sections.length > 1) {
        sections[sections.length - 2].next_section_id = sectionId;
      }
      
      remainingText = remainingText.substring(maxSectionLength);
      windowIndex++;
    }
  }
  
  return sections;
}

// Extract FAQ units from JSON-LD FAQPage schema
function extractFAQUnits(schemas, sections, docId, url) {
  const units = [];
  const edges = [];
  
  for (const schema of schemas) {
    // Handle @graph arrays
    const items = Array.isArray(schema['@graph']) ? schema['@graph'] : [schema];
    
    for (const item of items) {
      if (item['@type'] === 'FAQPage' && Array.isArray(item.mainEntity)) {
        for (const faq of item.mainEntity) {
          if (faq['@type'] === 'Question' && faq.acceptedAnswer) {
            const questionText = faq.name || faq.text || '';
            const answerText = faq.acceptedAnswer.text || '';
            
            if (questionText && answerText) {
              // Find best matching section (FAQ section or first section)
              const faqSection = sections.find(s => 
                s.heading_text.toLowerCase().includes('question') ||
                s.heading_text.toLowerCase().includes('faq')
              ) || sections[0];
              
              if (faqSection) {
                const qId = generateId(url, 'faq_q', questionText);
                const aId = generateId(url, 'faq_a', answerText);
                
                units.push({
                  unit_id: qId,
                  section_id: faqSection.section_id,
                  doc_id: docId,
                  url,
                  unit_type: 'faq_q',
                  clean_text: questionText,
                  enriched_text_for_embedding: `DOC: ${faqSection.section_path} | URL: ${url} | TYPE: faq_q | TEXT: ${questionText}`,
                  entity_refs: []
                });
                
                units.push({
                  unit_id: aId,
                  section_id: faqSection.section_id,
                  doc_id: docId,
                  url,
                  unit_type: 'faq_a',
                  clean_text: answerText,
                  enriched_text_for_embedding: `DOC: ${faqSection.section_path} | URL: ${url} | TYPE: faq_a | TEXT: ${answerText}`,
                  entity_refs: []
                });
                
                // Create answer edge
                edges.push({
                  from_unit_id: qId,
                  to_unit_id: aId,
                  edge_type: 'answers',
                  edge_label: 'answers',
                  confidence: 0.99
                });
              }
            }
          }
        }
      }
    }
  }
  
  return { units, edges };
}

// Extract definition units from text (AEO, GEO, etc.)
function extractDefinitionUnits(sections, docId, url) {
  const units = [];
  const definitionPattern = /^([A-Z][A-Z\s]+)\s*\(([^)]+)\)\s*[:\-]\s*(.+?)(?=\n\n|\n[A-Z]|$)/gms;
  
  for (const section of sections) {
    let match;
    while ((match = definitionPattern.exec(section.clean_text)) !== null) {
      const term = match[1].trim();
      const acronym = match[2].trim();
      const definition = match[3].trim();
      
      if (term && definition && definition.length > 50) {
        const unitId = generateId(url, 'definition', term);
        const entityRefs = [term, acronym].filter(Boolean);
        
        units.push({
          unit_id: unitId,
          section_id: section.section_id,
          doc_id: docId,
          url,
          unit_type: 'definition',
          clean_text: `${term} (${acronym}): ${definition}`,
          enriched_text_for_embedding: `DOC: ${section.section_path} | URL: ${url} | TYPE: definition | TEXT: ${term} (${acronym}): ${definition}`,
          entity_refs: entityRefs
        });
      }
    }
  }
  
  return units;
}

// Extract entity facts from Organization/WebPage schema
function extractEntityFacts(schemas, sections, docId, url) {
  const units = [];
  
  for (const schema of schemas) {
    const items = Array.isArray(schema['@graph']) ? schema['@graph'] : [schema];
    
    for (const item of items) {
      if (item['@type'] === 'Organization' || item['@type'] === 'WebPage') {
        const facts = [];
        
        if (item.name) facts.push(`${item.name} is the organization name`);
        if (item.telephone) facts.push(`${item.name || 'Organization'} telephone is ${item.telephone}`);
        if (item.founder) {
          const founderName = typeof item.founder === 'string' ? item.founder : item.founder.name;
          facts.push(`Founder is ${founderName}`);
        }
        if (item.sameAs && Array.isArray(item.sameAs)) {
          item.sameAs.forEach(url => {
            facts.push(`SameAs includes ${url}`);
          });
        }
        
        const firstSection = sections[0];
        if (firstSection && facts.length > 0) {
          facts.forEach(fact => {
            const unitId = generateId(url, 'entity_fact', fact);
            units.push({
              unit_id: unitId,
              section_id: firstSection.section_id,
              doc_id: docId,
              url,
              unit_type: 'fact',
              clean_text: fact,
              enriched_text_for_embedding: `DOC: ${firstSection.section_path} | URL: ${url} | TYPE: fact | TEXT: ${fact}`,
              entity_refs: [item.name].filter(Boolean)
            });
          });
        }
      }
    }
  }
  
  return units;
}

// Extract claim units from sections (key statements)
function extractClaimUnits(sections, docId, url) {
  const units = [];
  
  // Look for strong claim patterns
  const claimPatterns = [
    /(?:AI systems|Generative AI|ChatGPT|Google AI Overviews)\s+(?:do not|fundamentally|prioritize|evaluate|extract)/gi,
    /(?:Traditional SEO|Indexing and retrieval)\s+(?:are|is|optimizes|measures)/gi
  ];
  
  for (const section of sections) {
    const sentences = section.clean_text.split(/[.!?]\s+/).filter(s => s.length > 50);
    
    for (const sentence of sentences) {
      if (claimPatterns.some(pattern => pattern.test(sentence))) {
        const unitId = generateId(url, 'claim', sentence.substring(0, 50));
        units.push({
          unit_id: unitId,
          section_id: section.section_id,
          doc_id: docId,
          url,
          unit_type: 'claim',
          clean_text: sentence,
          enriched_text_for_embedding: `DOC: ${section.section_path} | URL: ${url} | TYPE: claim | TEXT: ${sentence}`,
          entity_refs: []
        });
      }
    }
  }
  
  return units;
}

// Generate hop graph edges between units
function generateHopEdges(units, sections) {
  const edges = [];
  
  // Link FAQ questions to definition units
  const faqQuestions = units.filter(u => u.unit_type === 'faq_q');
  const definitions = units.filter(u => u.unit_type === 'definition');
  
  for (const faq of faqQuestions) {
    const questionLower = faq.clean_text.toLowerCase();
    
    for (const def of definitions) {
      // Check if FAQ question mentions definition term
      const defTerms = def.entity_refs.map(e => e.toLowerCase());
      if (defTerms.some(term => questionLower.includes(term))) {
        edges.push({
          from_unit_id: faq.unit_id,
          to_unit_id: def.unit_id,
          edge_type: 'elaborates',
          edge_label: 'elaborates',
          confidence: 0.85
        });
      }
    }
  }
  
  // Link claims to definitions (if claim mentions definition term)
  const claims = units.filter(u => u.unit_type === 'claim');
  
  for (const claim of claims) {
    const claimLower = claim.clean_text.toLowerCase();
    
    for (const def of definitions) {
      const defTerms = def.entity_refs.map(e => e.toLowerCase());
      if (defTerms.some(term => claimLower.includes(term))) {
        edges.push({
          from_unit_id: claim.unit_id,
          to_unit_id: def.unit_id,
          edge_type: 'defines',
          edge_label: 'defines',
          confidence: 0.75
        });
      }
    }
  }
  
  return edges;
}

// Main content extraction with SINR structure
function extractContentSINR(html, baseUrl) {
  const docId = generateId(baseUrl, 'doc');
  
  // Extract basic metadata
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  const meta = extractMetaTags(html);
  const structured_data = extractJSONLD(html);
  
  // Extract sections (retrieve-layer parents)
  const sections = extractSections(html, baseUrl, docId);
  
  // Extract units (search-layer children)
  const units = [];
  const edges = [];
  
  // 1. Extract FAQ units
  const { units: faqUnits, edges: faqEdges } = extractFAQUnits(structured_data, sections, docId, baseUrl);
  units.push(...faqUnits);
  edges.push(...faqEdges);
  
  // 2. Extract definition units
  const definitionUnits = extractDefinitionUnits(sections, docId, baseUrl);
  units.push(...definitionUnits);
  
  // 3. Extract entity facts from schema
  const entityFacts = extractEntityFacts(structured_data, sections, docId, baseUrl);
  units.push(...entityFacts);
  
  // 4. Extract claim units
  const claimUnits = extractClaimUnits(sections, docId, baseUrl);
  units.push(...claimUnits);
  
  // 5. Generate hop graph edges
  const hopEdges = generateHopEdges(units, sections);
  edges.push(...hopEdges);
  
  return {
    doc_id: docId,
    title,
    meta,
    structured_data,
    sections,
    units,
    edges
  };
}

// Compute content hash for change detection
function computeContentHash(content) {
  const contentString = JSON.stringify(content);
  return crypto.createHash('sha256').update(contentString).digest('hex');
}

// POST /v1/ingest - Single URL ingestion with SINR-aligned output
export async function ingestUrl(req, res) {
  try {
    const { domain, url } = req.body;
    
    if (!domain || !url) {
      return res.status(400).json({ error: 'domain and url are required' });
    }

    // Validate URL format
    let canonicalUrl;
    try {
      canonicalUrl = new URL(url).href;
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Fetch HTML snapshot
    const response = await fetch(canonicalUrl, {
      headers: {
        'User-Agent': 'Croutons-Ingestor/1.0'
      }
    });

    if (!response.ok) {
      return res.status(400).json({ 
        error: 'Failed to fetch URL',
        status: response.status,
        url: canonicalUrl
      });
    }

    const html = await response.text();

    // Store raw HTML snapshot
    await pool.query(`
      INSERT INTO html_snapshots (domain, source_url, html)
      VALUES ($1, $2, $3)
      ON CONFLICT (domain, source_url) 
      DO UPDATE SET 
        html = EXCLUDED.html,
        fetched_at = NOW()
    `, [domain, canonicalUrl, html]);

    // Extract content with SINR structure
    const extractedContent = extractContentSINR(html, canonicalUrl);
    const contentHash = computeContentHash(extractedContent);

    res.json({
      ok: true,
      data: {
        domain,
        source_url: canonicalUrl,
        content_hash: contentHash,
        doc_id: extractedContent.doc_id,
        title: extractedContent.title,
        meta: extractedContent.meta,
        structured_data: extractedContent.structured_data,
        sections: extractedContent.sections,
        units: extractedContent.units,
        edges: extractedContent.edges,
        fetched_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Ingestion error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
}
