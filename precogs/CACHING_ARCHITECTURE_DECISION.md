# Caching Architecture Decision - Bangkok Massage Intelligence

**Question:** Redis (fast ephemeral) vs Local JSON/SQLite hybrid (persistent on edge nodes)?

**Date:** 2025-01-05

---

## Use Case Context

**Data Sources:**
- Google Maps scraping (live, changes frequently)
- Corpus files (verified shops, district profiles, pricing reference)
- Merged/enriched data (combines both sources)

**Access Patterns:**
- Frequent reads (GPT queries)
- Periodic updates (Google Maps scraping)
- Need for fast lookups by district, shop name, rating

**Data Characteristics:**
- Shop listings: ~50-200 shops
- Reviews data: Can be large (thousands of reviews)
- District profiles: ~10 districts (small, static)
- Pricing reference: ~20-30 entries (small, semi-static)

---

## Option A: Redis (Fast Ephemeral) ✅ RECOMMENDED FOR PRODUCTION

### Architecture

```
Google Maps → Precog → Croutons Merge → Redis Cache → GPT Queries
                ↓
         Corpus Files (loaded once, cached in Redis)
```

### Implementation

```javascript
// Redis cache structure
const CACHE_KEYS = {
  shops: 'bkk_massage:shops',
  shops_by_district: 'bkk_massage:shops:district:{district}',
  shops_by_rating: 'bkk_massage:shops:rating:sorted',
  district_profiles: 'bkk_massage:districts',
  pricing_reference: 'bkk_massage:pricing',
  last_updated: 'bkk_massage:last_updated',
};

// Cache operations
async function cacheShopData(shops) {
  await redis.set(CACHE_KEYS.shops, JSON.stringify(shops), 'EX', 3600); // 1 hour TTL
  
  // Index by district
  const byDistrict = groupBy(shops, 'district');
  for (const [district, districtShops] of Object.entries(byDistrict)) {
    await redis.set(
      CACHE_KEYS.shops_by_district.replace('{district}', district),
      JSON.stringify(districtShops),
      'EX', 3600
    );
  }
  
  // Sorted by rating
  const sorted = shops.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  await redis.set(CACHE_KEYS.shops_by_rating, JSON.stringify(sorted), 'EX', 3600);
}

async function getCachedShops(district = null) {
  const key = district 
    ? CACHE_KEYS.shops_by_district.replace('{district}', district)
    : CACHE_KEYS.shops;
  
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  return null;
}
```

### Pros

- ✅ **Fast**: Sub-millisecond lookups
- ✅ **Scalable**: Handles high concurrent requests
- ✅ **Centralized**: Single source of truth across all workers
- ✅ **TTL support**: Automatic expiration (1 hour for live data)
- ✅ **Indexing**: Easy to create multiple indexes (by district, rating, etc.)
- ✅ **Atomic operations**: Safe for concurrent updates
- ✅ **Memory efficient**: Only stores what's needed
- ✅ **Production ready**: Battle-tested for high-traffic systems

### Cons

- ⚠️ **Ephemeral**: Data lost on restart (but can rebuild from corpus + fresh scrape)
- ⚠️ **Requires Redis**: Additional infrastructure dependency
- ⚠️ **Memory cost**: Need sufficient Redis memory
- ⚠️ **Network latency**: If Redis is remote (but usually <1ms in same datacenter)

### When to Use

- ✅ Production environments
- ✅ High traffic (many GPT queries)
- ✅ Multiple workers/nodes
- ✅ Need sub-second response times
- ✅ Can tolerate cache rebuild on restart

---

## Option B: Local JSON/SQLite Hybrid (Persistent on Edge)

### Architecture

```
Google Maps → Precog → Croutons Merge → Local SQLite + JSON → GPT Queries
                ↓
         Corpus Files (stored in SQLite, JSON for quick lookups)
```

### Implementation

```javascript
// SQLite schema
const SCHEMA = `
CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  name TEXT,
  address TEXT,
  district TEXT,
  rating REAL,
  review_count INTEGER,
  prettiest_women TEXT, -- JSON array
  pricing TEXT, -- JSON array
  line_usernames TEXT, -- JSON array
  websites TEXT, -- JSON array
  verified BOOLEAN,
  safety_signals TEXT, -- JSON array
  data_sources TEXT, -- JSON array
  last_updated TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_district ON shops(district);
CREATE INDEX idx_rating ON shops(rating DESC);
CREATE INDEX idx_verified ON shops(verified);

