// src/routes/audit.js
// LLM Readiness Audit endpoint for Protocol v1.1 compliance

import { pool } from '../db.js';

// POST /v1/audit
export async function auditPage(req, res) {
  try {
    const { url, mode = 'page' } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        ok: false,
        error: 'URL is required' 
      });
    }

    // Parse domain from URL
    let domain;
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname;
    } catch (e) {
      return res.status(400).json({ 
        ok: false,
        error: 'Invalid URL format' 
      });
    }

    const checks = {};
    let score = 0;
    const maxScore = 100;
    const checkWeight = maxScore / 6; // 6 checks total

    // Check 1: Discovery (alternate link tags)
    let html = null;
    try {
      const htmlResponse = await fetch(url, {
        headers: { 'User-Agent': 'Croutons-Audit/1.0' },
        signal: AbortSignal.timeout(10000)
      });

      if (!htmlResponse.ok) {
        checks.discovery = {
          pass: false,
          message: `Failed to fetch HTML (${htmlResponse.status})`
        };
      } else {
        html = await htmlResponse.text();
        
        // Look for markdown alternate link
        const hasMarkdownLink = html.includes('rel="alternate"') && 
                               html.includes('type="text/markdown"');
        
        checks.discovery = {
          pass: hasMarkdownLink,
          message: hasMarkdownLink 
            ? 'Found markdown alternate link tag'
            : 'Missing <link rel="alternate" type="text/markdown"> tag'
        };
        
        if (hasMarkdownLink) score += checkWeight;
      }
    } catch (error) {
      checks.discovery = {
        pass: false,
        message: `Error fetching page: ${error.message}`
      };
    }

    // Check 2: Mirror (Markdown with Protocol v1.1 frontmatter)
    try {
      // Try to find markdown mirror URL
      const mirrorUrl = url.replace(/\.html?$/, '.md');
      const mirrorResponse = await fetch(mirrorUrl, {
        headers: { 'User-Agent': 'Croutons-Audit/1.0' },
        signal: AbortSignal.timeout(10000)
      });

      if (!mirrorResponse.ok) {
        checks.mirror = {
          pass: false,
          message: 'Markdown mirror not found or not accessible'
        };
      } else {
        const markdown = await mirrorResponse.text();
        
        // Check for Protocol v1.1 frontmatter
        const hasFrontmatter = markdown.startsWith('---');
        const hasProtocolVersion = markdown.includes('protocol_version:');
        const hasSourceUrl = markdown.includes('source_url:');
        const hasCanonicalUrl = markdown.includes('canonical_url:');
        
        const isValid = hasFrontmatter && hasProtocolVersion && hasSourceUrl && hasCanonicalUrl;
        
        checks.mirror = {
          pass: isValid,
          message: isValid 
            ? 'Valid Protocol v1.1 markdown mirror'
            : 'Markdown mirror missing required frontmatter fields'
        };
        
        if (isValid) score += checkWeight;
      }
    } catch (error) {
      checks.mirror = {
        pass: false,
        message: `Error checking mirror: ${error.message}`
      };
    }

    // Check 3: Evidence Anchors (check database for deterministic anchors)
    try {
      const anchorResult = await pool.query(`
        SELECT COUNT(*) as count,
               COUNT(CASE WHEN evidence_anchor IS NOT NULL THEN 1 END) as with_anchors
        FROM public.croutons
        WHERE domain = $1
        LIMIT 1000
      `, [domain]);

      if (anchorResult.rows.length > 0) {
        const { count, with_anchors } = anchorResult.rows[0];
        const totalCount = parseInt(count);
        const anchorsCount = parseInt(with_anchors);
        
        if (totalCount === 0) {
          checks.evidence_anchors = {
            pass: false,
            message: 'No facts found for this domain'
          };
        } else {
          const percentage = (anchorsCount / totalCount) * 100;
          const pass = percentage > 80;
          
          checks.evidence_anchors = {
            pass,
            message: pass 
              ? `${percentage.toFixed(0)}% of facts have evidence anchors`
              : `Only ${percentage.toFixed(0)}% of facts have evidence anchors (need >80%)`
          };
          
          if (pass) score += checkWeight;
        }
      } else {
        checks.evidence_anchors = {
          pass: false,
          message: 'No facts found in database'
        };
      }
    } catch (error) {
      checks.evidence_anchors = {
        pass: false,
        message: `Error checking anchors: ${error.message}`
      };
    }

    // Check 4: Facts Stream (NDJSON endpoint)
    try {
      const factsUrl = `https://precogs.croutons.ai/v1/facts/${domain}.ndjson`;
      const factsResponse = await fetch(factsUrl, {
        headers: { 'User-Agent': 'Croutons-Audit/1.0' },
        signal: AbortSignal.timeout(10000)
      });

      if (!factsResponse.ok) {
        checks.facts_stream = {
          pass: false,
          message: 'Facts stream endpoint not accessible'
        };
      } else {
        const factsText = await factsResponse.text();
        const lines = factsText.trim().split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          checks.facts_stream = {
            pass: false,
            message: 'Facts stream is empty'
          };
        } else {
          // Validate first line is valid NDJSON
          try {
            const firstFact = JSON.parse(lines[0]);
            const hasRequiredFields = firstFact.text && firstFact.crouton_id;
            
            checks.facts_stream = {
              pass: hasRequiredFields,
              message: hasRequiredFields 
                ? `Facts stream accessible (${lines.length} facts)`
                : 'Facts stream missing required fields'
            };
            
            if (hasRequiredFields) score += checkWeight;
          } catch (e) {
            checks.facts_stream = {
              pass: false,
              message: 'Facts stream contains invalid NDJSON'
            };
          }
        }
      }
    } catch (error) {
      checks.facts_stream = {
        pass: false,
        message: `Error checking facts stream: ${error.message}`
      };
    }

    // Check 5: Entity Graph (JSON-LD)
    try {
      const graphUrl = `https://precogs.croutons.ai/v1/graph/${domain}.jsonld`;
      const graphResponse = await fetch(graphUrl, {
        headers: { 'User-Agent': 'Croutons-Audit/1.0' },
        signal: AbortSignal.timeout(10000)
      });

      if (!graphResponse.ok) {
        checks.entity_graph = {
          pass: false,
          message: 'Entity graph endpoint not accessible'
        };
      } else {
        const graph = await graphResponse.json();
        const hasContext = graph['@context'] !== undefined;
        const hasGraph = graph['@graph'] !== undefined || Array.isArray(graph);
        
        checks.entity_graph = {
          pass: hasContext || hasGraph,
          message: (hasContext || hasGraph)
            ? 'Entity graph endpoint accessible and valid'
            : 'Entity graph missing @context or @graph'
        };
        
        if (hasContext || hasGraph) score += checkWeight;
      }
    } catch (error) {
      checks.entity_graph = {
        pass: false,
        message: `Error checking entity graph: ${error.message}`
      };
    }

    // Check 6: Status (Protocol version reporting)
    try {
      const statusUrl = `https://precogs.croutons.ai/v1/status/${domain}`;
      const statusResponse = await fetch(statusUrl, {
        headers: { 'User-Agent': 'Croutons-Audit/1.0' },
        signal: AbortSignal.timeout(10000)
      });

      if (!statusResponse.ok) {
        checks.status = {
          pass: false,
          message: 'Status endpoint not accessible'
        };
      } else {
        const status = await statusResponse.json();
        const hasProtocolVersion = status.protocol_version !== undefined;
        const hasFactCount = status.fact_count !== undefined;
        
        checks.status = {
          pass: hasProtocolVersion,
          message: hasProtocolVersion 
            ? `Status endpoint reports protocol ${status.protocol_version}`
            : 'Status endpoint missing protocol_version'
        };
        
        if (hasProtocolVersion) score += checkWeight;
      }
    } catch (error) {
      checks.status = {
        pass: false,
        message: `Error checking status: ${error.message}`
      };
    }

    // CONTENT QUALITY CHECKS (AEO/GEO citeability)
    if (html) {
      // Check 7: Answer Box (40-60 word quotable snippet)
      const answerBoxMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
      if (answerBoxMatch) {
        const desc = answerBoxMatch[1];
        const wordCount = desc.split(/\s+/).length;
        const pass = wordCount >= 40 && wordCount <= 60;
        
        contentQuality.answer_box = {
          pass,
          message: pass 
            ? `Description meta tag is ${wordCount} words (optimal for AI)`
            : `Description is ${wordCount} words (optimal: 40-60 for AI citeability)`,
          score: pass ? 100 : Math.min(100, (wordCount / 50) * 100)
        };
        
        if (pass) contentScore += contentWeight;
      } else {
        contentQuality.answer_box = {
          pass: false,
          message: 'Missing meta description (Answer Box)',
          score: 0
        };
      }
      
      // Check 8: Structured Headings (H2s with specific queries)
      const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
      const pass_h2 = h2Count >= 3 && h2Count <= 8;
      
      contentQuality.structured_headings = {
        pass: pass_h2,
        message: pass_h2 
          ? `Found ${h2Count} H2 sections (good structure)`
          : h2Count === 0 
            ? 'No H2 headings found (add query-ready section headings)'
            : `${h2Count} H2 headings (optimal: 3-8 for scannability)`,
        score: pass_h2 ? 100 : Math.min(100, (h2Count / 5) * 100)
      };
      
      if (pass_h2) contentScore += contentWeight;
      
      // Check 9: Structured Data (tables, lists, decision rubrics)
      const hasTable = html.includes('<table');
      const hasLists = (html.match(/<ul|<ol/gi) || []).length >= 2;
      const pass_structured = hasTable || hasLists;
      
      contentQuality.structured_assets = {
        pass: pass_structured,
        message: pass_structured 
          ? `Found structured content (${hasTable ? 'tables' : 'lists'})`
          : 'No structured assets (add tables, lists, or decision rubrics)',
        score: pass_structured ? 100 : 0
      };
      
      if (pass_structured) contentScore += contentWeight;
      
      // Check 10: Word Count (optimal range for AI processing)
      const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const totalWords = textContent.split(/\s+/).length;
      const pass_length = totalWords >= 800 && totalWords <= 3000;
      
      contentQuality.content_length = {
        pass: pass_length,
        message: pass_length 
          ? `Content length ${totalWords} words (optimal for AI)`
          : totalWords < 800 
            ? `Only ${totalWords} words (too thin for AI citations)`
            : `${totalWords} words (may be too long, consider breaking into multiple pages)`,
        score: pass_length ? 100 : totalWords >= 500 ? 70 : 30
      };
      
      if (pass_length) contentScore += contentWeight;
      
      // Check 11: Link Density (proper internal linking)
      const linkCount = (html.match(/<a\s+href/gi) || []).length;
      const linkDensity = linkCount / (totalWords / 100);
      const pass_links = linkDensity >= 1 && linkDensity <= 5;
      
      contentQuality.link_density = {
        pass: pass_links,
        message: pass_links 
          ? `Link density ${linkDensity.toFixed(1)} per 100 words (good for context)`
          : linkDensity < 1 
            ? `Low link density (${linkDensity.toFixed(1)} per 100 words) - add internal links`
            : `High link density (${linkDensity.toFixed(1)} per 100 words) - may dilute focus`,
        score: pass_links ? 100 : 50
      };
      
      if (pass_links) contentScore += contentWeight;
    }

    // Determine tier based on score
    let tier = 'Not Connected';
    if (score >= 90) tier = 'Tier 1: Full Protocol';
    else if (score >= 70) tier = 'Tier 2: Core Features';
    else if (score >= 50) tier = 'Tier 3: Basic Integration';
    else if (score >= 30) tier = 'Tier 4: Partial Support';
    
    // Determine citeability grade
    let citeabilityGrade = 'F';
    if (contentScore >= 90) citeabilityGrade = 'A';
    else if (contentScore >= 80) citeabilityGrade = 'B';
    else if (contentScore >= 70) citeabilityGrade = 'C';
    else if (contentScore >= 60) citeabilityGrade = 'D';

    // Generate fix pack (basic recommendations)
    const fix_pack = {
      recommendations: []
    };

    if (!checks.discovery?.pass) {
      fix_pack.recommendations.push({
        check: 'discovery',
        action: 'Add <link rel="alternate" type="text/markdown" href="/page.md"> to HTML head',
        priority: 'high'
      });
    }

    if (!checks.mirror?.pass) {
      fix_pack.recommendations.push({
        check: 'mirror',
        action: 'Create markdown mirror with Protocol v1.1 frontmatter (protocol_version, source_url, canonical_url)',
        priority: 'high'
      });
    }

    if (!checks.evidence_anchors?.pass) {
      fix_pack.recommendations.push({
        check: 'evidence_anchors',
        action: 'Ensure facts have deterministic character offsets and fragment hashes',
        priority: 'medium'
      });
    }

    if (!checks.facts_stream?.pass) {
      fix_pack.recommendations.push({
        check: 'facts_stream',
        action: 'Implement /v1/facts/domain.ndjson endpoint with properly formatted facts',
        priority: 'high'
      });
    }

    if (!checks.entity_graph?.pass) {
      fix_pack.recommendations.push({
        check: 'entity_graph',
        action: 'Implement /v1/graph/domain.jsonld endpoint with JSON-LD format',
        priority: 'medium'
      });
    }

    if (!checks.status?.pass) {
      fix_pack.recommendations.push({
        check: 'status',
        action: 'Implement /v1/status/domain endpoint reporting protocol_version',
        priority: 'low'
      });
    }
    
    // Add content quality recommendations
    if (contentQuality.answer_box && !contentQuality.answer_box.pass) {
      fix_pack.recommendations.push({
        check: 'answer_box',
        action: 'Add a 40-60 word meta description that acts as an AI-quotable snippet',
        priority: 'high'
      });
    }
    
    if (contentQuality.structured_headings && !contentQuality.structured_headings.pass) {
      fix_pack.recommendations.push({
        check: 'structured_headings',
        action: 'Add 3-8 H2 section headings with query-ready titles',
        priority: 'high'
      });
    }
    
    if (contentQuality.structured_assets && !contentQuality.structured_assets.pass) {
      fix_pack.recommendations.push({
        check: 'structured_assets',
        action: 'Add tables, comparison charts, or structured lists for AI parsing',
        priority: 'medium'
      });
    }
    
    if (contentQuality.content_length && !contentQuality.content_length.pass) {
      fix_pack.recommendations.push({
        check: 'content_length',
        action: contentQuality.content_length.message.includes('thin') 
          ? 'Expand content to 800-3000 words for comprehensive coverage'
          : 'Consider breaking long content into multiple focused pages',
        priority: 'medium'
      });
    }

    res.json({
      ok: true,
      url,
      domain,
      tier,
      score: Math.round(score),
      citeability_grade: citeabilityGrade,
      citeability_score: Math.round(contentScore),
      checks,
      content_quality: Object.keys(contentQuality).length > 0 ? contentQuality : null,
      fix_pack: fix_pack.recommendations.length > 0 ? fix_pack : null,
      audited_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Audit error:', error);
    res.status(500).json({ 
      ok: false,
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
}
