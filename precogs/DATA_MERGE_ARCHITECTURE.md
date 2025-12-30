# Data Merge Architecture Decision - Bangkok Massage Intelligence

**Question:** Should Croutons merge live Precog data (Google Maps) with local corpus data, or return both side-by-side for GPT to merge?

**Date:** 2025-01-05

---

## Options Analysis

### Option A: Merge in Croutons Layer ✅ RECOMMENDED

**Architecture:**
```
Google Maps (Live) → Precog → Croutons → Merge with Corpus → Normalized Output → GPT
```

**How it works:**
1. Precog fetches live Google Maps data
2. Precog sends to Croutons for ingestion
3. Croutons merges with existing corpus files:
   - `shops_verified.ndjson` (verified shops)
   - `district_profiles.json` (district metadata)
   - `pricing_reference.json` (pricing norms)
4. Croutons normalizes and deduplicates
5. Returns unified, enriched dataset to Precog
6. Precog returns structured result to GPT

**Pros:**
- ✅ Single source of truth
- ✅ Cleaner API - GPT gets one unified dataset
- ✅ Data quality handled at knowledge layer (where it belongs)
- ✅ Deduplication and conflict resolution in one place
- ✅ Easier to maintain and debug
- ✅ Follows Croutons architecture (knowledge substrate)
- ✅ Can enrich live data with verified corpus data
- ✅ Can flag discrepancies between live and verified data

**Cons:**
- ⚠️ More complex merging logic in Croutons
- ⚠️ Need conflict resolution strategy
- ⚠️ Slightly more processing time

**Implementation:**
```javascript
// In Croutons ingestion layer
async function mergeShopData(liveShop, corpusShops) {
  // Find matching shop in corpus
  const corpusMatch = findMatchingShop(liveShop, corpusShops);
  
  // Merge data with priority rules
  return {
    // Live data takes precedence for: rating, review_count, recent reviews
    rating: liveShop.rating || corpusMatch?.rating,
    review_count: liveShop.review_count || corpusMatch?.review_count,
    
    // Corpus data takes precedence for: verified status, safety signals
    verified: corpusMatch?.verified || false,
    safety_signals: corpusMatch?.safety_signals || [],
    
    // Combine both sources
    prettiest_women: [
      ...(liveShop.prettiest_women_mentions || []),
      ...(corpusMatch?.prettiest_women || [])
    ],
    pricing: [
      ...(liveShop.pricing || []),
      ...(corpusMatch?.pricing || [])
    ],
    
    // Metadata
    data_sources: ['google_maps', corpusMatch ? 'corpus' : null].filter(Boolean),
    last_updated: new Date().toISOString(),
  };
}
```

---

### Option B: Return Both Side-by-Side

**Architecture:**
```
Google Maps (Live) → Precog → Return Both → GPT Merges → User Response
Corpus Files → Precog → Return Both → GPT Merges → User Response
```

**How it works:**
1. Precog fetches both Google Maps data and corpus data
2. Precog returns both datasets separately
3. GPT receives:
   ```json
   {
     "live_data": { shops: [...], source: "google_maps" },
     "corpus_data": { shops: [...], source: "corpus" }
   }
   ```
4. GPT merges and deduplicates
5. GPT formats response

**Pros:**
- ✅ Transparent data sources
- ✅ GPT can make decisions about conflicts
- ✅ Easier to debug (see both sources)
- ✅ Less processing in Croutons

**Cons:**
- ❌ GPT has to do data merging (not its job)
- ❌ Inconsistent results depending on GPT's merging logic
- ❌ More complex GPT prompts
- ❌ Potential for errors in GPT merging
- ❌ Violates separation of concerns (knowledge vs. formatting)
- ❌ Harder to maintain consistent quality

---

## Recommendation: Option A (Merge in Croutons)

### Rationale

1. **Follows Croutons Architecture**
   - Croutons = Knowledge substrate (truth layer)
   - Should handle data normalization and merging
   - Precogs = Intelligence layer (oracle layer)
   - GPT = Interface layer (formatting)

2. **Data Quality**
   - Merging logic is deterministic and testable
   - Can implement conflict resolution rules
   - Can flag data quality issues
   - Easier to maintain consistency

3. **Separation of Concerns**
   - Knowledge layer handles knowledge
   - GPT handles conversation and formatting
   - Each layer does what it's best at

4. **Maintainability**
   - One place to update merging logic
   - Easier to debug data issues
   - Can version merging strategies

---

## Implementation Plan

### Step 1: Update Precog Handler

```javascript
// In bkkMassagePrecog.js
async function fetchGoogleMapsData(emit) {
  // Fetch live data
  const liveShops = await scrapeGoogleMaps(GOOGLE_MAPS_URL);
  
  // Send to Croutons for merging
  const mergedShops = await croutons.mergeShopData(liveShops, {
    corpus_path: '/corpora/thailand/bangkok/massage/',
    merge_strategy: 'enrich_with_corpus'
  });
  
  return mergedShops;
}
```

### Step 2: Create Croutons Merge Service