CREATE TABLE IF NOT EXISTS districts (
  name TEXT PRIMARY KEY,
  profile TEXT, -- JSON object
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
`;

// Hybrid approach: SQLite for queries, JSON for fast lookups
async function cacheShopData(shops) {
  const db = await getSQLiteDB();
  
  // Store in SQLite
  await db.exec('BEGIN TRANSACTION');
  for (const shop of shops) {
    await db.run(`
      INSERT OR REPLACE INTO shops VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      shop.id || generateId(shop.name),
      shop.name,
      shop.address,
      shop.district,
      shop.rating,
      shop.review_count,
      JSON.stringify(shop.prettiest_women || []),
      JSON.stringify(shop.pricing || []),
      JSON.stringify(shop.line_usernames || []),
      JSON.stringify(shop.websites || []),
      shop.verified || false,
      JSON.stringify(shop.safety_signals || []),
      JSON.stringify(shop.data_sources || []),
      new Date().toISOString(),
      new Date().toISOString(),
    ]);
  }
  await db.exec('COMMIT');
  
  // Also write JSON for quick lookups
  await writeJSONCache('shops.json', shops);
  await writeJSONCache('shops_by_district.json', groupBy(shops, 'district'));
}

async function getCachedShops(district = null) {
  // Try JSON first (fastest)
  try {
    const json = await readJSONCache(district 
      ? `shops_by_district_${district}.json`
      : 'shops.json'
    );
    if (json && isRecent(json.metadata.timestamp)) {
      return json.data;
    }
  } catch (e) {
    // Fall back to SQLite
  }
  
  // Query SQLite
  const db = await getSQLiteDB();
  const query = district
    ? 'SELECT * FROM shops WHERE district = ? ORDER BY rating DESC'
    : 'SELECT * FROM shops ORDER BY rating DESC';
  
  const rows = await db.all(query, district ? [district] : []);
  return rows.map(row => ({
    ...row,
    prettiest_women: JSON.parse(row.prettiest_women),
    pricing: JSON.parse(row.pricing),
    line_usernames: JSON.parse(row.line_usernames),
    websites: JSON.parse(row.websites),
    safety_signals: JSON.parse(row.safety_signals),
    data_sources: JSON.parse(row.data_sources),
  }));
}
```

### Pros

- ✅ **Persistent**: Survives restarts, no data loss
- ✅ **No external dependency**: Self-contained
- ✅ **Good for edge nodes**: Works offline, no network calls
- ✅ **SQL queries**: Flexible querying with SQL
- ✅ **Hybrid performance**: JSON for hot paths, SQLite for complex queries
- ✅ **Low cost**: No Redis infrastructure needed
- ✅ **Portable**: Easy to backup/restore (just copy files)

### Cons

- ⚠️ **Slower than Redis**: File I/O, SQL parsing overhead
- ⚠️ **Not shared**: Each node has its own cache (can get out of sync)
- ⚠️ **Disk I/O**: Slower than memory (but still fast with SSD)
- ⚠️ **More complex**: Need to manage both SQLite and JSON
- ⚠️ **Concurrency**: SQLite has write limitations (fine for reads)
- ⚠️ **Scaling**: Doesn't scale horizontally as well

### When to Use

- ✅ Edge deployments (CDN, edge functions)
- ✅ Low traffic scenarios
- ✅ Single-node deployments
- ✅ Need persistence without rebuild
- ✅ Offline capability required
- ✅ Cost-sensitive environments

---

## Hybrid Approach: Best of Both Worlds ⭐ RECOMMENDED

### Architecture

```
Google Maps → Precog → Croutons Merge → Redis (primary) + SQLite (backup) → GPT
                ↓
         Corpus Files → SQLite (persistent) + Redis (hot cache)
```

### Implementation

```javascript
// Multi-tier caching
class ShopCache {
  constructor() {
    this.redis = getRedisClient();
    this.sqlite = getSQLiteDB();
    this.cacheLayers = ['redis', 'sqlite', 'corpus'];
  }
  
