// src/routes/ingest.js
// Single-URL ingestion with HTML snapshot and content extraction

import crypto from 'crypto';
import { pool } from '../db.js';

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

  // Standard meta tags
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (descMatch) meta.description = descMatch[1].trim();

  const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
  if (keywordsMatch) meta.keywords = keywordsMatch[1].trim();

  const authorMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i);
  if (authorMatch) meta.author = authorMatch[1].trim();

  // Open Graph tags
  const ogRegex = /<meta[^>]*property=["']og:(\w+)["'][^>]*content=["']([^"']+)["']/gi;
  let ogMatch;
  while ((ogMatch = ogRegex.exec(html)) !== null) {
    meta.og[ogMatch[1]] = ogMatch[2].trim();
  }

  // Twitter Card tags
  const twitterRegex = /<meta[^>]*name=["']twitter:(\w+)["'][^>]*content=["']([^"']+)["']/gi;
  let twitterMatch;
  while ((twitterMatch = twitterRegex.exec(html)) !== null) {
    meta.twitter[twitterMatch[1]] = twitterMatch[2].trim();
  }

  return meta;
}

// Extract links for graph building
function extractLinks(html, baseUrl) {
  const links = {
    internal: [],
    external: []
  };

  try {
    const base = new URL(baseUrl);
    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const href = linkMatch[1].trim();
      const text = linkMatch[2].replace(/<[^>]*>/g, '').trim();
      
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;

      try {
        const url = new URL(href, baseUrl);
        const link = { url: url.href, text };
        
        if (url.origin === base.origin) {
          links.internal.push(link);
        } else {
          links.external.push(link);
        }
      } catch {
        // Invalid URL, skip
      }
    }
  } catch (error) {
    // Skip link extraction on error
  }

  return links;
}

// Extract images with alt text for LLM context
function extractImages(html, baseUrl) {
  const images = [];
  try {
    const base = new URL(baseUrl);
    const imgRegex = /<img[^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      const imgTag = imgMatch[0];
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
      
      if (srcMatch) {
        try {
          const src = new URL(srcMatch[1], baseUrl).href;
          images.push({
            src,
            alt: altMatch ? altMatch[1].trim() : ''
          });
        } catch {
          // Invalid URL, skip
        }
      }
    }
  } catch (error) {
    // Skip image extraction on error
  }
  return images;
}

// Extract content using Readability-style algorithm, enhanced for LLM crawling
function extractContent(html, baseUrl) {
  const content = {
    title: '',
    meta: {},
    structured_data: [],
    headings: [],
    body: '',
    lists: [],
    tables: [],
    links: { internal: [], external: [] },
    images: []
  };

  try {
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      content.title = titleMatch[1].trim();
    }

    // Extract meta tags (critical for LLM context)
    content.meta = extractMetaTags(html);

    // Extract JSON-LD structured data (critical for LLM entity extraction)
    content.structured_data = extractJSONLD(html);

    // Extract headings (h1-h6 for better hierarchy)
    const headingRegex = /<h([1-6])[^>]*>([^<]+)<\/h\1>/gi;
    let headingMatch;
    while ((headingMatch = headingRegex.exec(html)) !== null) {
      content.headings.push({
        level: parseInt(headingMatch[1]),
        text: headingMatch[2].replace(/<[^>]*>/g, '').trim()
      });
    }

    // Extract main content area (simplified)
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/is) || 
                     html.match(/<article[^>]*>([\s\S]*?)<\/article>/is) ||
                     html.match(/<body[^>]*>([\s\S]*?)<\/body>/is);
    
    if (mainMatch) {
      let bodyContent = mainMatch[1];
      
      // Clean up content
      bodyContent = bodyContent
        .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove scripts
        .replace(/<style[^>]*>.*?<\/style>/gis, '') // Remove styles
        .replace(/<nav[^>]*>.*?<\/nav>/gis, '') // Remove navigation
        .replace(/<footer[^>]*>.*?<\/footer>/gis, '') // Remove footer
        .replace(/<aside[^>]*>.*?<\/aside>/gis, '') // Remove sidebars
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      content.body = bodyContent;

      // Extract lists (both ordered and unordered)
      const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
      const olRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
      let listMatch;
      
      while ((listMatch = ulRegex.exec(html)) !== null || (listMatch = olRegex.exec(html)) !== null) {
        const items = listMatch[1].match(/<li[^>]*>(.*?)<\/li>/gi);
        if (items) {
          items.forEach(item => {
            const text = item.replace(/<[^>]*>/g, '').trim();
            if (text) content.lists.push(text);
          });
        }
      }

      // Extract tables (keep structure for LLM)
      const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gis;
      let tableMatch;
      while ((tableMatch = tableRegex.exec(html)) !== null) {
        // Extract table rows and cells
        const rows = [];
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;
        while ((rowMatch = rowRegex.exec(tableMatch[1])) !== null) {
          const cells = [];
          const cellRegex = /<t[dh][^>]*>(.*?)<\/t[dh]>/gi;
          let cellMatch;
          while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
            cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
          }
          if (cells.length > 0) rows.push(cells);
        }
        if (rows.length > 0) {
          content.tables.push({ rows });
        }
      }
    }

    // Extract links (for graph building and LLM context)
    if (baseUrl) {
      content.links = extractLinks(html, baseUrl);
    }

    // Extract images (for LLM visual context)
    if (baseUrl) {
      content.images = extractImages(html, baseUrl);
    }

  } catch (error) {
    console.error('Content extraction error:', error);
  }

  return content;
}

// Compute content hash for change detection
function computeContentHash(content) {
  const contentString = JSON.stringify(content);
  return crypto.createHash('sha256').update(contentString).digest('hex');
}

// POST /v1/ingest - Single URL ingestion
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

    // Check robots.txt (simplified)
    const robotsUrl = new URL('/robots.txt', new URL(url).origin).href;
    // TODO: Actually fetch and parse robots.txt in v2

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

    // Extract content (enhanced for LLM crawling)
    const extractedContent = extractContent(html, canonicalUrl);
    const contentHash = computeContentHash(extractedContent);

    res.json({
      ok: true,
      data: {
        domain,
        source_url: canonicalUrl,
        content_hash: contentHash,
        extracted: extractedContent,
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
