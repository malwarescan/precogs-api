# Croutons Dev Team Instructions - Bangkok Massage Intelligence Integration

**Deployment:** Cloud-Based (Node.js/Express) - Railway/AWS/GCP  
**Date:** 2025-01-05  
**Status:** Ready for Implementation

---

## Overview

This document provides complete implementation instructions for the Croutons team to integrate Bangkok Massage Intelligence with live Google Maps data and local corpus files.

**Architecture:**
- **Deployment:** Cloud-based (Railway/AWS/GCP compatible)
- **Caching:** Redis (primary) + SQLite (persistent backup)
- **API:** Express.js endpoints
- **Data Sources:** Google Maps (live) + Corpus files (verified)

---

## 1. Project Structure

Create the following structure in your Croutons service:

```
croutons-service/
├── src/
│   ├── services/
│   │   └── bkkMassageMerge.js      # Merge service
│   ├── cache/
│   │   ├── redisCache.js           # Redis cache layer
│   │   ├── sqliteCache.js          # SQLite persistence
│   │   └── cacheService.js         # Unified cache interface
│   ├── parsers/
│   │   └── reviewParser.js         # Review data extraction
│   └── api/
│       └── bkkMassageRoutes.js     # API routes
├── data/
│   └── corpora/
│       └── thailand/
│           └── bangkok/
│               └── massage/
│                   ├── shops_verified.ndjson
│                   ├── district_profiles.json
│                   └── pricing_reference.json
├── db/
│   └── bkk_massage.sqlite          # SQLite database
└── package.json
```

---

## 2. Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "redis": "^4.6.0",
    "better-sqlite3": "^9.0.0",
    "node-fetch": "^3.3.2",
    "puppeteer": "^21.0.0"
  }
}
```

Install:
```bash
npm install express redis better-sqlite3 node-fetch puppeteer
```

---

## 3. Cache Service Implementation

### 3.1 Redis Cache Layer

**File:** `src/cache/redisCache.js`

```javascript
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

await redis.connect();

const CACHE_KEYS = {
  shops: 'bkk_massage:shops',
  shopsByDistrict: (district) => `bkk_massage:shops:district:${district}`,
  shopsByRating: 'bkk_massage:shops:rating:sorted',
  districtProfiles: 'bkk_massage:districts',
  pricingReference: 'bkk_massage:pricing',
  lastUpdated: 'bkk_massage:last_updated',
};

export class RedisCache {
  async getShops(district = null) {
    const key = district ? CACHE_KEYS.shopsByDistrict(district) : CACHE_KEYS.shops;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async setShops(shops, district = null, ttl = 3600) {
    const key = district ? CACHE_KEYS.shopsByDistrict(district) : CACHE_KEYS.shops;
    await redis.setEx(key, ttl, JSON.stringify(shops));
    
    // Also update sorted by rating
    const sorted = [...shops].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    await redis.setEx(CACHE_KEYS.shopsByRating, ttl, JSON.stringify(sorted));
  }

  async getDistrictProfiles() {
    const cached = await redis.get(CACHE_KEYS.districtProfiles);
    return cached ? JSON.parse(cached) : null;
  }

  async setDistrictProfiles(profiles, ttl = 86400) {
    await redis.setEx(CACHE_KEYS.districtProfiles, ttl, JSON.stringify(profiles));
  }

  async getPricingReference() {
    const cached = await redis.get(CACHE_KEYS.pricingReference);
    return cached ? JSON.parse(cached) : null;
  }

  async setPricingReference(pricing, ttl = 86400) {
    await redis.setEx(CACHE_KEYS.pricingReference, ttl, JSON.stringify(pricing));
  }

  async getLastUpdated() {
    return await redis.get(CACHE_KEYS.lastUpdated);
  }

  async setLastUpdated(timestamp) {
    await redis.set(CACHE_KEYS.lastUpdated, timestamp);
  }
}
```

### 3.2 SQLite Cache Layer

**File:** `src/cache/sqliteCache.js`

```javascript
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../db/bkk_massage.sqlite');

const db = new Database(DB_PATH);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    district TEXT,
    rating REAL,
    review_count INTEGER,
    prettiest_women TEXT,
    pricing TEXT,
    line_usernames TEXT,
    websites TEXT,
    verified BOOLEAN DEFAULT 0,
    safety_signals TEXT,
    data_sources TEXT,
    last_updated TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_district ON shops(district);
  CREATE INDEX IF NOT EXISTS idx_rating ON shops(rating DESC);
  CREATE INDEX IF NOT EXISTS idx_verified ON shops(verified);