```javascript
// In Croutons layer
export async function mergeShopData(liveShops, options) {
  const { corpus_path, merge_strategy } = options;
  
  // Load corpus files
  const corpusShops = loadCorpusFile(`${corpus_path}/shops_verified.ndjson`);
  const districtProfiles = loadCorpusFile(`${corpus_path}/district_profiles.json`);
  const pricingReference = loadCorpusFile(`${corpus_path}/pricing_reference.json`);
  
  // Merge each live shop with corpus data
  return liveShops.map(liveShop => {
    // Find matching shop in corpus
    const corpusMatch = findMatchingShop(liveShop, corpusShops);
    
    // Get district profile
    const district = extractDistrict(liveShop.address);
    const districtProfile = districtProfiles.find(d => d.name === district);
    
    // Get pricing reference
    const pricingRef = pricingReference.find(p => p.district === district);
    
    // Merge with strategy
    return mergeWithStrategy(liveShop, corpusMatch, districtProfile, pricingRef, merge_strategy);
  });
}
```

### Step 3: Merge Strategy

```javascript
function mergeWithStrategy(live, corpus, district, pricing, strategy) {
  switch (strategy) {
    case 'enrich_with_corpus':
      // Live data is primary, enrich with corpus
      return {
        // Live data (primary)
        name: live.name,
        address: live.address,
        rating: live.rating,
        review_count: live.review_count,
        prettiest_women: live.prettiest_women_mentions || [],
        pricing: live.pricing || [],
        line_usernames: live.line_usernames || [],
        websites: live.websites || [],
        
        // Corpus enrichment (adds verified data)
        verified: corpus?.verified || false,
        safety_signals: corpus?.safety_signals || [],
        last_verified: corpus?.last_verified,
        
        // District context
        district_info: district,
        pricing_reference: pricing,
        
        // Metadata
        data_sources: ['google_maps', corpus ? 'corpus' : null].filter(Boolean),
        confidence: calculateConfidence(live, corpus),
      };
      
    case 'corpus_priority':
      // Corpus is primary, live data fills gaps
      return {
        ...corpus,
        // Fill missing fields from live data
        rating: corpus.rating || live.rating,
        review_count: corpus.review_count || live.review_count,
        prettiest_women: [...(corpus.prettiest_women || []), ...(live.prettiest_women_mentions || [])],
      };
      
    default:
      return live;
  }
}
```

### Step 4: Conflict Resolution

```javascript
function resolveConflicts(live, corpus) {
  const conflicts = [];
  
  // Check for rating discrepancies
  if (live.rating && corpus.rating && Math.abs(live.rating - corpus.rating) > 1.0) {
    conflicts.push({
      field: 'rating',
      live: live.rating,
      corpus: corpus.rating,
      resolution: 'use_live', // Live data is more recent
    });
  }
  
  // Check for name variations
  if (live.name !== corpus.name && isSimilarName(live.name, corpus.name)) {
    conflicts.push({
      field: 'name',
      live: live.name,
      corpus: corpus.name,
      resolution: 'use_corpus', // Corpus is verified
    });
  }
  
  return conflicts;
}
```

---

## Data Flow Diagram

```
┌─────────────────┐
│  Google Maps    │
│  (Live Data)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Precog Worker  │
│  (Scrapes)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Croutons       │◄─────┤  Corpus Files     │
│  Merge Service  │      │  (Verified Data)  │
└────────┬────────┘      └──────────────────┘
         │
         │ (Merged & Normalized)
         ▼
┌─────────────────┐
│  Precog Result  │
│  (Structured)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GPT Agent      │
│  (Formats)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User Response  │
└─────────────────┘
```

---

## Benefits of Merging in Croutons

1. **Data Enrichment**
   - Live Google Maps data: ratings, reviews, recent mentions
   - Corpus data: verified status, safety signals, historical data
   - Combined: Best of both worlds

2. **Quality Assurance**
   - Can flag shops that appear in live data but not corpus (new/unverified)
   - Can flag discrepancies between sources
   - Can maintain data lineage

3. **Consistency**
   - All GPT agents get same merged data
   - No variation in merging logic
   - Easier to test and validate

4. **Performance**
   - Merging happens once in Croutons
   - GPT doesn't need to process two datasets
   - Faster response times

---

## Recommendation Summary

**✅ Merge in Croutons Layer**

- Croutons handles knowledge normalization (its job)
- Precogs handles intelligence (its job)
- GPT handles conversation (its job)
- Clean separation of concerns
- Better data quality
- Easier to maintain

**Implementation:**
1. Create Croutons merge service
2. Update Precog to call merge service
3. Return unified dataset to GPT
4. GPT just formats the response

---

## Next Steps

1. **Create merge service** in Croutons layer
2. **Define merge strategy** (enrich_with_corpus recommended)
3. **Implement conflict resolution** rules
4. **Update Precog handler** to use merge service
5. **Test with sample data** to verify merging logic
6. **Document merge rules** for future reference

---

**Decision:** Merge in Croutons ✅

