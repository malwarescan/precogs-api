# Google Maps Scraping Implementation Notes

## Current Implementation

The `bkkMassagePrecog.js` now fetches data from:
```
https://www.google.com/maps/search/erotic+massage+bangkok/@13.7455615,100.4277491,11.02z/data=!4m2!2m1!6e1?entry=ttu&g_ep=EgoyMDI1MTExMi4wIKXMDSoASAFQAw%3D%3D
```

## Data Extraction Requirements

From reviews, we need to extract:
1. **Prettiest women** - Mentions of "pretty", "beautiful", "attractive" in reviews
2. **Pricing** - Price mentions in reviews (THB amounts)
3. **Line usernames** - Line ID patterns from reviews
4. **Websites** - Website URLs mentioned in reviews or shop listings
5. **Overall rating** - Google Maps star rating

## Implementation Challenges

### 1. Google Maps Anti-Scraping
- Google Maps uses JavaScript rendering
- Requires browser automation (Puppeteer/Playwright)
- May need proxy rotation
- Rate limiting considerations

### 2. Review Data Extraction
- Reviews are loaded dynamically
- Need to scroll to load more reviews
- Review text parsing for specific mentions
- Pattern matching for:
  - Price patterns: "500 THB", "฿500", "$15"
  - Line ID patterns: "@lineid", "Line: username"
  - Website patterns: URLs in reviews

### 3. Recommended Approach

**Option A: Browser Automation (Recommended)**
```javascript
import puppeteer from 'puppeteer';

async function fetchWithBrowser(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  
  // Wait for content to load
  await page.waitForSelector('[data-value]');
  
  // Extract shop data
  const shops = await page.evaluate(() => {
    // Extract from DOM
  });
  
  // For each shop, navigate to detail page
  // Extract reviews
  // Parse review text for required data
  
  await browser.close();
  return shops;
}
```

**Option B: Google Maps API (If Available)**
- Use official API if access available
- More reliable but may have limitations

**Option C: Third-Party Scraping Service**
- Use services like ScraperAPI, Bright Data
- Handles anti-bot measures

## Review Parsing Patterns

### Prettiest Women
```javascript
const prettiestPatterns = [
  /(?:pretty|beautiful|attractive|gorgeous|stunning)\s+(?:girl|woman|lady|staff|therapist)/gi,
  /(?:best|prettiest|most beautiful)\s+(?:girl|woman|staff)/gi,
];
```

### Pricing
```javascript
const pricingPatterns = [
  /(\d+)\s*(?:THB|baht|฿)/gi,
  /\$\s*(\d+)/gi,
  /(\d+)\s*(?:per|for)\s*(?:hour|session|massage)/gi,
];
```

### Line Usernames
```javascript
const linePatterns = [
  /line[:\s]*@?([a-zA-Z0-9_]+)/gi,
  /line\s+id[:\s]*([a-zA-Z0-9_]+)/gi,
  /@([a-zA-Z0-9_]+)\s*(?:line|LINE)/gi,
];
```

### Websites
```javascript
const websitePatterns = [
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/gi,
];
```

## Next Steps

1. **Install Dependencies**
   ```bash
   npm install puppeteer
   # or
   npm install playwright
   ```

2. **Implement Browser Automation**
   - Navigate to Google Maps search
   - Extract shop listings
   - For each shop, navigate to detail page
   - Scroll through reviews
   - Extract and parse review text

3. **Add Review Parsing**
   - Implement pattern matching
   - Extract required data points
   - Store in structured format

4. **Handle Rate Limiting**
   - Add delays between requests
   - Implement retry logic
   - Consider proxy rotation

5. **Cache Results**
   - Cache shop data to avoid repeated scraping
   - Update cache periodically
   - Store in database or file system

## Legal Considerations

- Review Google Maps Terms of Service
- Consider rate limiting and respectful scraping
- May need to use official API if available
- Consider data privacy implications

## Testing

Test with:
- Single shop extraction
- Review parsing accuracy
- Pattern matching correctness
- Error handling for failed requests