  CREATE TABLE IF NOT EXISTS districts (
    name TEXT PRIMARY KEY,
    profile TEXT,
    last_updated TEXT
  );

  CREATE TABLE IF NOT EXISTS pricing_reference (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    district TEXT,
    massage_type TEXT,
    price_low REAL,
    price_high REAL,
    price_typical REAL,
    currency TEXT
  );
`);

export class SQLiteCache {
  getShops(district = null) {
    const query = district
      ? 'SELECT * FROM shops WHERE district = ? ORDER BY rating DESC'
      : 'SELECT * FROM shops ORDER BY rating DESC';
    
    const rows = db.prepare(query).all(district || []);
    return rows.map(row => ({
      ...row,
      prettiest_women: JSON.parse(row.prettiest_women || '[]'),
      pricing: JSON.parse(row.pricing || '[]'),
      line_usernames: JSON.parse(row.line_usernames || '[]'),
      websites: JSON.parse(row.websites || '[]'),
      safety_signals: JSON.parse(row.safety_signals || '[]'),
      data_sources: JSON.parse(row.data_sources || '[]'),
      verified: Boolean(row.verified),
    }));
  }

  saveShops(shops) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO shops VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insert = db.transaction((shops) => {
      for (const shop of shops) {
        stmt.run(
          shop.id || generateId(shop.name),
          shop.name,
          shop.address || null,
          shop.district || null,
          shop.rating || null,
          shop.review_count || null,
          JSON.stringify(shop.prettiest_women || []),
          JSON.stringify(shop.pricing || []),
          JSON.stringify(shop.line_usernames || []),
          JSON.stringify(shop.websites || []),
          shop.verified ? 1 : 0,
          JSON.stringify(shop.safety_signals || []),
          JSON.stringify(shop.data_sources || []),
          new Date().toISOString(),
          new Date().toISOString(),
        );
      }
    });

    insert(shops);
  }

  getDistrictProfiles() {
    const rows = db.prepare('SELECT * FROM districts').all();
    return rows.map(row => ({
      name: row.name,
      profile: JSON.parse(row.profile || '{}'),
      last_updated: row.last_updated,
    }));
  }

  saveDistrictProfiles(profiles) {
    const stmt = db.prepare('INSERT OR REPLACE INTO districts VALUES (?, ?, ?)');
    const insert = db.transaction((profiles) => {
      for (const profile of profiles) {
        stmt.run(profile.name, JSON.stringify(profile), new Date().toISOString());
      }
    });
    insert(profiles);
  }

  getPricingReference() {
    return db.prepare('SELECT * FROM pricing_reference').all();
  }

  savePricingReference(pricing) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO pricing_reference (district, massage_type, price_low, price_high, price_typical, currency)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insert = db.transaction((pricing) => {
      for (const p of pricing) {
        stmt.run(p.district, p.massage_type, p.price_low, p.price_high, p.price_typical, p.currency || 'THB');
      }
    });
    insert(pricing);
  }
}

function generateId(name) {
  return require('crypto').createHash('sha256').update(name).digest('hex').substring(0, 16);
}
```

### 3.3 Unified Cache Service

**File:** `src/cache/cacheService.js`

```javascript
import { RedisCache } from './redisCache.js';
import { SQLiteCache } from './sqliteCache.js';
import { loadCorpusFiles } from '../loaders/corpusLoader.js';

export class CacheService {
  constructor() {
    this.redis = process.env.REDIS_URL ? new RedisCache() : null;
    this.sqlite = new SQLiteCache();
  }

  async getShops(district = null) {
    // Layer 1: Try Redis
    if (this.redis) {
      const cached = await this.redis.getShops(district);
      if (cached) {
        console.log(`[cache] Redis hit for shops${district ? ` in ${district}` : ''}`);
        return cached;
      }
    }

    // Layer 2: Try SQLite
    const sqliteShops = this.sqlite.getShops(district);
    if (sqliteShops && sqliteShops.length > 0) {
      const lastUpdated = sqliteShops[0]?.last_updated;
      if (lastUpdated && isRecent(lastUpdated, 3600)) { // 1 hour
        console.log(`[cache] SQLite hit for shops${district ? ` in ${district}` : ''}`);
        
        // Warm Redis cache
        if (this.redis) {
          await this.redis.setShops(sqliteShops, district);
        }
        
        return sqliteShops;
      }
    }

    // Layer 3: Load from corpus
    console.log(`[cache] Cache miss, loading from corpus`);
    const corpusShops = await loadCorpusFiles('shops_verified.ndjson');
    
    if (corpusShops && corpusShops.length > 0) {
      // Warm both caches
      this.sqlite.saveShops(corpusShops);
      if (this.redis) {
        await this.redis.setShops(corpusShops, district);
      }
    }

    return corpusShops || [];
  }

  async updateShops(shops) {
    // Update both caches
    this.sqlite.saveShops(shops);
    if (this.redis) {
      await this.redis.setShops(shops);
      await this.redis.setLastUpdated(new Date().toISOString());
    }
  }

  async getDistrictProfiles() {
    if (this.redis) {
      const cached = await this.redis.getDistrictProfiles();
      if (cached) return cached;
    }

    const sqlite = this.sqlite.getDistrictProfiles();
    if (sqlite && sqlite.length > 0) {
      if (this.redis) {
        await this.redis.setDistrictProfiles(sqlite);
      }
      return sqlite;
    }

    // Load from corpus
    return await loadCorpusFiles('district_profiles.json');
  }

  async getPricingReference() {
    if (this.redis) {
      const cached = await this.redis.getPricingReference();
      if (cached) return cached;
    }

    const sqlite = this.sqlite.getPricingReference();
    if (sqlite && sqlite.length > 0) {
      if (this.redis) {
        await this.redis.setPricingReference(sqlite);
      }
      return sqlite;
    }

    // Load from corpus
    return await loadCorpusFiles('pricing_reference.json');
  }
}

function isRecent(timestamp, maxAgeSeconds = 3600) {
  const age = (Date.now() - new Date(timestamp).getTime()) / 1000;
  return age < maxAgeSeconds;
}
```

---

## 4. Merge Service Implementation

**File:** `src/services/bkkMassageMerge.js`

```javascript
import { CacheService } from '../cache/cacheService.js';
import { parseGoogleMapsData } from '../parsers/googleMapsParser.js';
import { extractReviewData } from '../parsers/reviewParser.js';

export class BkkMassageMergeService {
  constructor() {
    this.cache = new CacheService();
  }

  /**
   * Merge live Google Maps data with corpus data
   * @param {Array} liveShops - Shops from Google Maps scraping
   * @param {Object} options - Merge options
   * @returns {Promise<Array>} Merged and enriched shops
   */
  async mergeShopData(liveShops, options = {}) {
    const {
      mergeStrategy = 'enrich_with_corpus',
      district = null,
    } = options;

    // Load corpus data
    const corpusShops = await this.cache.getShops(district);
    const districtProfiles = await this.cache.getDistrictProfiles();
    const pricingReference = await this.cache.getPricingReference();

    // Merge each live shop
    const mergedShops = liveShops.map(liveShop => {
      // Find matching shop in corpus
      const corpusMatch = this.findMatchingShop(liveShop, corpusShops);

      // Get district profile
      const district = this.extractDistrict(liveShop.address);
      const districtProfile = districtProfiles.find(d => d.name === district);

      // Get pricing reference
      const pricingRef = pricingReference.filter(p => p.district === district);

      // Merge based on strategy
      return this.mergeWithStrategy(
        liveShop,
        corpusMatch,
        districtProfile,
        pricingRef,
        mergeStrategy
      );
    });

    // Update cache
    await this.cache.updateShops(mergedShops);

    return mergedShops;
  }

  /**
   * Find matching shop in corpus
   */
  findMatchingShop(liveShop, corpusShops) {
    if (!corpusShops || corpusShops.length === 0) return null;

    // Try exact name match
    let match = corpusShops.find(s => 
      s.name.toLowerCase() === liveShop.name.toLowerCase()
    );

    // Try fuzzy match (similar name)
    if (!match) {
      match = corpusShops.find(s => 
        this.isSimilarName(s.name, liveShop.name)
      );
    }

    // Try address match
    if (!match && liveShop.address) {
      match = corpusShops.find(s => 
        s.address && this.isSimilarAddress(s.address, liveShop.address)
      );
    }

    return match || null;
  }

  /**
   * Merge shop data with strategy
   */
  mergeWithStrategy(live, corpus, district, pricing, strategy) {
    switch (strategy) {
      case 'enrich_with_corpus':
        return {
          // Live data (primary)
          id: live.id || corpus?.id || this.generateId(live.name),
          name: live.name,
          address: live.address || corpus?.address,
          district: this.extractDistrict(live.address) || corpus?.district,
          rating: live.rating || corpus?.rating,
          review_count: live.review_count || corpus?.review_count || 0,
          prettiest_women: live.prettiest_women_mentions || corpus?.prettiest_women || [],
          pricing: live.pricing || corpus?.pricing || [],
          line_usernames: live.line_usernames || corpus?.line_usernames || [],
          websites: live.websites || corpus?.websites || [],

          // Corpus enrichment (adds verified data)
          verified: corpus?.verified || false,
          safety_signals: corpus?.safety_signals || [],
          last_verified: corpus?.last_verified,

          // District context
          district_info: district?.profile || null,
          pricing_reference: pricing || [],

          // Metadata
          data_sources: [
            'google_maps',
            corpus ? 'corpus' : null
          ].filter(Boolean),
          confidence: this.calculateConfidence(live, corpus),
          last_updated: new Date().toISOString(),
        };

      case 'corpus_priority':
        // Corpus is primary, live data fills gaps
        return {
          ...corpus,
          rating: corpus.rating || live.rating,
          review_count: corpus.review_count || live.review_count,
          prettiest_women: [
            ...(corpus.prettiest_women || []),
            ...(live.prettiest_women_mentions || [])
          ],
          pricing: [
            ...(corpus.pricing || []),
            ...(live.pricing || [])
          ],
          data_sources: ['corpus', 'google_maps'],
        };

      default:
        return live;
    }
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(live, corpus) {
    let score = 0.5; // Base score

    if (corpus) {
      score += 0.3; // Has corpus match
      if (corpus.verified) score += 0.2; // Verified in corpus
    }

    if (live.rating && live.rating > 4.0) score += 0.1;
    if (live.review_count && live.review_count > 10) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Extract district from address
   */
  extractDistrict(address) {
    if (!address) return null;

    const districts = [
      'Asok', 'Nana', 'Phrom Phong', 'Thonglor', 'Ekkamai',
      'Silom', 'Ari', 'Victory Monument', 'Ratchada', 'Old City'
    ];

    const addressLower = address.toLowerCase();
    return districts.find(d => addressLower.includes(d.toLowerCase())) || null;
  }

  /**
   * Check if names are similar
   */
  isSimilarName(name1, name2) {
    const n1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Simple similarity check
    return n1.includes(n2.substring(0, 5)) || n2.includes(n1.substring(0, 5));
  }

  /**
   * Check if addresses are similar
   */
  isSimilarAddress(addr1, addr2) {
    if (!addr1 || !addr2) return false;
    const a1 = addr1.toLowerCase();
    const a2 = addr2.toLowerCase();
    return a1.includes(a2.substring(0, 10)) || a2.includes(a1.substring(0, 10));
  }

  /**
   * Generate shop ID
   */
  generateId(name) {
    return require('crypto')
      .createHash('sha256')
      .update(name)
      .digest('hex')
      .substring(0, 16);
  }
}
```

---

## 5. API Routes

**File:** `src/api/bkkMassageRoutes.js`

```javascript
import express from 'express';
import { BkkMassageMergeService } from '../services/bkkMassageMerge.js';
import { parseGoogleMapsData } from '../parsers/googleMapsParser.js';

const router = express.Router();
const mergeService = new BkkMassageMergeService();

/**
 * POST /api/bkk-massage/merge
 * Merge live Google Maps data with corpus
 */
router.post('/merge', async (req, res) => {
  try {
    const { liveShops, district, mergeStrategy } = req.body;

    if (!liveShops || !Array.isArray(liveShops)) {
      return res.status(400).json({
        ok: false,
        error: 'liveShops array is required',
      });
    }

    const merged = await mergeService.mergeShopData(liveShops, {
      district,
      mergeStrategy: mergeStrategy || 'enrich_with_corpus',
    });

    res.json({
      ok: true,
      shops: merged,
      count: merged.length,
    });
  } catch (error) {
    console.error('[bkk-massage] Merge error:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/bkk-massage/shops
 * Get merged shops (from cache or corpus)
 */
router.get('/shops', async (req, res) => {
  try {
    const { district } = req.query;
    const cacheService = mergeService.cache;
    const shops = await cacheService.getShops(district || null);

    res.json({
      ok: true,
      shops,
      count: shops.length,
      source: 'cache',
    });
  } catch (error) {
    console.error('[bkk-massage] Get shops error:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/bkk-massage/districts
 * Get district profiles
 */
router.get('/districts', async (req, res) => {
  try {
    const cacheService = mergeService.cache;
    const districts = await cacheService.getDistrictProfiles();

    res.json({
      ok: true,
      districts,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/bkk-massage/pricing
 * Get pricing reference
 */
router.get('/pricing', async (req, res) => {
  try {
    const { district } = req.query;
    const cacheService = mergeService.cache;
    let pricing = await cacheService.getPricingReference();

    if (district) {
      pricing = pricing.filter(p => p.district === district);
    }

    res.json({
      ok: true,
      pricing,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

export default router;
```

---

## 6. Corpus Loader

**File:** `src/loaders/corpusLoader.js`

```javascript
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CORPUS_DIR = join(__dirname, '../../../data/corpora/thailand/bangkok/massage');

export function loadCorpusFiles(filename) {
  try {
    const filepath = join(CORPUS_DIR, filename);
    const content = readFileSync(filepath, 'utf-8');

    if (filename.endsWith('.ndjson')) {
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } else if (filename.endsWith('.json')) {
      return JSON.parse(content);
    }

    return null;
  } catch (error) {
    console.warn(`[corpus] Failed to load ${filename}:`, error.message);
    return null;
  }
}
```

---

## 7. Server Integration

Add to your main Express server:

```javascript
import bkkMassageRoutes from './src/api/bkkMassageRoutes.js';

// Add routes
app.use('/api/bkk-massage', bkkMassageRoutes);
```

---

## 8. OpenAPI Specification

**File:** `openapi/bkk-massage.yaml`

```yaml
openapi: 3.0.0
info:
  title: Bangkok Massage Intelligence API
  version: 1.0.0
  description: API for merging Google Maps data with corpus data

paths:
  /api/bkk-massage/merge:
    post:
      summary: Merge live Google Maps data with corpus
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - liveShops
              properties:
                liveShops:
                  type: array
                  items:
                    $ref: '#/components/schemas/Shop'
                district:
                  type: string
                mergeStrategy:
                  type: string
                  enum: [enrich_with_corpus, corpus_priority]
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok:
                    type: boolean
                  shops:
                    type: array
                    items:
                      $ref: '#/components/schemas/MergedShop'
                  count:
                    type: integer

  /api/bkk-massage/shops:
    get:
      summary: Get merged shops from cache
      parameters:
        - name: district
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok:
                    type: boolean
                  shops:
                    type: array
                    items:
                      $ref: '#/components/schemas/MergedShop'
                  count:
                    type: integer
                  source:
                    type: string

components:
  schemas:
    Shop:
      type: object
      properties:
        name:
          type: string
        address:
          type: string
        rating:
          type: number
        review_count:
          type: integer
        prettiest_women_mentions:
          type: array
          items:
            type: string
        pricing:
          type: array
          items:
            type: string
        line_usernames:
          type: array
          items:
            type: string
        websites:
          type: array
          items:
            type: string

    MergedShop:
      allOf:
        - $ref: '#/components/schemas/Shop'
        - type: object
          properties:
            verified:
              type: boolean
            safety_signals:
              type: array
              items:
                type: string
            data_sources:
              type: array
              items:
                type: string
            confidence:
              type: number
            district_info:
              type: object
            pricing_reference:
              type: array
```

---

## 9. Environment Variables

Add to your Railway/environment:

```bash
# Redis (optional but recommended)
REDIS_URL=redis://default:password@host:6379

# Corpus path (defaults to ./data/corpora/thailand/bangkok/massage)
BKK_MASSAGE_CORPUS_PATH=/path/to/corpus

# Cache TTL (seconds)
BKK_MASSAGE_CACHE_TTL=3600
```

---

## 10. Testing

### Test Merge Service

```bash
curl -X POST http://localhost:8080/api/bkk-massage/merge \
  -H 'Content-Type: application/json' \
  -d '{
    "liveShops": [
      {
        "name": "Test Massage",
        "address": "123 Asok Road",
        "rating": 4.5,
        "review_count": 50
      }
    ],
    "district": "Asok"
  }'
```

### Test Get Shops

```bash
curl http://localhost:8080/api/bkk-massage/shops?district=Asok
```

---

## 11. Deployment Checklist

- [ ] Install dependencies (`npm install`)
- [ ] Create `db/` directory for SQLite
- [ ] Copy corpus files to `data/corpora/thailand/bangkok/massage/`
- [ ] Set environment variables (REDIS_URL if available)
- [ ] Add routes to Express server
- [ ] Test merge endpoint
- [ ] Test cache endpoints
- [ ] Verify Redis connection (if available)
- [ ] Verify SQLite database creation
- [ ] Monitor cache hit rates

---

## 12. Monitoring

Add logging for:
- Cache hit/miss rates
- Merge operation timing
- Redis connection status
- SQLite query performance

---

**Ready for implementation!** ✅