  async getShops(district = null) {
    // Layer 1: Redis (fastest)
    let shops = await this.redis.get(`bkk_massage:shops:${district || 'all'}`);
    if (shops) {
      return JSON.parse(shops);
    }
    
    // Layer 2: SQLite (persistent)
    shops = await this.sqlite.getShops(district);
    if (shops && isRecent(shops.last_updated)) {
      // Warm Redis cache
      await this.redis.set(`bkk_massage:shops:${district || 'all'}`, JSON.stringify(shops), 'EX', 3600);
      return shops;
    }
    
    // Layer 3: Corpus files (fallback)
    shops = await this.loadFromCorpus(district);
    if (shops) {
      // Warm both caches
      await this.warmCache(shops);
      return shops;
    }
    
    // Layer 4: Fresh scrape (last resort)
    return await this.scrapeFresh(district);
  }
  
  async warmCache(shops) {
    // Warm Redis
    await this.redis.set('bkk_massage:shops:all', JSON.stringify(shops), 'EX', 3600);
    
    // Persist to SQLite
    await this.sqlite.saveShops(shops);
  }
}
```

### Benefits

- ✅ **Fast**: Redis for hot data (sub-ms)
- ✅ **Persistent**: SQLite survives restarts
- ✅ **Resilient**: Multiple fallback layers
- ✅ **Flexible**: Can use either based on deployment
- ✅ **Best performance**: Redis when available, SQLite when not

---

## Recommendation by Scenario

### Production (High Traffic, Multiple Nodes)
**✅ Redis Primary + SQLite Backup**

- Redis for all reads (fast, shared)
- SQLite for persistence (survives restarts)
- Corpus files as ultimate fallback

### Edge Deployment (CDN, Edge Functions)
**✅ SQLite + JSON Hybrid**

- No Redis dependency
- Persistent on edge
- Fast JSON lookups
- SQLite for complex queries

### Development/Testing
**✅ SQLite Only**

- Simple, no infrastructure
- Easy to inspect/debug
- Good enough for dev

### Hybrid Production
**✅ Redis + SQLite (Recommended)**

- Best of both worlds
- Fast reads from Redis
- Persistent backup in SQLite
- Automatic fallback chain

---

## Implementation Recommendation

### For Bangkok Massage Intelligence

**Primary: Redis** (if available)
- Fast lookups for GPT queries
- Shared across all workers
- TTL-based expiration (1 hour for live data)
- Indexed by district, rating

**Backup: SQLite** (always)
- Persistent storage
- Survives Redis restarts
- Backup/restore capability
- Historical data tracking

**Fallback: Corpus Files**
- Ultimate source of truth
- Loaded if both caches miss
- Used to rebuild caches

### Code Structure

```javascript
// Cache service
export class BangkokMassageCache {
  async getShops(district) {
    // Try Redis first
    if (this.redis) {
      const cached = await this.redis.get(`bkk:shops:${district}`);
      if (cached) return JSON.parse(cached);
    }
    
    // Try SQLite
    const sqlite = await this.sqlite.getShops(district);
    if (sqlite && isRecent(sqlite.updated)) {
      // Warm Redis
      if (this.redis) {
        await this.redis.set(`bkk:shops:${district}`, JSON.stringify(sqlite), 'EX', 3600);
      }
      return sqlite;
    }
    
    // Fallback to corpus
    return await this.loadFromCorpus(district);
  }
  
  async updateShops(shops) {
    // Update both
    if (this.redis) {
      await this.redis.set('bkk:shops:all', JSON.stringify(shops), 'EX', 3600);
    }
    await this.sqlite.saveShops(shops);
  }
}
```

---

## Decision Matrix

| Factor | Redis | SQLite+JSON | Hybrid |
|--------|-------|-------------|--------|
| **Speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Persistence** | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Scalability** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Complexity** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Cost** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Edge Ready** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## Final Recommendation

**For Production: Redis + SQLite Hybrid** ⭐

- **Redis**: Primary cache for fast reads
- **SQLite**: Persistent backup, survives restarts
- **Corpus**: Ultimate fallback, source of truth

**For Edge: SQLite + JSON Hybrid**

- **SQLite**: Persistent storage
- **JSON**: Fast lookups for hot data
- **Corpus**: Embedded fallback

This gives you:
- Fast performance (Redis when available)
- Data persistence (SQLite always)
- Resilience (multiple fallback layers)
- Flexibility (works in any deployment)

---

## Next Steps

1. **Implement cache service** with multi-layer support
2. **Add Redis integration** (if available)
3. **Add SQLite persistence** (always)
4. **Implement fallback chain** (Redis → SQLite → Corpus)
5. **Add cache warming** on startup
6. **Monitor cache hit rates** for optimization

---

**Decision:** Hybrid approach (Redis + SQLite) for production, SQLite+JSON for edge ✅

